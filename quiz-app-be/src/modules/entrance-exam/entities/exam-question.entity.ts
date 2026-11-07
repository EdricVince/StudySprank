import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ExamPaper } from './exam-paper.entity';

/** One question of a stored exam paper (the answer key lives here, server-side). */
@Entity('exam_questions')
@Index('IDX_exam_questions_paper', ['paper_id', 'position'])
export class ExamQuestionRow {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_exam_questions' })
  id: number;

  @Column()
  paper_id: number;

  @ManyToOne(() => ExamPaper, (p) => p.questions, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'paper_id',
    foreignKeyConstraintName: 'FK_exam_questions_paper',
  })
  paper?: ExamPaper;

  /** 0-based order inside the paper. */
  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'varchar', length: 60 })
  section: string;

  /** Question type (dạng câu hỏi), e.g. "multiple-choice", "true-false-not-given", "writing-task1". */
  @Column({ type: 'varchar', length: 40 })
  type: string;

  /** Listening transcript, reading passage, or Writing Task 1 chart (JSON string). */
  @Column({ type: 'text', nullable: true })
  passage: string | null;

  /** The rubric shared by a run of questions ("Write NO MORE THAN TWO WORDS…"). */
  @Column({ type: 'text', nullable: true })
  instruction: string | null;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'jsonb', default: () => "'[]'" })
  options: string[];

  /** Index of the correct option; -1 for free-response (Writing) questions. */
  @Column({ type: 'int', default: -1 })
  correct_answer: number;

  /** Typed-answer questions: every spelling that counts as right. */
  @Column({ type: 'jsonb', default: () => "'[]'" })
  accepted_answers: string[];

  @Column({ type: 'text', default: '' })
  explanation: string;
}
