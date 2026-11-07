import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { FlashcardDeck } from '../../flashcard-decks/entities/flashcard-deck.entity';
import { VocabSet } from '../../vocab-sets/entities/vocab-set.entity';
import { LearningSessionWord } from './learning-session-word.entity';

/** A flashcard study run or a quiz game; the words that were practised hang off it. */
export const SESSION_KINDS = ['flashcard', 'quiz'] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];

/** Where the practised words came from. */
export const SESSION_SOURCES = [
  'deck',
  'vocab_set',
  'ai',
  'builtin',
  'review', // words picked from the student's own vocabulary list
] as const;
export type SessionSource = (typeof SESSION_SOURCES)[number];

/**
 * One finished flashcard session or quiz game of one student, kept so the student can look back
 * at what they studied and practise those words again. Readable in Supabase through the
 * `learning_history_feed` view (and the two tables).
 */
@Entity('learning_sessions')
@Index('IDX_learning_sessions_user', ['user_id', 'kind', 'created_at'])
export class LearningSession {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_learning_sessions' })
  id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_learning_sessions_user',
  })
  user?: User;

  @Column({ type: 'varchar', length: 20 })
  kind: SessionKind;

  /** e.g. "multiple-choice", "word-scramble", "flashcards". */
  @Column({ type: 'varchar', length: 60 })
  mode_id: string;

  @Column({ type: 'varchar', length: 120 })
  mode_name: string;

  @Column({ type: 'varchar', length: 20 })
  source: SessionSource;

  /** Deck name, vocabulary set name or the game name — kept even if the deck is deleted later. */
  @Column({ type: 'varchar', length: 255 })
  title: string;

  /** The flashcard deck studied (a class deck included); NULL when it no longer exists. */
  @Column({ type: 'int', nullable: true })
  deck_id: number | null;

  @ManyToOne(() => FlashcardDeck, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'deck_id',
    foreignKeyConstraintName: 'FK_learning_sessions_deck',
  })
  deck?: FlashcardDeck | null;

  /** The teacher vocabulary set studied; NULL when it no longer exists. */
  @Column({ type: 'int', nullable: true })
  vocab_set_id: number | null;

  @ManyToOne(() => VocabSet, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'vocab_set_id',
    foreignKeyConstraintName: 'FK_learning_sessions_vocab_set',
  })
  vocabSet?: VocabSet | null;

  /** Language of the words being learned. */
  @Column({ type: 'varchar', length: 8, default: 'en' })
  learning_lang: string;

  /** Language the meanings are written in (never the same as learning_lang for word lists). */
  @Column({ type: 'varchar', length: 8, default: 'en' })
  meaning_lang: string;

  @Column({ type: 'int', default: 0 })
  total_items: number;

  @Column({ type: 'int', default: 0 })
  correct_items: number;

  /** 0–100. */
  @Column({ type: 'int', default: 0 })
  accuracy: number;

  @Column({ type: 'int', default: 0 })
  score: number;

  @Column({ type: 'int', default: 0 })
  xp_earned: number;

  @Column({ type: 'int', default: 0 })
  duration_seconds: number;

  @OneToMany(() => LearningSessionWord, (w) => w.session)
  words?: LearningSessionWord[];

  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date;
}
