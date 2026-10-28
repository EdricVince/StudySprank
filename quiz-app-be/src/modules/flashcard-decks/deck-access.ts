import type { FlashcardDeck } from './entities/flashcard-deck.entity';

/**
 * Who may read (and study) a deck:
 *  - its owner;
 *  - a deck assigned to a class: only students enrolled in that class;
 *  - any other deck: everyone, when it is public.
 * `isEnrolled` is only called for class decks read by someone other than the owner.
 */
export async function canReadDeck(
  deck: Pick<FlashcardDeck, 'owner_id' | 'class_id' | 'is_public'>,
  userId: number,
  isEnrolled: (classId: number) => Promise<boolean>,
): Promise<boolean> {
  if (deck.owner_id === userId) return true;
  if (deck.class_id != null) return isEnrolled(deck.class_id);
  return deck.is_public;
}
