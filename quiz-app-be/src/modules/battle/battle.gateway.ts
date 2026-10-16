import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { BattleService, QUESTIONS_PER_BATTLE } from './battle.service';
import type { BattleRoom } from './battle.service';
import { wsCorsOrigin } from '../../core/security/cors.setup';

// Force-finish a room after this long so a stalled/idle player can't hang the game.
const ROOM_MAX_MS = (QUESTIONS_PER_BATTLE + 2) * 15_000;

@WebSocketGateway({
  namespace: '/battle',
  cors: { origin: wsCorsOrigin, credentials: true }, // same CORS_ORIGINS allow-list as REST
})
export class BattleGateway implements OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private roomTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private battle: BattleService) {}

  /** Student clicks "Find Match" */
  @SubscribeMessage('battle:find')
  async onFind(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { difficulty?: string },
  ) {
    const user = this.battle.verifyToken(
      socket.handshake.auth?.token as string | undefined,
    );
    if (!user) {
      socket.emit('battle:error', {
        message: 'Unauthorized — please sign in again.',
      });
      return;
    }
    const difficulty = ['easy', 'medium', 'hard'].includes(
      body?.difficulty ?? '',
    )
      ? (body.difficulty as string)
      : 'medium';

    socket.emit('battle:searching', { difficulty });

    let room: BattleRoom | null;
    try {
      room = await this.battle.tryMatch({
        socketId: socket.id,
        userId: user.id,
        name: (user.email?.split('@')[0] || 'Player').slice(0, 20),
        avatar: this.battle.randomAvatar(),
        difficulty,
      });
    } catch (e) {
      socket.emit('battle:error', {
        message:
          (e as Error)?.message ||
          'Could not start the battle — AI is unavailable.',
      });
      return;
    }
    if (!room) return; // queued — wait for an opponent

    const clientQuestions = this.battle.clientQuestions(room);
    for (const p of room.players) {
      const opp = room.players.find((x) => x.socketId !== p.socketId)!;
      this.server.to(p.socketId).emit('battle:matched', {
        roomId: room.id,
        difficulty: room.difficulty,
        opponent: { name: opp.name, avatar: opp.avatar },
        questions: clientQuestions,
        total: clientQuestions.length,
      });
    }

    // safety timeout
    this.roomTimers.set(
      room.id,
      setTimeout(() => this.finish(room.id), ROOM_MAX_MS),
    );
  }

  /**
   * Student submits an answer (answerIndex = -1 means "time ran out / no answer").
   * A client-sent `timeLeft` is ignored — the server measures the time itself.
   */
  @SubscribeMessage('battle:answer')
  onAnswer(
    @ConnectedSocket() socket: Socket,
    @MessageBody() body: { questionIndex: number; answerIndex: number },
  ) {
    const r = this.battle.submitAnswer(
      socket.id,
      Number(body?.questionIndex),
      Number(body?.answerIndex),
    );
    if (!r) return;

    // to the player who answered
    this.server.to(r.me.socketId).emit('battle:answer_result', {
      questionIndex: body.questionIndex,
      correct: r.correct,
      correctIndex: r.correctIndex,
      gained: r.gained,
      timeLeft: r.timeLeft,
      yourScore: r.me.score,
      finished: r.me.finished,
    });
    // to the opponent (live score + "they answered")
    this.server.to(r.opp.socketId).emit('battle:opponent_answered', {
      questionIndex: body.questionIndex,
      correct: r.correct,
      opponentScore: r.me.score,
    });

    if (r.bothFinished) this.finish(r.room.id);
  }

  /** Cancel matchmaking while searching */
  @SubscribeMessage('battle:cancel')
  onCancel(@ConnectedSocket() socket: Socket) {
    this.battle.cancelQueue(socket.id);
    socket.emit('battle:cancelled', {});
  }

  handleDisconnect(socket: Socket) {
    const res = this.battle.handleLeave(socket.id);
    if (res) {
      // opponent forfeits → the remaining player wins by walkover
      this.server.to(res.opponentSocketId).emit('battle:opponent_left', {});
      this.clearTimer(res.room.id);
      this.battle.cleanupRoom(res.room.id);
    }
  }

  /** Emit final results to both players and tear down the room. */
  private finish(roomId: string) {
    const room = this.battle.getRoomById(roomId);
    if (!room) return;
    this.clearTimer(roomId);
    for (const p of room.players) {
      const opp = room.players.find((x) => x.socketId !== p.socketId)!;
      const result =
        p.score === opp.score ? 'draw' : p.score > opp.score ? 'win' : 'lose';
      this.server.to(p.socketId).emit('battle:finished', {
        result,
        you: {
          score: p.score,
          correctCount: p.correctCount,
          total: room.questions.length,
        },
        opponent: {
          name: opp.name,
          avatar: opp.avatar,
          score: opp.score,
          correctCount: opp.correctCount,
        },
      });
    }
    this.battle.cleanupRoom(roomId);
  }

  private clearTimer(roomId: string) {
    const t = this.roomTimers.get(roomId);
    if (t) {
      clearTimeout(t);
      this.roomTimers.delete(roomId);
    }
  }
}
