import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { UserGoalSettings } from './entities/user-goal-settings.entity';
import { UserCustomGoal } from './entities/user-custom-goal.entity';
import { UserProgress } from '../progress/entities/user-progress.entity';
import { DailyActivity } from '../progress/entities/daily-activity.entity';
import {
  UpdateGoalSettingsDto,
  CreateCustomGoalDto,
  UpdateCustomGoalDto,
  GoalsResponseDto,
} from './dto/goals.dto';

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getWeekStartStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return toDateStr(d);
}

function dayOfYear(): number {
  const d = new Date();
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86400000);
}

// A rotating daily challenge so the goals visibly change each new day.
const DAILY_CHALLENGE_POOL: {
  type: string;
  label: string;
  target: number;
  metric: 'cards' | 'quizzes';
}[] = [
  {
    type: 'flashcard',
    label: 'Daily challenge: study 30 flashcards',
    target: 30,
    metric: 'cards',
  },
  {
    type: 'quiz',
    label: 'Daily challenge: finish 2 quizzes',
    target: 2,
    metric: 'quizzes',
  },
  {
    type: 'flashcard',
    label: 'Daily challenge: warm up with 15 cards',
    target: 15,
    metric: 'cards',
  },
  {
    type: 'quiz',
    label: 'Daily challenge: complete 3 quizzes',
    target: 3,
    metric: 'quizzes',
  },
  {
    type: 'flashcard',
    label: 'Daily challenge: review 50 flashcards',
    target: 50,
    metric: 'cards',
  },
  {
    type: 'quiz',
    label: 'Daily challenge: ace a quiz today',
    target: 1,
    metric: 'quizzes',
  },
  {
    type: 'flashcard',
    label: 'Daily challenge: learn 20 new words',
    target: 20,
    metric: 'cards',
  },
];

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(UserGoalSettings)
    private settingsRepo: Repository<UserGoalSettings>,
    @InjectRepository(UserCustomGoal)
    private customGoalRepo: Repository<UserCustomGoal>,
    @InjectRepository(UserProgress)
    private progressRepo: Repository<UserProgress>,
    @InjectRepository(DailyActivity)
    private dailyRepo: Repository<DailyActivity>,
  ) {}

  private async getOrCreateSettings(userId: number): Promise<UserGoalSettings> {
    let s = await this.settingsRepo.findOne({ where: { user_id: userId } });
    if (!s) {
      s = this.settingsRepo.create({ user_id: userId });
      await this.settingsRepo.save(s);
    }
    return s;
  }

  async getGoals(userId: number): Promise<GoalsResponseDto> {
    const today = toDateStr(new Date());
    const weekStart = getWeekStartStr();

    const [settings, progress, todayActivity, weekActivities, customGoals] =
      await Promise.all([
        this.getOrCreateSettings(userId),
        this.progressRepo.findOne({ where: { user_id: userId } }),
        this.dailyRepo.findOne({
          where: { user_id: userId, activity_date: today },
        }),
        this.dailyRepo.find({
          where: { user_id: userId, activity_date: Between(weekStart, today) },
        }),
        this.customGoalRepo.find({
          where: { user_id: userId },
          order: { created_at: 'DESC' },
        }),
      ]);

    const todayCards = todayActivity?.cards_studied ?? 0;
    const todayQuizzes = todayActivity?.quizzes_completed ?? 0;
    const weekCards = weekActivities.reduce((s, a) => s + a.cards_studied, 0);
    const weekQuizzes = weekActivities.reduce(
      (s, a) => s + a.quizzes_completed,
      0,
    );
    const streak = progress?.streak_count ?? 0;
    const totalCards = progress?.total_cards_studied ?? 0;
    const totalQuizzes = progress?.total_quizzes_completed ?? 0;

    return {
      daily_goals: [
        {
          type: 'flashcard',
          label: 'Review flashcards',
          current: todayCards,
          target: settings.target_cards,
          unit: 'cards',
        },
        {
          type: 'quiz',
          label: 'Complete quizzes',
          current: todayQuizzes,
          target: settings.target_quizzes,
          unit: 'quizzes',
        },
        // Rotating daily challenge — changes every day so goals never feel static.
        (() => {
          const c =
            DAILY_CHALLENGE_POOL[dayOfYear() % DAILY_CHALLENGE_POOL.length];
          return {
            type: c.type,
            label: c.label,
            current: c.metric === 'cards' ? todayCards : todayQuizzes,
            target: c.target,
            unit: c.metric,
          };
        })(),
      ],
      weekly_challenges: [
        {
          id: 'cards_weekly',
          title: 'Flashcard Grinder',
          description: 'Review 200 flashcards this week',
          current: weekCards,
          target: 200,
          completed: weekCards >= 200,
        },
        {
          id: 'quiz_weekly',
          title: 'Quiz Master',
          description: 'Complete 15 quizzes this week',
          current: weekQuizzes,
          target: 15,
          completed: weekQuizzes >= 15,
        },
        {
          id: 'streak',
          title: 'Streak Keeper',
          description: 'Maintain a 7-day learning streak',
          current: streak,
          target: 7,
          completed: streak >= 7,
        },
      ],
      milestones: [
        {
          id: 'cards_100',
          title: 'Card Beginner',
          description: 'Study your first 100 flashcards',
          current: totalCards,
          target: 100,
          completed: totalCards >= 100,
        },
        {
          id: 'cards_500',
          title: 'Card Explorer',
          description: 'Study 500 flashcards',
          current: totalCards,
          target: 500,
          completed: totalCards >= 500,
        },
        {
          id: 'cards_1000',
          title: 'Card Master',
          description: 'Study 1,000 flashcards',
          current: totalCards,
          target: 1000,
          completed: totalCards >= 1000,
        },
        {
          id: 'quiz_50',
          title: 'Quiz Novice',
          description: 'Complete 50 quizzes',
          current: totalQuizzes,
          target: 50,
          completed: totalQuizzes >= 50,
        },
      ],
      custom_goals: customGoals.map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        completed: g.completed,
      })),
    };
  }

  async updateSettings(
    userId: number,
    dto: UpdateGoalSettingsDto,
  ): Promise<UserGoalSettings> {
    const s = await this.getOrCreateSettings(userId);
    if (dto.target_cards !== undefined) s.target_cards = dto.target_cards;
    if (dto.target_quizzes !== undefined) s.target_quizzes = dto.target_quizzes;
    return this.settingsRepo.save(s);
  }

  async createCustomGoal(
    userId: number,
    dto: CreateCustomGoalDto,
  ): Promise<UserCustomGoal> {
    const goal = this.customGoalRepo.create({
      user_id: userId,
      title: dto.title,
      description: dto.description ?? null,
    });
    return this.customGoalRepo.save(goal);
  }

  async updateCustomGoal(
    userId: number,
    id: number,
    dto: UpdateCustomGoalDto,
  ): Promise<UserCustomGoal> {
    const goal = await this.customGoalRepo.findOne({
      where: { id, user_id: userId },
    });
    if (!goal) throw new NotFoundException('Goal not found');
    Object.assign(goal, dto);
    return this.customGoalRepo.save(goal);
  }

  async deleteCustomGoal(userId: number, id: number): Promise<void> {
    const goal = await this.customGoalRepo.findOne({
      where: { id, user_id: userId },
    });
    if (!goal) throw new NotFoundException('Goal not found');
    await this.customGoalRepo.remove(goal);
  }
}
