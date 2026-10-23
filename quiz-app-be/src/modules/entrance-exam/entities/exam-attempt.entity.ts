import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ExamPaper } from './exam-paper.entity';
import type { ExamResult } from '../dto/exam.dto';

export interface StoredExamAnswer {
  question_id: number;
  selected?: number;
  written?: string;
}

/** A student's sitting of an exam paper: answers + the graded result once submitted. */
@Entity('exam_attempts')
@Index('IDX_exam_attempts_user', ['user_id', 'submitted_at'])
export class ExamAttempt {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_exam_attempts' })
  id: number;

  @Column()
  paper_id: number;

  @ManyToOne(() => ExamPaper, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'paper_id',
    foreignKeyConstraintName: 'FK_exam_attempts_paper',
  })
  paper?: ExamPaper;

  @Column()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_exam_attempts_user',
  })
  user?: User;

  /** 'in_progress' until the student submits. */
  @Column({ type: 'varchar', length: 20, default: 'in_progress' })
  status: 'in_progress' | 'submitted';

  @Column({ type: 'jsonb', default: () => "'[]'" })
  answers: StoredExamAnswer[];

  /** Full graded result (breakdown, recommendations, answer review, writing responses). */
  @Column({ type: 'jsonb', nullable: true })
  result: ExamResult | null;

  @Column({ type: 'int', nullable: true })
  score_percent: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  estimated_band: string | null;

  @CreateDateColumn({ name: 'started_at' })
  started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  submitted_at: Date | null;
}
