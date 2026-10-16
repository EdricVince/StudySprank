import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Class } from '../../classes/entities/class.entity';

@Entity('videos')
export class Video {
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

  @Column({ type: 'text' })
  video_url: string;

  @Column({ nullable: true, type: 'text' })
  lesson_name: string | null;

  @Column({ default: 0 })
  duration: number;

  @Column({ default: true })
  is_published: boolean;

  @CreateDateColumn()
  created_at: Date;
}
