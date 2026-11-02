import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiGeneration } from './entities/ai-generation.entity';
import { AI_MODEL } from '../../core/ai/anthropic';

export interface AiGenerationRecord {
  kind: string;
  userId?: number | null;
  userRole?: number | null;
  input?: unknown;
  output: unknown;
}

/** Texts longer than this (an essay, a pasted article) are clipped before they are stored. */
const MAX_TEXT_LENGTH = 20000;
const MAX_DEPTH = 8;

/** Copy of `value` with over-long strings clipped, so one huge request cannot bloat the table. */
export function clip(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') {
    return value.length > MAX_TEXT_LENGTH
      ? `${value.slice(0, MAX_TEXT_LENGTH)}…`
      : value;
  }
  if (depth >= MAX_DEPTH || value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => clip(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k,
      clip(v, depth + 1),
    ]),
  );
}

@Injectable()
export class AiGenerationService {
  private readonly logger = new Logger(AiGenerationService.name);

  constructor(
    @InjectRepository(AiGeneration)
    private readonly repo: Repository<AiGeneration>,
  ) {}

  /** Store one AI result. Never throws: the user already has their answer. */
  async record(rec: AiGenerationRecord): Promise<void> {
    try {
      await this.repo.save(
        this.repo.create({
          user_id: rec.userId ?? null,
          user_role: rec.userRole ?? null,
          kind: rec.kind,
          input: clip(rec.input ?? {}) as Record<string, unknown>,
          output: clip(rec.output) as Record<string, unknown>,
          model: AI_MODEL,
        }),
      );
    } catch (e) {
      this.logger.error(
        `Could not record AI output "${rec.kind}": ${(e as Error).message}`,
      );
    }
  }
}
