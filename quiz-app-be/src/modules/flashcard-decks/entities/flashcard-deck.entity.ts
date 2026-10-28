import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Class } from '../../classes/entities/class.entity';

export interface DeckCard {
  term: string;
  definition: string;
  example?: string;
  image?: string;
  audio?: string;
}

@Entity('flashcard_decks')
@Index('IDX_flashcard_decks_class', ['class_id'])
export class FlashcardDeck {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  owner_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner?: User;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ default: 'General' })
  category: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  cards: DeckCard[];

  // Public decks are visible to (and studyable by) every user; private = owner only.
  @Column({ default: true })
  is_public: boolean;

  // A deck assigned to a class is visible only to its teacher and the students enrolled
  // in that class (never public). NULL = a personal / community deck.
  @Column({ type: 'int', nullable: true })
  class_id: number | null;

  @ManyToOne(() => Class, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'class_id',
    foreignKeyConstraintName: 'FK_flashcard_decks_class',
  })
  classRef?: Class | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
