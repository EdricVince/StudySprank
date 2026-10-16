import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveSession } from './entities/live-session.entity';

// A live lesson is a sequence of presentation steps the teacher walks through.
export interface StepDto {
  title: string;
  body: string;
}

export const LIVE_STATUSES = ['waiting', 'live', 'ended'] as const;
export type LiveStatus = (typeof LIVE_STATUSES)[number];

@Injectable()
export class LiveQuizService {
  constructor(
    @InjectRepository(LiveSession)
    private sessionRepo: Repository<LiveSession>,
  ) {}

  /** 6-digit PIN from a CSPRNG (not Math.random), so PINs can't be predicted. */
  private generatePin(): string {
    return String(crypto.randomInt(100000, 1000000));
  }

  async create(
    teacherId: number,
    title: string,
    classId?: number,
    steps: StepDto[] = [],
  ): Promise<LiveSession> {
    // `pin` is a UNIQUE column, so it must not collide with ANY stored session
    // (the old check only looked at 'waiting' ones → unique-violation on insert).
    let pin = this.generatePin();
    for (
      let tries = 0;
      await this.sessionRepo.findOne({ where: { pin } });
      tries++
    ) {
      if (tries >= 20)
        throw new ConflictException(
          'Could not allocate a free PIN, please retry.',
        );
      pin = this.generatePin();
    }
    const session = this.sessionRepo.create({
      teacher_id: teacherId,
      class_id: classId ?? null,
      title,
      pin,
      steps: JSON.stringify(steps),
      status: 'waiting',
      current_question: 0,
    });
    return this.sessionRepo.save(session);
  }

  async findByTeacher(teacherId: number): Promise<LiveSession[]> {
    return this.sessionRepo.find({
      where: { teacher_id: teacherId },
      order: { created_at: 'DESC' },
    });
  }

  async findByPin(pin: string): Promise<LiveSession> {
    const session = await this.sessionRepo.findOne({ where: { pin } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async findOne(id: number): Promise<LiveSession> {
    const session = await this.sessionRepo.findOne({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async updateStatus(
    id: number,
    teacherId: number,
    status: string,
  ): Promise<LiveSession> {
    if (!LIVE_STATUSES.includes(status as LiveStatus)) {
      throw new BadRequestException(
        `status must be one of: ${LIVE_STATUSES.join(', ')}`,
      );
    }
    const session = await this.findOne(id);
    if (session.teacher_id !== teacherId)
      throw new ForbiddenException('Not your session');
    session.status = status;
    return this.sessionRepo.save(session);
  }

  async delete(id: number, teacherId: number): Promise<void> {
    const session = await this.findOne(id);
    if (session.teacher_id !== teacherId)
      throw new ForbiddenException('Not your session');
    await this.sessionRepo.delete(id);
  }

  parseSteps(session: LiveSession): StepDto[] {
    try {
      const parsed: unknown = JSON.parse(session.steps || '[]');
      return Array.isArray(parsed) ? (parsed as StepDto[]) : [];
    } catch {
      return [];
    }
  }
}
