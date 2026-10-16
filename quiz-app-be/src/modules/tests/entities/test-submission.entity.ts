import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Test } from './test.entity';

@Entity('test_submissions')
export class TestSubmission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  test_id: number;

  @ManyToOne(() => Test, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'test_id' })
  test?: Test;

  @Column()
  student_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student?: User;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  answers: number[]; // selected option index per question (-1 = unanswered)

  @Column()
  score: number;

  @Column()
  total: number;

  @CreateDateColumn()
  created_at: Date;
}
