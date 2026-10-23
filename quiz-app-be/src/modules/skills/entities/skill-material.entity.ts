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

export type SkillName = 'reading' | 'listening' | 'writing' | 'speaking';

/**
 * Every exercise the AI generates on the Skills pages (reading passage + questions,
 * listening script + questions, writing task, speaking prompt), stored with its
 * format (`kind`) so it is not lost once the student leaves the page.
 */
@Entity('skill_materials')
@Index('IDX_skill_materials_skill', ['skill', 'kind', 'level'])
export class SkillMaterial {
  @PrimaryGeneratedColumn({ primaryKeyConstraintName: 'PK_skill_materials' })
  id: number;

  @Column({ type: 'varchar', length: 20 })
  skill: SkillName;

  /** Exercise format (dạng đề), e.g. "ielts", "ielts_task1", "shadowing", "speaking_part2". */
  @Column({ type: 'varchar', length: 40 })
  kind: string;

  @Column({ type: 'varchar', length: 4, nullable: true })
  level: string | null;

  @Column({ type: 'text', nullable: true })
  topic: string | null;

  /** The generated exercise as returned to the student (questions, options, answers…). */
  @Column({ type: 'jsonb' })
  content: Record<string, unknown>;

  @Column({ type: 'int', nullable: true })
  created_by: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({
    name: 'created_by',
    foreignKeyConstraintName: 'FK_skill_materials_created_by',
  })
  creator?: User | null;

  @CreateDateColumn()
  created_at: Date;
}
