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

/**
 * Everything the AI produced or graded, with the request that caused it: generated lessons,
 * vocabulary sets and tests, content scans, study schedules, writing/speaking evaluations and
 * Battle Mode questions. Readable directly in Supabase (see the `ai_generation_feed` view).
 */
@Entity('ai_generations')
@Index('IDX_ai_generations_kind', ['kind', 'created_at'])
@Index('IDX_ai_generations_user', ['user_id', 'created_at'])
export class AiGeneration {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_ai_generations' })
  id: number;

  /** Who asked for it; NULL for system-initiated output or once the account is deleted. */
  @Column({ type: 'int', nullable: true })
  user_id: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'FK_ai_generations_user',
  })
  user?: User | null;

  /** Role of the requester when it happened (1 student, 2 teacher, 3 admin). */
  @Column({ type: 'int', nullable: true })
  user_role: number | null;

  /** e.g. "lesson", "vocab_set", "test", "writing_evaluation", "schedule", "battle_questions". */
  @Column({ type: 'varchar', length: 40 })
  kind: string;

  /** The request parameters (long texts are clipped). */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  input: Record<string, unknown>;

  /** What the AI returned. */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  output: Record<string, unknown>;

  @Column({ type: 'varchar', length: 60, nullable: true })
  model: string | null;

  @CreateDateColumn()
  created_at: Date;
}
