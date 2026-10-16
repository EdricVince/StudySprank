import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CardReviewsService } from './card-reviews.service';

const NOW = new Date('2026-03-10T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

const deck = {
  id: 7,
  owner_id: 10,
  is_public: true,
  cards: [
    { term: 'Apple', definition: 'táo' },
    { term: 'Book', definition: 'sách' },
    { term: 'Cat', definition: 'mèo' },
    { term: 'Dog', definition: 'chó' },
  ],
};

function build(reviews: any[] = [], deckRow: any = deck) {
  const deckRepo = { findOne: jest.fn().mockResolvedValue(deckRow) };
  const reviewRepo = {
    find: jest.fn().mockResolvedValue(reviews),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((x: any) => ({ ...x })),
    save: jest.fn(async (x: any) => x),
  };
  return {
    service: new CardReviewsService(deckRepo as any, reviewRepo as any),
    deckRepo,
    reviewRepo,
  };
}

describe('CardReviewsService — due cards + SM-2 reviews', () => {
  it('returns overdue cards first (oldest first), then never-reviewed cards; skips cards not yet due', async () => {
    const { service } = build([
      {
        card_key: 'book',
        due_at: new Date(NOW.getTime() - 1 * DAY),
        interval_days: 6,
        repetitions: 2,
        last_quality: 4,
        last_reviewed_at: null,
      },
      {
        card_key: 'apple',
        due_at: new Date(NOW.getTime() - 3 * DAY),
        interval_days: 1,
        repetitions: 0,
        last_quality: 1,
        last_reviewed_at: null,
      },
      {
        card_key: 'cat',
        due_at: new Date(NOW.getTime() + 5 * DAY),
        interval_days: 6,
        repetitions: 2,
        last_quality: 5,
        last_reviewed_at: null,
      },
    ]);

    const res = await service.getDue(7, 99, NOW);

    expect(res.cards.map((c) => c.card_key)).toEqual(['apple', 'book', 'dog']);
    expect(res.cards.map((c) => c.reason)).toEqual(['due', 'due', 'new']);
    expect(res.due_count).toBe(2);
    expect(res.new_count).toBe(1);
    expect(res.total_cards).toBe(4);
    expect(res.next_due_at).toEqual(new Date(NOW.getTime() + 5 * DAY)); // 'cat'
  });

  it('treats every card as new for a user with no reviews', async () => {
    const { service } = build([]);
    const res = await service.getDue(7, 99, NOW);
    expect(res.due_count).toBe(0);
    expect(res.new_count).toBe(4);
    expect(res.next_due_at).toBeNull();
  });

  it("blocks reading due cards of someone else's private deck", async () => {
    const { service } = build([], { ...deck, is_public: false });
    await expect(service.getDue(7, 99, NOW)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('creates a review row with the SM-2 schedule on the first answer', async () => {
    const { service, reviewRepo } = build();
    const row = await service.review(
      7,
      99,
      { card_key: ' APPLE ', quality: 4 },
      NOW,
    );
    expect(row).toMatchObject({
      user_id: 99,
      deck_id: 7,
      card_key: 'apple',
      repetitions: 1,
      interval_days: 1,
      last_quality: 4,
    });
    expect(row.due_at).toEqual(new Date(NOW.getTime() + DAY));
    expect(row.last_reviewed_at).toEqual(NOW);
    expect(reviewRepo.save).toHaveBeenCalled();
  });

  it('updates an existing review: a failed answer (quality 1) resets the card to tomorrow', async () => {
    const { service, reviewRepo } = build();
    reviewRepo.findOne.mockResolvedValue({
      id: 3,
      user_id: 99,
      deck_id: 7,
      card_key: 'book',
      ease_factor: 2.5,
      interval_days: 15,
      repetitions: 4,
    });
    const row = await service.review(
      7,
      99,
      { card_key: 'Book', quality: 1 },
      NOW,
    );
    expect(row.id).toBe(3);
    expect(row.repetitions).toBe(0);
    expect(row.interval_days).toBe(1);
    expect(reviewRepo.create).not.toHaveBeenCalled();
  });

  it('rejects a card key that is not in the deck', async () => {
    const { service } = build();
    await expect(
      service.review(7, 99, { card_key: 'zebra', quality: 5 }, NOW),
    ).rejects.toThrow(NotFoundException);
  });
});
