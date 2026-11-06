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
import type { CreateLearningSessionDto } from './dto/learning-session.dto';

export const DEFAULT_PAGE_SIZE = 20;

export interface LearningSessionPage {
  items: LearningSession[];
  total: number;
}

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

  async remove(userId: number, id: number): Promise<void> {
    const res = await this.sessions.delete({ id, user_id: userId });
    if (!res.affected)
      throw new NotFoundException('Learning session not found');
  }
}
