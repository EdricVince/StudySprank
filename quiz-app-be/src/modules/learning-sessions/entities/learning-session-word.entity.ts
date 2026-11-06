import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { LearningSession } from './learning-session.entity';

/** One word (or idiom / question) practised in a session, with how the student did. */
@Entity('learning_session_words')
@Index('IDX_learning_session_words_session', ['session_id', 'position'])
export class LearningSessionWord {
  @PrimaryGeneratedColumn({
    primaryKeyConstraintName: 'PK_learning_session_words',
  })
  id: number;

  @Column()
  session_id: number;

  @ManyToOne(() => LearningSession, (s) => s.words, { onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'session_id',
    foreignKeyConstraintName: 'FK_learning_session_words_session',
  })
  session?: LearningSession;

  /** Order in which the word appeared in the session. */
  @Column({ type: 'int' })
  position: number;

  @Column({ type: 'varchar', length: 500 })
  term: string;

  @Column({ type: 'text', default: '' })
  meaning: string;

  @Column({ type: 'text', nullable: true })
  example: string | null;

  /** true = known / answered right, false = still learning / wrong, NULL = not rated. */
  @Column({ type: 'boolean', nullable: true })
  is_correct: boolean | null;
}
