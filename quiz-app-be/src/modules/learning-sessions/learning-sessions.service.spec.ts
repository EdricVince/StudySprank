import { NotFoundException } from '@nestjs/common';
import {
  LearningSessionsService,
  accuracyOf,
} from './learning-sessions.service';
import type { CreateLearningSessionDto } from './dto/learning-session.dto';

describe('accuracyOf', () => {
  it('is the share of rated words that were right, ignoring unrated ones', () => {
    expect(accuracyOf([{ is_correct: true }, { is_correct: false }, {}])).toBe(
      50,
    );
    expect(accuracyOf([{ is_correct: true }, { is_correct: true }])).toBe(100);
  });

  it('is 0 when nothing was rated', () => {
    expect(accuracyOf([{}, { is_correct: null }])).toBe(0);
    expect(accuracyOf([])).toBe(0);
  });
});

const dto = (over: Partial<CreateLearningSessionDto> = {}) =>
  ({
    kind: 'quiz',
    mode_id: 'multiple-choice',
    mode_name: 'Multiple Choice',
    source: 'builtin',
    title: 'Multiple Choice',
    words: [
      { term: 'door', meaning: 'cửa', is_correct: true },
      { term: 'cat', meaning: 'con mèo', is_correct: false },
      { term: 'sun', meaning: 'mặt trời', is_correct: true, example: 'x' },
    ],
    ...over,
  }) as CreateLearningSessionDto;

function build(existing: { deck?: boolean; set?: boolean } = {}) {
  const saved: unknown[] = [];
  const manager = {
    exists: jest.fn((entity: { name: string }) =>
      Promise.resolve(
        entity.name === 'FlashcardDeck'
          ? (existing.deck ?? true)
          : (existing.set ?? true),
      ),
    ),
    create: jest.fn((_e: unknown, x: Record<string, unknown>) => ({ ...x })),
    save: jest.fn((x: unknown) => {
      saved.push(x);
      return Promise.resolve(
        Array.isArray(x)
          ? x.map((w: object, i) => ({ id: i + 1, ...w }))
          : { id: 42, ...(x as object) },
      );
    }),
  };
  const sessions = {
    manager: {
      transaction: (cb: (m: typeof manager) => unknown) => cb(manager),
    },
    findOne: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const words = { find: jest.fn() };
  const service = new LearningSessionsService(
    sessions as never,
    words as never,
  );
  return { service, sessions, words, manager, saved };
}

describe('LearningSessionsService', () => {
  it('saves the session for the caller with counts computed from the words, then every word in order', async () => {
    const { service, saved } = build();
    const out = await service.create(7, dto({ score: 300, xp_earned: 20 }));

    const [session, words] = saved as [Record<string, unknown>, unknown[]];
    expect(session).toMatchObject({
      user_id: 7,
      kind: 'quiz',
      total_items: 3,
      correct_items: 2,
      accuracy: 67,
      score: 300,
      xp_earned: 20,
    });
    expect(words).toEqual([
      expect.objectContaining({ session_id: 42, position: 1, term: 'door' }),
      expect.objectContaining({ position: 2, is_correct: false }),
      expect.objectContaining({ position: 3, example: 'x' }),
    ]);
    expect(out.id).toBe(42);
    expect(out.words).toHaveLength(3);
  });

  it('keeps the history when the deck was deleted: the reference is dropped, not an error', async () => {
    const { service, saved } = build({ deck: false });
    await service.create(7, dto({ kind: 'flashcard', deck_id: 99 }));
    expect((saved[0] as { deck_id: number | null }).deck_id).toBeNull();
  });

  it('links an existing deck or vocabulary set', async () => {
    const { service, saved } = build();
    await service.create(7, dto({ deck_id: 5, vocab_set_id: 6 }));
    expect(saved[0]).toMatchObject({ deck_id: 5, vocab_set_id: 6 });
  });

  it('lists only the caller’s sessions, newest first, optionally by kind', async () => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[{ id: 1 }], 1]),
    };
    const { service, sessions } = build();
    sessions.createQueryBuilder.mockReturnValue(qb);

    const page = await service.list(7, { kind: 'flashcard', limit: 5 });

    expect(qb.where).toHaveBeenCalledWith('s.user_id = :userId', { userId: 7 });
    expect(qb.andWhere).toHaveBeenCalledWith('s.kind = :kind', {
      kind: 'flashcard',
    });
    expect(qb.take).toHaveBeenCalledWith(5);
    expect(page).toEqual({ items: [{ id: 1 }], total: 1 });
  });

  it('returns a session with its words, and 404s for someone else’s session', async () => {
    const { service, sessions, words } = build();
    sessions.findOne.mockResolvedValueOnce({ id: 3, user_id: 7 });
    words.find.mockResolvedValueOnce([{ term: 'door' }]);
    const found = await service.findOne(7, 3);
    expect(sessions.findOne).toHaveBeenCalledWith({
      where: { id: 3, user_id: 7 },
    });
    expect(found.words).toEqual([{ term: 'door' }]);

    sessions.findOne.mockResolvedValueOnce(null);
    await expect(service.findOne(8, 3)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deletes only the caller’s own session', async () => {
    const { service, sessions } = build();
    sessions.delete.mockResolvedValueOnce({ affected: 1 });
    await service.remove(7, 3);
    expect(sessions.delete).toHaveBeenCalledWith({ id: 3, user_id: 7 });

    sessions.delete.mockResolvedValueOnce({ affected: 0 });
    await expect(service.remove(7, 4)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
