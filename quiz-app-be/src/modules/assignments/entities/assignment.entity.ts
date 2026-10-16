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
import { Class } from '../../classes/entities/class.entity';

// A "document" assignment: a prompt/handout the teacher posts for students to read/do
// (optionally with an attached image/file, stored as a base64 data URL). Graded work
// uses the separate `tests` module instead.
@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  teacher_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher?: User;

  @Column({ nullable: true, type: 'int' })
  class_id: number | null;

  @ManyToOne(() => Class, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'class_id' })
  classRef?: Class | null;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // base64 data URL of an attached image/file (nullable). Kept small on the client.
  @Column({ type: 'text', nullable: true })
  attachment: string | null;

  @Column({ type: 'varchar', nullable: true })
  attachment_name: string | null;

  @Column({ default: false })
  is_published: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
