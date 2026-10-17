import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_progress')
export class UserProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ default: 0 })
  xp: number;

  @Column({ default: 1 })
  level: number;

  @Column({ default: 0 })
  streak_count: number;

  @Column({ default: 0 })
  longest_streak: number;

  @Column({ type: 'varchar', nullable: true, default: null })
  last_activity_date: string | null;

  @Column({ default: 0 })
  total_cards_studied: number;

  @Column({ default: 0 })
  total_quizzes_completed: number;

  /** Last time a self-reported activity earned XP — enforces a cooldown between sessions. */
  @Column({ type: 'timestamptz', nullable: true, default: null })
  last_xp_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
