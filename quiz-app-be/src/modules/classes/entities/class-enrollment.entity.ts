import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Class } from './class.entity';

@Entity('class_enrollments')
export class ClassEnrollment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  class_id: number;

  @ManyToOne(() => Class, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'class_id' })
  classRef?: Class;

  @Column()
  student_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student?: User;

  @CreateDateColumn()
  joined_at: Date;
}
