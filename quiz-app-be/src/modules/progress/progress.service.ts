import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, Repository } from 'typeorm';
import { UserProgress } from './entities/user-progress.entity';
import { DailyActivity } from './entities/daily-activity.entity';
import { LessonCompletion } from './entities/lesson-completion.entity';
import { User } from '../users/entities/user.entity';
import {
  ClaimChallengeResponseDto,
  LogActivityDto,
  LogActivityResponseDto,
} from './dto/log-activity.dto';
import {
  ProgressResponseDto,
  WeeklyActivityItemDto,
} from './dto/progress-response.dto';
import { LeaderboardItemDto } from './dto/leaderboard-item.dto';

const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 1000, 2000, 3500, 5000, 7500, 10000,
];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STREAK_MILESTONES = [10, 50, 100, 200, 365];

function getStreakTier(streak: number): {
  tier: string;
  label: string;
  color: string;
  next_milestone: number | null;
  days_to_next: number | null;
} {
  if (streak >= 365)
    return {
      tier: 'legendary',
      label: 'Legendary',
      color: '#9333ea',
      next_milestone: null,
      days_to_next: null,
    };
  if (streak >= 200)
    return {
      tier: 'diamond',
      label: 'Diamond',
      color: '#3b82f6',
      next_milestone: 365,
      days_to_next: 365 - streak,
    };
  if (streak >= 100)
    return {
      tier: 'gold',
      label: 'Gold',
      color: '#f59e0b',
      next_milestone: 200,
      days_to_next: 200 - streak,
    };
  if (streak >= 50)
    return {
      tier: 'silver',
      label: 'Silver',
      color: '#94a3b8',
      next_milestone: 100,
      days_to_next: 100 - streak,
    };
  if (streak >= 10)
    return {
      tier: 'bronze',
      label: 'Bronze',
      color: '#f97316',
      next_milestone: 50,
      days_to_next: 50 - streak,
    };
  return {
    tier: 'starter',
    label: 'Starter',
    color: '#6b7280',
    next_milestone: 10,
    days_to_next: 10 - streak,
  };
}

function getLevel(xp: number): number {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
      break;
    }
  }
  return Math.min(level, 10);
}

