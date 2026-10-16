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
