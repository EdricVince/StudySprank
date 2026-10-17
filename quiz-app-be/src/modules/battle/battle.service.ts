import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_MODEL, getAnthropicClient } from '../../core/ai/anthropic';
import * as crypto from 'crypto';
import { verifyHs256 } from '../../core/security/jwt.util';

/** A generated battle question. `correct` (index) is kept server-side only. */
export interface BattleQuestion {
  question: string;
  options: string[];
  correct: number;
}

export interface QueuedPlayer {
  socketId: string;
  userId: number;
  name: string;
  avatar: string;
  difficulty: string;
}

export interface RoomPlayer {
  socketId: string;
  userId: number;
  name: string;
  avatar: string;
  score: number;
  streak: number;
  correctCount: number;
  answered: Set<number>;
  finished: boolean;
  /** Server clock (ms) when this player's current question appeared on their screen. */
  questionSentAt: number;
}

export interface BattleRoom {
  id: string;
  difficulty: string;
  questions: BattleQuestion[];
  players: RoomPlayer[];
  startedAt: number;
}

const AVATARS = [
  '🦊',
  '🐼',
  '🦁',
  '🐯',
  '🦄',
  '🐸',
  '🦉',
  '🐙',
  '🐝',
  '🦖',
  '🐺',
  '🦅',
];
export const QUESTIONS_PER_BATTLE = 8;
// Timing mirrors the client (BattleMode.vue): a 3 s countdown before Q1, 10 s per
// question, and a 1.2 s answer reveal before the next question appears.
export const QUESTION_TIME_S = 10;
export const COUNTDOWN_MS = 3000;
export const REVEAL_MS = 1200;

/** Seconds left on the question, measured by the server clock and clamped to [0, QUESTION_TIME_S]. */
export function serverTimeLeft(questionSentAt: number, now: number): number {
  const elapsed = Math.floor((now - questionSentAt) / 1000);
  return Math.min(QUESTION_TIME_S, Math.max(0, QUESTION_TIME_S - elapsed));
}

@Injectable()
export class BattleService {
  private readonly logger = new Logger(BattleService.name);
  /** difficulty -> players waiting for a match */
  private queues = new Map<string, QueuedPlayer[]>();
  /** roomId -> room */
  private rooms = new Map<string, BattleRoom>();
  /** socketId -> roomId */
  private socketRoom = new Map<string, string>();

  constructor(private config: ConfigService) {}

  // ── Auth (verify the app's hand-rolled HMAC JWT for the WS handshake) ──────────
  verifyToken(
    token?: string,
  ): { id: number; email: string; role_id: number } | null {
    const secret = this.config.get<string>('JWT_SECRET');
    if (!token || !secret) return null;
    const res = verifyHs256(token, secret); // constant-time signature check
    if (!res.ok) return null;
    return {
      id: res.payload.sub,
      email: res.payload.email,
      role_id: res.payload.role_id,
    };
  }

  randomAvatar(): string {
    return AVATARS[Math.floor(Math.random() * AVATARS.length)];
  }

  private get client() {
    return getAnthropicClient();
  }

  // ── Matchmaking ───────────────────────────────────────────────────────────────
  /** Add a player; if an opponent is already waiting (same difficulty), build a room. */
  async tryMatch(player: QueuedPlayer): Promise<BattleRoom | null> {
    const q = this.queues.get(player.difficulty) ?? [];
    // avoid matching a player with themselves (e.g. two tabs, same account)
    const oppIdx = q.findIndex(
      (w) => w.userId !== player.userId && w.socketId !== player.socketId,
    );
    if (oppIdx === -1) {
      if (!q.some((w) => w.socketId === player.socketId)) q.push(player);
      this.queues.set(player.difficulty, q);
      return null;
    }
    const opponent = q.splice(oppIdx, 1)[0];
    this.queues.set(player.difficulty, q);

    let questions: BattleQuestion[];
    try {
      questions = await this.generateQuestions(
        player.difficulty,
        QUESTIONS_PER_BATTLE,
      );
    } catch (e) {
      // AI generation failed — put the waiting opponent back in the queue, then surface the error
      const cur = this.queues.get(player.difficulty) ?? [];
      cur.unshift(opponent);
      this.queues.set(player.difficulty, cur);
      throw e;
    }
    const startedAt = Date.now();
    const room: BattleRoom = {
      id: crypto.randomUUID(),
      difficulty: player.difficulty,
      questions,
      players: [
        this.toRoomPlayer(opponent, startedAt),
        this.toRoomPlayer(player, startedAt),
      ],
      startedAt,
    };
    this.rooms.set(room.id, room);
    this.socketRoom.set(opponent.socketId, room.id);
    this.socketRoom.set(player.socketId, room.id);
    return room;
  }

  private toRoomPlayer(p: QueuedPlayer, startedAt: number): RoomPlayer {
    return {
      socketId: p.socketId,
      userId: p.userId,
      name: p.name,
      avatar: p.avatar,
      score: 0,
      streak: 0,
      correctCount: 0,
      answered: new Set(),
      finished: false,
      questionSentAt: startedAt + COUNTDOWN_MS, // Q1 appears after the countdown
    };
  }

