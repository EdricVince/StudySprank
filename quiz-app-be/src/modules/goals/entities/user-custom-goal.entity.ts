import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('user_custom_goals')
export class UserCustomGoal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column()
  title: string;

  @Column({ type: 'varchar', nullable: true, default: null })
  description: string | null;

  @Column({ default: false })
  completed: boolean;

  @CreateDateColumn()
  created_at: Date;
}
