import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('daily_activities')
export class DailyActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'varchar' })
  activity_date: string;

  @Column({ default: 0 })
  xp_earned: number;

  @Column({ default: 0 })
  cards_studied: number;

  @Column({ default: 0 })
  quizzes_completed: number;

  /** Ids of the daily challenges whose reward was claimed on this day. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  claimed_challenges: number[];

  @CreateDateColumn()
  created_at: Date;
}
