import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  LearningSession,
  SessionKind,
} from './entities/learning-session.entity';
import { LearningSessionWord } from './entities/learning-session-word.entity';
import { FlashcardDeck } from '../flashcard-decks/entities/flashcard-deck.entity';
import { VocabSet } from '../vocab-sets/entities/vocab-set.entity';
import type {
  CreateLearningSessionDto,
  VocabularyStatus,
} from './dto/learning-session.dto';

export const DEFAULT_PAGE_SIZE = 20;

export interface LearningSessionPage {
  items: LearningSession[];
  total: number;
}

export interface VocabularyEntry {
  term: string;
  meaning: string;
  example: string | null;
  /** How many times the word came up, and how it went each time. */
  seen: number;
  correct: number;
  missed: number;
  last_seen_at: Date;
  /** weak: missed more often than known; learned: known at least once; unrated: never rated. */
  status: 'weak' | 'learned' | 'unrated';
}

export interface VocabularyPage {
  items: VocabularyEntry[];
  /** Matches of the current filter / search. */
  total: number;
  /** Size of the whole list, whatever the filter. */
  summary: { total: number; learned: number; weak: number };
}

/** Escape LIKE wildcards so a search for "50%" or "a_b" matches literally. */
export const likePattern = (text: string) =>
  `%${text.replace(/[\\%_]/g, '\\$&')}%`;

export interface LearningSessionDetail extends LearningSession {
  words: LearningSessionWord[];
}

/** Correct answers as a 0–100 percentage of the words that were actually rated. */
export function accuracyOf(words: { is_correct?: boolean | null }[]): number {
  const rated = words.filter((w) => typeof w.is_correct === 'boolean');
  if (!rated.length) return 0;
  const correct = rated.filter((w) => w.is_correct === true).length;
  return Math.round((correct / rated.length) * 100);
}

@Injectable()
export class LearningSessionsService {
  constructor(
    @InjectRepository(LearningSession)
    private readonly sessions: Repository<LearningSession>,
    @InjectRepository(LearningSessionWord)
    private readonly words: Repository<LearningSessionWord>,
  ) {}

  /** Store a finished session together with every word that was practised. */
  async create(
    userId: number,
    dto: CreateLearningSessionDto,
  ): Promise<LearningSessionDetail> {
    return this.sessions.manager.transaction(async (m) => {
      // A deck / set that has been deleted since (or never existed) must not break saving the history.
      const deckId =
        dto.deck_id &&
        (await m.exists(FlashcardDeck, { where: { id: dto.deck_id } }))
          ? dto.deck_id
          : null;
      const vocabSetId =
        dto.vocab_set_id &&
        (await m.exists(VocabSet, { where: { id: dto.vocab_set_id } }))
          ? dto.vocab_set_id
          : null;

      const session = await m.save(
        m.create(LearningSession, {
          user_id: userId,
          kind: dto.kind,
          mode_id: dto.mode_id,
          mode_name: dto.mode_name,
          source: dto.source,
          title: dto.title,
          deck_id: deckId,
          vocab_set_id: vocabSetId,
          learning_lang: dto.learning_lang ?? 'en',
          meaning_lang: dto.meaning_lang ?? 'en',
          total_items: dto.words.length,
          correct_items: dto.words.filter((w) => w.is_correct === true).length,
          accuracy: accuracyOf(dto.words),
          score: dto.score ?? 0,
          xp_earned: dto.xp_earned ?? 0,
          duration_seconds: dto.duration_seconds ?? 0,
        }),
      );
      const words = await m.save(
        dto.words.map((w, i) =>
          m.create(LearningSessionWord, {
            session_id: session.id,
            position: i + 1,
            term: w.term,
            meaning: w.meaning,
            example: w.example ?? null,
            is_correct: w.is_correct ?? null,
          }),
        ),
      );
      return { ...session, words };
    });
  }

