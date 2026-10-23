import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SkillMaterial } from './entities/skill-material.entity';
import type { SkillName } from './entities/skill-material.entity';

export interface SaveSkillMaterial {
  skill: SkillName;
  /** Exercise format, e.g. "ielts", "ielts_task2", "shadowing", "speaking_part2". */
  kind: string;
  level?: string | null;
  topic?: string | null;
  /** The exercise exactly as returned to the student. */
  content: Record<string, unknown>;
  userId?: number | null;
}

/** String value of `key` in an AI-generated object, or null. */
export function stringField(
  data: Record<string, unknown>,
  key: string,
): string | null {
  const value = data[key];
  return typeof value === 'string' && value ? value : null;
}

/** Keeps every AI-generated Skills exercise (format + questions) in the database. */
@Injectable()
export class SkillMaterialsService {
  private readonly logger = new Logger(SkillMaterialsService.name);

  constructor(
    @InjectRepository(SkillMaterial)
    private readonly repo: Repository<SkillMaterial>,
  ) {}

  /**
   * Store a generated exercise. Never throws: a database hiccup must not take
   * away an exercise the AI has already produced for the student.
   */
  async save(input: SaveSkillMaterial): Promise<number | null> {
    try {
      const row = await this.repo.save(
        this.repo.create({
          skill: input.skill,
          kind: input.kind,
          level: input.level ?? null,
          topic: input.topic ?? null,
          content: input.content,
          created_by: input.userId ?? null,
        }),
      );
      return row.id;
    } catch (e) {
      this.logger.error('Saving skill material failed', e);
      return null;
    }
  }
}