function getXpBounds(level: number): { current: number; next: number } {
  const idx = Math.min(level - 1, LEVEL_THRESHOLDS.length - 1);
  const nextIdx = Math.min(level, LEVEL_THRESHOLDS.length - 1);
  return {
    current: LEVEL_THRESHOLDS[idx],
    next: level >= 10 ? LEVEL_THRESHOLDS[9] : LEVEL_THRESHOLDS[nextIdx],
  };
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

/**
 * Practice games run in the browser, so their results are self-reported. To keep
 * XP meaningful the server limits how fast and how much it can be earned:
 * one XP-earning activity per cooldown, and a daily XP ceiling.
 */
export const XP_COOLDOWN_MS = 20_000;
export const DAILY_XP_CAP = 400;

/** Daily challenges — the server checks completion before paying out (see claimChallenge). */
export const DAILY_CHALLENGES: {
  id: number;
  xp: number;
  done: (a: DailyActivity) => boolean;
}[] = [
  { id: 1, xp: 25, done: (a) => a.cards_studied >= 10 },
  { id: 2, xp: 30, done: (a) => a.quizzes_completed >= 1 },
  { id: 3, xp: 20, done: (a) => a.cards_studied >= 20 },
  { id: 4, xp: 35, done: (a) => a.xp_earned >= 50 },
];
export const ALL_CHALLENGES_BONUS = 50;

function calculateXpGained(dto: LogActivityDto): number {
  if (dto.type === 'flashcard_session') {
    const cards = dto.cards_count ?? 0;
    return Math.min(cards * 5, 100);
  }
  if (dto.type === 'quiz_completion') {
    const score = dto.score ?? 0;
    return 25 + Math.floor((score / 100) * 25);
  }
  return 0;
}

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(UserProgress)
    private progressRepo: Repository<UserProgress>,
    @InjectRepository(DailyActivity)
    private dailyRepo: Repository<DailyActivity>,
    @InjectRepository(LessonCompletion)
    private completionRepo: Repository<LessonCompletion>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private dataSource: DataSource,
  ) {}

  /** Mark a lesson complete for the user (idempotent). */
  async completeLesson(
    userId: number,
    lessonId: number,
  ): Promise<{ completed: true }> {
    const existing = await this.completionRepo.findOne({
      where: { user_id: userId, lesson_id: lessonId },
    });
    if (!existing) {
      await this.completionRepo.save(
        this.completionRepo.create({ user_id: userId, lesson_id: lessonId }),
      );
    }
    return { completed: true };
  }

  /** The lesson ids this user has completed. */
  async getCompletedLessonIds(userId: number): Promise<number[]> {
    const rows = await this.completionRepo.find({
      where: { user_id: userId },
      select: ['lesson_id'],
    });
    return rows.map((r) => r.lesson_id);
  }

  private async getOrCreateProgress(userId: number): Promise<UserProgress> {
    let progress = await this.progressRepo.findOne({
      where: { user_id: userId },
    });
    if (!progress) {
      progress = this.progressRepo.create({ user_id: userId });
      await this.progressRepo.save(progress);
    }
    return progress;
  }

  private async getTodayActivity(userId: number): Promise<DailyActivity> {
    const today = getTodayString();
    let activity = await this.dailyRepo.findOne({
      where: { user_id: userId, activity_date: today },
    });
    if (!activity) {
      activity = this.dailyRepo.create({
        user_id: userId,
        activity_date: today,
      });
      await this.dailyRepo.save(activity);
    }
    return activity;
  }

  async logActivity(
    userId: number,
    dto: LogActivityDto,
  ): Promise<LogActivityResponseDto> {
    return this.dataSource.transaction(async (manager) => {
      const progressRepo = manager.getRepository(UserProgress);
      const dailyRepo = manager.getRepository(DailyActivity);

      let progress = await progressRepo.findOne({ where: { user_id: userId } });
      if (!progress) {
        progress = progressRepo.create({ user_id: userId });
        await progressRepo.save(progress);
      }

      const today = getTodayString();
      let todayActivity = await dailyRepo.findOne({
        where: { user_id: userId, activity_date: today },
      });
      if (!todayActivity) {
        todayActivity = dailyRepo.create({
          user_id: userId,
          activity_date: today,
        });
        await dailyRepo.save(todayActivity);
      }

      // Too soon after the previous session → nothing is recorded (blocks scripted spam).
      const now = new Date();
      if (
        progress.last_xp_at &&
        now.getTime() - new Date(progress.last_xp_at).getTime() < XP_COOLDOWN_MS
      ) {
        return {
          xp_gained: 0,
          level_up: false,
          new_level: progress.level,
          new_xp: progress.xp,
          streak_count: progress.streak_count,
          streak_updated: false,
          milestone_reached: false,
          streak_tier: getStreakTier(progress.streak_count).tier,
          throttled: true,
          capped: false,
        };
      }

      const rawXp = calculateXpGained(dto);
      const xpGained = Math.min(
        rawXp,
        Math.max(0, DAILY_XP_CAP - todayActivity.xp_earned),
      );
      if (xpGained > 0) progress.last_xp_at = now;

      // Capture the streak BEFORE any increment so milestone detection works.
      const oldStreak = progress.streak_count;
      let streakUpdated = false;
      if (progress.last_activity_date !== today) {
        if (progress.last_activity_date === getYesterdayString()) {
          progress.streak_count += 1;
        } else {
          progress.streak_count = 1;
        }
        progress.last_activity_date = today;
        streakUpdated = true;
        if (progress.streak_count > progress.longest_streak) {
          progress.longest_streak = progress.streak_count;
        }
      }

      const oldLevel = progress.level;
      progress.xp += xpGained;
      progress.level = getLevel(progress.xp);
      const levelUp = progress.level > oldLevel;
      const milestoneReached =
        streakUpdated &&
        STREAK_MILESTONES.includes(progress.streak_count) &&
        progress.streak_count > oldStreak;

      if (dto.type === 'flashcard_session') {
        progress.total_cards_studied += dto.cards_count ?? 0;
        todayActivity.cards_studied += dto.cards_count ?? 0;
      }
      if (dto.type === 'quiz_completion') {
        progress.total_quizzes_completed += 1;
        todayActivity.quizzes_completed += 1;
      }

      todayActivity.xp_earned += xpGained;

      await progressRepo.save(progress);
      await dailyRepo.save(todayActivity);

      return {
        xp_gained: xpGained,
        level_up: levelUp,
        new_level: progress.level,
        new_xp: progress.xp,
        streak_count: progress.streak_count,
        streak_updated: streakUpdated,
        milestone_reached: milestoneReached,
        streak_tier: getStreakTier(progress.streak_count).tier,
        throttled: false,
        capped: xpGained < rawXp,
      };
    });
  }

  /**
   * Pay out a daily challenge once its condition is met today (checked against the
   * server's own counters). Claiming the last one adds the all-challenges bonus.
   * Challenge XP is not added to today's xp_earned, so claims can't complete challenge 4.
   */
  async claimChallenge(
    userId: number,
    challengeId: number,
  ): Promise<ClaimChallengeResponseDto> {
    const challenge = DAILY_CHALLENGES.find((c) => c.id === challengeId);
    if (!challenge) throw new NotFoundException('Unknown challenge');

    return this.dataSource.transaction(async (manager) => {
      const progressRepo = manager.getRepository(UserProgress);
      const dailyRepo = manager.getRepository(DailyActivity);
      const today = getTodayString();
      const activity = await dailyRepo.findOne({
        where: { user_id: userId, activity_date: today },
        lock: { mode: 'pessimistic_write' },
      });
      if (!activity || !challenge.done(activity))
        throw new BadRequestException('Challenge not completed yet');
      const claimed = activity.claimed_challenges ?? [];
      if (claimed.includes(challengeId))
        throw new BadRequestException('Reward already claimed today');

      activity.claimed_challenges = [...claimed, challengeId];
      const bonus =
        activity.claimed_challenges.length === DAILY_CHALLENGES.length
          ? ALL_CHALLENGES_BONUS
          : 0;

      let progress = await progressRepo.findOne({ where: { user_id: userId } });
      if (!progress) progress = progressRepo.create({ user_id: userId });
      const oldLevel = progress.level;
      progress.xp += challenge.xp + bonus;
      progress.level = getLevel(progress.xp);

      await dailyRepo.save(activity);
      await progressRepo.save(progress);
      return {
        xp_gained: challenge.xp,
        bonus,
        new_xp: progress.xp,
        new_level: progress.level,
        level_up: progress.level > oldLevel,
        claimed: activity.claimed_challenges,
      };
    });
  }

  async getMyStats(userId: number): Promise<ProgressResponseDto> {
    const progress = await this.getOrCreateProgress(userId);
    const todayActivity = await this.getTodayActivity(userId);
    const bounds = getXpBounds(progress.level);
    const xpInLevel = progress.xp - bounds.current;
    const xpRange = bounds.next - bounds.current;
    const xpProgressPercent =
      xpRange > 0 ? Math.floor((xpInLevel / xpRange) * 100) : 100;

    return {
      xp: progress.xp,
      level: progress.level,
      streak_count: progress.streak_count,
      longest_streak: progress.longest_streak,
      total_cards_studied: progress.total_cards_studied,
      total_quizzes_completed: progress.total_quizzes_completed,
      xp_for_current_level: bounds.current,
      xp_to_next_level: bounds.next,
      xp_progress_percent: xpProgressPercent,
      streak_tier: getStreakTier(progress.streak_count),
      today: {
        cards_studied: todayActivity.cards_studied,
        quizzes_completed: todayActivity.quizzes_completed,
        xp_earned: todayActivity.xp_earned,
        claimed_challenges: todayActivity.claimed_challenges ?? [],
      },
    };
  }

  async getWeeklyActivity(userId: number): Promise<WeeklyActivityItemDto[]> {
    const today = new Date();
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(today.getDate() - 6);

    const startDate = sixDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    const activities = await this.dailyRepo.find({
      where: { user_id: userId, activity_date: Between(startDate, endDate) },
    });
    const activityMap = new Map(activities.map((a) => [a.activity_date, a]));

    const result: WeeklyActivityItemDto[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const activity = activityMap.get(dateStr);
      result.push({
        date: dateStr,
        day_label: DAY_LABELS[d.getDay()],
        xp_earned: activity?.xp_earned ?? 0,
        cards_studied: activity?.cards_studied ?? 0,
        quizzes_completed: activity?.quizzes_completed ?? 0,
      });
    }
    return result;
  }

  async getLeaderboard(): Promise<LeaderboardItemDto[]> {
    const rows = await this.progressRepo
      .createQueryBuilder('p')
      .leftJoin(User, 'u', 'u.id = p.user_id')
      .select([
        'p.user_id AS user_id',
        'p.xp AS xp',
        'p.level AS level',
        'p.streak_count AS streak_count',
        'u.email AS email',
      ])
      .orderBy('p.xp', 'DESC')
      .limit(10)
      .getRawMany<{
        user_id: number;
        xp: number;
        level: number;
        streak_count: number;
        email: string;
      }>();

    return rows.map((row, i) => {
      const email = row.email ?? 'Unknown';
      return {
        rank: i + 1,
        user_id: row.user_id,
        email,
        display_name: email.split('@')[0],
        xp: Number(row.xp),
        level: Number(row.level),
        streak_count: Number(row.streak_count),
      };
    });
  }
}
