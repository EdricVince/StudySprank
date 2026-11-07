import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudyPlan } from './entities/study-plan.entity';
import type { SaveStudyPlanDto } from './dto/study-plan.dto';

/** Plans one student may keep (the planner makes a handful; this only stops runaway growth). */
export const MAX_PLANS_PER_USER = 50;

@Injectable()
export class StudyPlansService {
  constructor(
    @InjectRepository(StudyPlan) private readonly plans: Repository<StudyPlan>,
  ) {}

  /** The caller's plans, newest first. */
  list(userId: number): Promise<StudyPlan[]> {
    return this.plans.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: MAX_PLANS_PER_USER,
    });
  }

  /**
   * Create the plan, or replace it when the caller already has one with this id (a plan is saved
   * again each time it is edited or a month is added). An id that belongs to someone else is
   * reported as taken, never overwritten.
   */
  async save(
    userId: number,
    id: string,
    dto: SaveStudyPlanDto,
  ): Promise<StudyPlan> {
    const existing = await this.plans.findOne({ where: { id } });
    if (existing && existing.user_id !== userId) {
      throw new ConflictException('This plan id is already in use');
    }
    if (!existing) {
      const count = await this.plans.count({ where: { user_id: userId } });
      if (count >= MAX_PLANS_PER_USER) {
        throw new ConflictException(
          `You can keep at most ${MAX_PLANS_PER_USER} study plans`,
        );
      }
    }
    return this.plans.save(
      this.plans.create({
        ...(existing ?? {}),
        id,
        user_id: userId,
        name: dto.name.trim(),
        form: dto.form,
        plan: dto.plan,
      }),
    );
  }

  async remove(userId: number, id: string): Promise<void> {
    const res = await this.plans.delete({ id, user_id: userId });
    if (!res.affected) throw new NotFoundException('Study plan not found');
  }
}
