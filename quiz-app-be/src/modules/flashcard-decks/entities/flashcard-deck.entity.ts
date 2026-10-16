import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export interface DeckCard {
  term: string;
  definition: string;
  example?: string;
  image?: string;
  audio?: string;
}

@Entity('flashcard_decks')
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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