  /** The user's own history, newest first. */
  async list(
    userId: number,
    opts: { kind?: SessionKind; limit?: number; offset?: number } = {},
  ): Promise<LearningSessionPage> {
    const qb = this.sessions
      .createQueryBuilder('s')
      .where('s.user_id = :userId', { userId })
      .orderBy('s.created_at', 'DESC')
      .addOrderBy('s.id', 'DESC')
      .take(opts.limit ?? DEFAULT_PAGE_SIZE)
      .skip(opts.offset ?? 0);
    if (opts.kind) qb.andWhere('s.kind = :kind', { kind: opts.kind });
    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /** One of the user's sessions with its words in the order they appeared. */
  async findOne(userId: number, id: number): Promise<LearningSessionDetail> {
    const session = await this.sessions.findOne({
      where: { id, user_id: userId },
    });
    if (!session) throw new NotFoundException('Learning session not found');
    const words = await this.words.find({
      where: { session_id: id },
      order: { position: 'ASC' },
    });
    return { ...session, words };
  }

  /**
   * Every word the student has practised (flashcards and games, Battle questions excluded), one row
   * per word however many times it came up, with how often they knew it. Newest first.
   */
  async vocabulary(
    userId: number,
    opts: {
      status?: VocabularyStatus;
      search?: string;
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<VocabularyPage> {
    const grouped = `
      SELECT lower(w.term) AS key,
             (array_agg(w.term ORDER BY s.created_at DESC, w.id DESC))[1] AS term,
             (array_agg(w.meaning ORDER BY (w.meaning <> '') DESC, s.created_at DESC, w.id DESC))[1] AS meaning,
             (array_agg(w.example ORDER BY (w.example IS NOT NULL AND w.example <> '') DESC, s.created_at DESC, w.id DESC))[1] AS example,
             COUNT(*)::int AS seen,
             COUNT(*) FILTER (WHERE w.is_correct = true)::int AS correct,
             COUNT(*) FILTER (WHERE w.is_correct = false)::int AS missed,
             MAX(s.created_at) AS last_seen_at
        FROM learning_session_words w
        JOIN learning_sessions s ON s.id = w.session_id
       WHERE s.user_id = $1 AND s.mode_id <> 'battle'
         AND ($2::text IS NULL OR w.term ILIKE $2 OR w.meaning ILIKE $2)
       GROUP BY lower(w.term)`;
    const withStatus = `
      SELECT g.*, CASE WHEN g.missed > g.correct THEN 'weak'
                       WHEN g.correct > 0 THEN 'learned'
                       ELSE 'unrated' END AS status
        FROM (${grouped}) g`;
    const search = opts.search?.trim() ? likePattern(opts.search.trim()) : null;
    const status = opts.status ?? null;

    const rows = await this.sessions.query<
      (VocabularyEntry & { key: string })[]
    >(
      `SELECT key, term, meaning, example, seen, correct, missed, last_seen_at, status
         FROM (${withStatus}) v
        WHERE ($3::text IS NULL OR v.status = $3)
        ORDER BY v.last_seen_at DESC, v.term
        LIMIT $4 OFFSET $5`,
      [
        userId,
        search,
        status,
        opts.limit ?? DEFAULT_PAGE_SIZE,
        opts.offset ?? 0,
      ],
    );
    const [counts] = await this.sessions.query<
      { matches: number; total: number; learned: number; weak: number }[]
    >(
      `SELECT COUNT(*) FILTER (WHERE $3::text IS NULL OR v.status = $3)::int AS matches,
              COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE v.status = 'learned')::int AS learned,
              COUNT(*) FILTER (WHERE v.status = 'weak')::int AS weak
         FROM (${withStatus}) v`,
      [userId, search, status],
    );
    return {
      items: rows.map(({ key: _key, ...rest }) => rest),
      total: counts?.matches ?? 0,
      summary: {
        total: counts?.total ?? 0,
        learned: counts?.learned ?? 0,
        weak: counts?.weak ?? 0,
      },
    };
  }

  async remove(userId: number, id: number): Promise<void> {
    const res = await this.sessions.delete({ id, user_id: userId });
    if (!res.affected)
      throw new NotFoundException('Learning session not found');
  }
}
