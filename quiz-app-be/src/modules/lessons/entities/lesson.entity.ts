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

export interface LessonContent {
  reading?: string;
  vocabulary: { term: string; definition: string; example: string }[];
  quiz: {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  }[];
  comprehension: { question: string; answer: string }[];
}

@Entity('lessons')
export class Lesson {
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

  @Column({ default: 'General' })
  category: string;

  @Column({ default: 'beginner' })
  difficulty: string;

  @Column({ type: 'jsonb' })
  content: LessonContent;

  @Column({ default: true })
  is_published: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
