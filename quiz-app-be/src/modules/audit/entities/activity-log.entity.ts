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
 * Who did what, and when: every create/update/delete a teacher or admin performs
 * (classes, tests, assignments, lessons, flashcard decks…), students joining a class,
 * and teacher applications/reviews. Readable in the admin portal and directly in
 * Supabase (see the `activity_feed` view).
 */
@Entity('activity_logs')
@Index('IDX_activity_logs_created', ['created_at'])
@Index('IDX_activity_logs_actor', ['actor_id', 'created_at'])
@Index('IDX_activity_logs_class', ['class_id', 'created_at'])
export class ActivityLog {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_activity_logs' })
  id: number;

  /** NULL once the actor's account has been deleted. */
  @Column({ type: 'int', nullable: true })
  actor_id: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'actor_id',
    foreignKeyConstraintName: 'FK_activity_logs_actor',
  })
  actor?: User | null;

  /** Role of the actor when it happened (1 student, 2 teacher, 3 admin). */
  @Column({ type: 'int', nullable: true })
  actor_role: number | null;

  /** e.g. "class.create", "test.update", "teacher.review". */
  @Column({ type: 'varchar', length: 60 })
  action: string;

  @Column({ type: 'varchar', length: 40 })
  entity_type: string;

  @Column({ type: 'int', nullable: true })
  entity_id: number | null;

  /** The class this activity belongs to, when there is one (kept after the class is deleted). */
  @Column({ type: 'int', nullable: true })
  class_id: number | null;

  /** Human-readable one-liner, e.g. `Created class “IELTS 6.5”`. */
  @Column({ type: 'text', default: '' })
  summary: string;

  /** A few safe fields of the request (name, title, status, reason…) — never credentials. */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  created_at: Date;
}
