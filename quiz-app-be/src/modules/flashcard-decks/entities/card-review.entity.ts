import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { FlashcardDeck } from './flashcard-deck.entity';

/** Per-user SM-2 scheduling state for one card of one deck. */
@Entity('card_reviews')
@Unique(['user_id', 'deck_id', 'card_key'])
export class CardReview {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Index()
  @Column()
  deck_id: number;

  @ManyToOne(() => FlashcardDeck, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'deck_id' })
  deck?: FlashcardDeck;

  // Normalised card term (see cardKeyOf) — deck cards live in jsonb without ids.
  @Column({ type: 'varchar', length: 255 })
  card_key: string;

  @Column({ type: 'float', default: 2.5 })
  ease_factor: number;

  @Column({ type: 'int', default: 0 })
  interval_days: number;

  @Column({ type: 'int', default: 0 })
  repetitions: number;

  @Column({ type: 'int', nullable: true, default: null })
  last_quality: number | null;

  @Column({ type: 'timestamptz' })
  due_at: Date;

  @Column({ type: 'timestamptz', nullable: true, default: null })
  last_reviewed_at: Date | null;
}
