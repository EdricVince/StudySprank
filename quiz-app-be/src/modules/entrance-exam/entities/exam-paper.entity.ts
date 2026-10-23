import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ExamQuestionRow } from './exam-question.entity';

/** One line of the exam "format": a section and the question types it contains. */
export interface ExamSectionFormat {
  section: string;
  count: number;
  types: string[];
}

/** An AI-generated IELTS mock exam, kept so it can be re-taken without calling the AI again. */
@Entity('exam_papers')
export class ExamPaper {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_exam_papers' })
  id: number;

  @Column({ type: 'varchar', length: 20, default: 'ielts' })
  exam_type: string;

  @Column({ type: 'text' })
  theme: string;

  @Column({ type: 'int', default: 0 })
  variant: number;

  /** Minutes allowed. */
  @Column({ type: 'int', default: 30 })
  time_limit: number;

  /** Exam format (dạng đề): sections with their question counts and question types. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  format: ExamSectionFormat[];

  @Column({ type: 'int', nullable: true })
  created_by: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'created_by',
    foreignKeyConstraintName: 'FK_exam_papers_created_by',
  })
  creator?: User | null;

  @OneToMany(() => ExamQuestionRow, (q) => q.paper, { cascade: ['insert'] })
  questions?: ExamQuestionRow[];

  @CreateDateColumn()
  created_at: Date;
}
