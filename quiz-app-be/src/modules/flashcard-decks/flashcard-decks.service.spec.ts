import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FlashcardDecksService } from './flashcard-decks.service';

describe('FlashcardDecksService — sharing + ownership', () => {
  let service: FlashcardDecksService;
  let repo: any;

  const publicDeck = { id: 3, owner_id: 10, is_public: true };
  const privateDeck = { id: 4, owner_id: 10, is_public: false };

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn((x: any) => x),
      save: jest.fn((x: any) => ({ id: 1, ...x })),
      delete: jest.fn(),
    };
    service = new FlashcardDecksService(repo);
  });

  it('creates a deck with sensible defaults (public, empty cards)', async () => {
    const deck = await service.create(10, { title: 'N5' });
    expect(deck.owner_id).toBe(10);
    expect(deck.is_public).toBe(true);
    expect(deck.cards).toEqual([]);
    expect(repo.save).toHaveBeenCalled();
  });

  it('lets anyone read a PUBLIC deck (shared)', async () => {
    repo.findOne.mockResolvedValue(publicDeck);
    expect((await service.findOne(3, 999)).id).toBe(3); // a different user
  });

  it('blocks a non-owner from a PRIVATE deck (403)', async () => {
    repo.findOne.mockResolvedValue(privateDeck);
    await expect(service.findOne(4, 999)).rejects.toThrow(ForbiddenException);
  });

  it('lets the owner read their own private deck', async () => {
    repo.findOne.mockResolvedValue(privateDeck);
    expect((await service.findOne(4, 10)).id).toBe(4);
  });

  it('throws NotFound for a missing deck', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findOne(404, 10)).rejects.toThrow(NotFoundException);
  });

  it('blocks a non-owner from updating or deleting a deck', async () => {
    repo.findOne.mockResolvedValue(publicDeck);
    await expect(service.update(3, 999, { title: 'hijack' })).rejects.toThrow(
      ForbiddenException,
    );
    repo.findOne.mockResolvedValue(publicDeck);
    await expect(service.remove(3, 999)).rejects.toThrow(ForbiddenException);
  });

  it('lets the owner update their deck', async () => {
    repo.findOne.mockResolvedValue({ ...publicDeck });
    await service.update(3, 10, { cards: [{ term: 'a', definition: 'b' }] });
    expect(repo.save).toHaveBeenCalled();
  });
});

describe('FlashcardDecksService — decks assigned to a class', () => {
  const teacher = { role_id: 2, teacher_status: 'approved' };
  let service: FlashcardDecksService;
  let repo: any;

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn((x: any) => x),
      save: jest.fn((x: any) => ({ id: 1, ...x })),
      delete: jest.fn(),
      manager: { findOne: jest.fn() },
    };
    service = new FlashcardDecksService(repo);
  });

  it('an approved teacher can assign a deck to their own class — never public', async () => {
    repo.manager.findOne.mockResolvedValue({ id: 5 }); // the class belongs to them
    const deck = await service.create(
      10,
      { title: 'Unit 1', class_id: 5, is_public: true },
      teacher,
    );
    expect(deck.class_id).toBe(5);
    expect(deck.is_public).toBe(false);
  });

  it("refuses a class that is not the teacher's own (403)", async () => {
    repo.manager.findOne.mockResolvedValue(null);
    await expect(
      service.create(10, { title: 'x', class_id: 99 }, teacher),
    ).rejects.toThrow(ForbiddenException);
  });

  it('refuses students and teachers who are not approved yet (403)', async () => {
    await expect(
      service.create(3, { title: 'x', class_id: 5 }, { role_id: 1 }),
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.create(
        10,
        { title: 'x', class_id: 5 },
        { role_id: 2, teacher_status: 'pending' },
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('a class deck is readable by enrolled students only', async () => {
    const classDeck = { id: 7, owner_id: 10, class_id: 5, is_public: false };
    repo.findOne.mockResolvedValue(classDeck);

    repo.manager.findOne.mockResolvedValue({ id: 1 }); // enrolled
    expect((await service.findOne(7, 42)).id).toBe(7);

    repo.manager.findOne.mockResolvedValue(null); // not enrolled
    await expect(service.findOne(7, 43)).rejects.toThrow(ForbiddenException);

    // the owner needs no enrollment lookup at all
    repo.manager.findOne.mockClear();
    expect((await service.findOne(7, 10)).id).toBe(7);
    expect(repo.manager.findOne).not.toHaveBeenCalled();
  });

  it('a class deck is never readable just because it is flagged public', async () => {
    repo.findOne.mockResolvedValue({
      id: 8,
      owner_id: 10,
      class_id: 5,
      is_public: true,
    });
    repo.manager.findOne.mockResolvedValue(null);
    await expect(service.findOne(8, 43)).rejects.toThrow(ForbiddenException);
  });

  it('moving a deck out of its class (class_id null) needs no class check', async () => {
    repo.findOne.mockResolvedValue({
      id: 7,
      owner_id: 10,
      class_id: 5,
      is_public: false,
    });
    const deck = await service.update(7, 10, { class_id: null }, teacher);
    expect(deck.class_id).toBeNull();
    expect(repo.manager.findOne).not.toHaveBeenCalled();
  });
});
