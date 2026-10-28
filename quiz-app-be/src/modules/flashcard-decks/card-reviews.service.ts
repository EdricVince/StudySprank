import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { FlashcardDeck, DeckCard } from './entities/flashcard-deck.entity';
import { CardReview } from './entities/card-review.entity';
import { applySm2, cardKeyOf } from './sm2';
import { canReadDeck } from './deck-access';
import { ClassEnrollment } from '../classes/entities/class-enrollment.entity';

export class ReviewCardDto {
  @IsString() @MinLength(1) @MaxLength(255) card_key: string;
  @IsInt() @Min(0) @Max(5) quality: number;
}

export type DueReason = 'new' | 'due';

export interface DueCard extends DeckCard {
  card_key: string;
  reason: DueReason;
  due_at: Date | null;
  interval_days: number;
  repetitions: number;
  last_quality: number | null;
  last_reviewed_at: Date | null;
}

export interface DueCardsResult {
  deck_id: number;
  total_cards: number;
  due_count: number;
  new_count: number;
  next_due_at: Date | null;
  cards: DueCard[];
}

@Injectable()
export class CardReviewsService {
  constructor(
    @InjectRepository(FlashcardDeck)
    private deckRepo: Repository<FlashcardDeck>,
    @InjectRepository(CardReview)
    private reviewRepo: Repository<CardReview>,
  ) {}

  private async readableDeck(
    deckId: number,
    userId: number,
  ): Promise<FlashcardDeck> {
    const deck = await this.deckRepo.findOne({ where: { id: deckId } });
    if (!deck) throw new NotFoundException('Flashcard deck not found');
    const isEnrolled = async (classId: number) =>
      !!(await this.deckRepo.manager.findOne(ClassEnrollment, {
        where: { class_id: classId, student_id: userId },
        select: ['id'],
      }));
    if (!(await canReadDeck(deck, userId, isEnrolled))) {
      throw new ForbiddenException('This deck is private');
    }
    return deck;
  }

  /** Cards that are due now (overdue first) followed by never-reviewed ("new") cards. */
  async getDue(
    deckId: number,
    userId: number,
    now: Date = new Date(),
  ): Promise<DueCardsResult> {
    const deck = await this.readableDeck(deckId, userId);
    const reviews = await this.reviewRepo.find({
      where: { deck_id: deckId, user_id: userId },
    });
    const byKey = new Map(reviews.map((r) => [r.card_key, r]));

    const due: DueCard[] = [];
    const fresh: DueCard[] = [];
    let nextDue: Date | null = null;
    const seen = new Set<string>();

    for (const card of deck.cards ?? []) {
      if (!card?.term) continue;
      const key = cardKeyOf(card.term);
      if (seen.has(key)) continue;
      seen.add(key);
      const r = byKey.get(key);
      if (!r) {
        fresh.push({
          ...card,
          card_key: key,
          reason: 'new',
          due_at: null,
          interval_days: 0,
          repetitions: 0,
          last_quality: null,
          last_reviewed_at: null,
        });
        continue;
      }
      const dueAt = new Date(r.due_at);
      if (dueAt.getTime() <= now.getTime()) {
        due.push({
          ...card,
          card_key: key,
          reason: 'due',
          due_at: dueAt,
          interval_days: r.interval_days,
          repetitions: r.repetitions,
          last_quality: r.last_quality,
          last_reviewed_at: r.last_reviewed_at,
        });
      } else if (!nextDue || dueAt < nextDue) {
        nextDue = dueAt;
      }
    }

    due.sort((a, b) => a.due_at!.getTime() - b.due_at!.getTime());
    return {
      deck_id: deckId,
      total_cards: seen.size,
      due_count: due.length,
      new_count: fresh.length,
      next_due_at: nextDue,
      cards: [...due, ...fresh],
    };
  }

  /** Record one answer for a card and reschedule it with SM-2. */
  async review(
    deckId: number,
    userId: number,
    dto: ReviewCardDto,
    now: Date = new Date(),
  ): Promise<CardReview> {
    const deck = await this.readableDeck(deckId, userId);
    const key = cardKeyOf(dto.card_key);
    if (!(deck.cards ?? []).some((c) => c?.term && cardKeyOf(c.term) === key)) {
      throw new NotFoundException('Card not found in this deck');
    }

    const existing = await this.reviewRepo.findOne({
      where: { user_id: userId, deck_id: deckId, card_key: key },
    });
    const next = applySm2(existing, dto.quality, now);
    const row =
      existing ??
      this.reviewRepo.create({
        user_id: userId,
        deck_id: deckId,
        card_key: key,
      });
    Object.assign(row, next, {
      last_quality: dto.quality,
      last_reviewed_at: now,
    });
    return this.reviewRepo.save(row);
  }
}