  cancelQueue(socketId: string): void {
    for (const [diff, list] of this.queues) {
      const i = list.findIndex((w) => w.socketId === socketId);
      if (i !== -1) {
        list.splice(i, 1);
        this.queues.set(diff, list);
        return;
      }
    }
  }

  getRoomById(roomId: string): BattleRoom | undefined {
    return this.rooms.get(roomId);
  }

  /** Client-safe questions (correct answer stripped). */
  clientQuestions(room: BattleRoom): { question: string; options: string[] }[] {
    return room.questions.map((qq) => ({
      question: qq.question,
      options: qq.options,
    }));
  }

  // ── Answer (server-authoritative scoring) ─────────────────────────────────────
  /**
   * Score an answer. The time bonus uses the SERVER clock (`now` − when this
   * player's question appeared); any timeLeft the client sends is ignored.
   * Questions must be answered in order.
   */
  submitAnswer(
    socketId: string,
    qIndex: number,
    answerIndex: number,
    now: number = Date.now(),
  ) {
    const roomId = this.socketRoom.get(socketId);
    if (!roomId) return null;
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const me = room.players.find((p) => p.socketId === socketId);
    const opp = room.players.find((p) => p.socketId !== socketId);
    if (!me || !opp) return null;
    const qq = room.questions[qIndex];
    if (!qq || me.answered.has(qIndex) || qIndex !== me.answered.size)
      return null;

    const timeLeft = serverTimeLeft(me.questionSentAt, now);
    me.answered.add(qIndex);
    me.questionSentAt = now + REVEAL_MS; // the next question shows after the reveal
    const correct = answerIndex === qq.correct;
    let gained = 0;
    if (correct) {
      me.streak += 1;
      me.correctCount += 1;
      gained = 100 + timeLeft * 10 + me.streak * 10;
      me.score += gained;
    } else {
      me.streak = 0;
    }
    if (me.answered.size >= room.questions.length) me.finished = true;
    const bothFinished = room.players.every((p) => p.finished);
    return {
      room,
      me,
      opp,
      correct,
      correctIndex: qq.correct,
      gained,
      timeLeft,
      bothFinished,
    };
  }

  /** Called on disconnect/leave: remove from queue and, if in a room, report the opponent to notify. */
  handleLeave(
    socketId: string,
  ): { room: BattleRoom; opponentSocketId: string } | null {
    this.cancelQueue(socketId);
    const roomId = this.socketRoom.get(socketId);
    this.socketRoom.delete(socketId);
    if (!roomId) return null;
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const opp = room.players.find((p) => p.socketId !== socketId);
    return opp ? { room, opponentSocketId: opp.socketId } : null;
  }

  cleanupRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.players.forEach((p) => this.socketRoom.delete(p.socketId));
    this.rooms.delete(roomId);
  }

  // ── AI question generation (harder challenges) — AI only, no hardcoded bank ────
  async generateQuestions(
    difficulty: string,
    count: number,
  ): Promise<BattleQuestion[]> {
    const client = this.client;
    if (!client) {
      throw new ServiceUnavailableException(
        'AI is not configured. Add an Anthropic API key to play Battle Mode.',
      );
    }
    const level =
      difficulty === 'easy'
        ? 'A2–B1 (elementary to lower-intermediate)'
        : difficulty === 'hard'
          ? 'C1–C2 (advanced: idioms, phrasal verbs, nuanced grammar, tricky near-synonym distractors)'
          : 'B1–B2 (intermediate)';
    const prompt = `Generate ${count} competitive English multiple-choice questions for a fast 1-vs-1 quiz battle at ${level} level.
Mix vocabulary, grammar, idioms, phrasal verbs and word choice. Each question has EXACTLY 4 options and ONE correct answer, with plausible distractors. Keep each question under 90 characters.
Return ONLY a valid JSON array (no markdown, no prose):
[{"question":"...","options":["a","b","c","d"],"correct":0}]
"correct" is the 0-based index of the right option.`;
    try {
      const res = await client.messages.create({
        model: AI_MODEL,
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      });
      const text = (res.content[0] as { text: string }).text;
      const json = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1);
      const parsed = JSON.parse(json) as BattleQuestion[];
      const valid = parsed.filter(
        (qq) =>
          qq &&
          typeof qq.question === 'string' &&
          Array.isArray(qq.options) &&
          qq.options.length === 4 &&
          typeof qq.correct === 'number' &&
          qq.correct >= 0 &&
          qq.correct < 4,
      );
      if (valid.length >= Math.min(4, count)) return valid.slice(0, count);
      throw new Error(`AI returned too few valid questions (${valid.length})`);
    } catch (e) {
      this.logger.error(`Battle AI generation failed: ${(e as Error).message}`);
      throw new ServiceUnavailableException(
        'AI failed to generate battle questions. Please try again.',
      );
    }
  }
}
