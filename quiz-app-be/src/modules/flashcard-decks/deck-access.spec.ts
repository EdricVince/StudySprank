import { canReadDeck } from './deck-access';

describe('canReadDeck', () => {
  const enrolledIn = (...ids: number[]) =>
    jest.fn((classId: number) => Promise.resolve(ids.includes(classId)));

  it('the owner always can, without any enrollment lookup', async () => {
    const isEnrolled = enrolledIn();
    const deck = { owner_id: 1, class_id: 5, is_public: false };
    expect(await canReadDeck(deck, 1, isEnrolled)).toBe(true);
    expect(isEnrolled).not.toHaveBeenCalled();
  });

  it('a class deck needs enrollment in that class', async () => {
    const deck = { owner_id: 1, class_id: 5, is_public: false };
    expect(await canReadDeck(deck, 2, enrolledIn(5))).toBe(true);
    expect(await canReadDeck(deck, 2, enrolledIn(6))).toBe(false);
  });

  it('public only helps a deck that is not tied to a class', async () => {
    const isEnrolled = enrolledIn();
    const shared = { owner_id: 1, class_id: null, is_public: true };
    const hidden = { owner_id: 1, class_id: null, is_public: false };
    const classDeck = { owner_id: 1, class_id: 5, is_public: true };
    expect(await canReadDeck(shared, 2, isEnrolled)).toBe(true);
    expect(await canReadDeck(hidden, 2, isEnrolled)).toBe(false);
    expect(await canReadDeck(classDeck, 2, isEnrolled)).toBe(false);
  });
});
