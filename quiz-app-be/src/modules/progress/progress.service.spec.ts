import { ProgressService } from './progress.service';
import { UserProgress } from './entities/user-progress.entity';
import { DailyActivity } from './entities/daily-activity.entity';
import { LogActivityDto } from './dto/log-activity.dto';

const today = new Date().toISOString().split('T')[0];
const yesterday = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
})();

/**
 * Build a ProgressService whose transaction runs against in-memory repo mocks,
 * seeded with the given existing progress/daily rows (null → the service
 * creates fresh ones with column defaults).
 */
function build(
  progress: Partial<UserProgress> | null,
  daily: Partial<DailyActivity> | null,
) {
  const progressRepo = {
    findOne: jest.fn().mockResolvedValue(progress),
    create: jest.fn((x: any) => ({
      user_id: x.user_id,
      xp: 0,
      level: 1,
      streak_count: 0,
      longest_streak: 0,
      last_activity_date: null,
      total_cards_studied: 0,
      total_quizzes_completed: 0,
    })),
    save: jest.fn(async (x: any) => x),
  };
  const dailyRepo = {
    findOne: jest.fn().mockResolvedValue(daily),
    create: jest.fn((x: any) => ({
      user_id: x.user_id,
      activity_date: x.activity_date,
      xp_earned: 0,
      cards_studied: 0,
      quizzes_completed: 0,
    })),
    save: jest.fn(async (x: any) => x),
  };
  const manager = {
    getRepository: (e: unknown) =>
      e === UserProgress ? progressRepo : dailyRepo,
  };
  const dataSource = { transaction: jest.fn((cb: any) => cb(manager)) };
  return new ProgressService(
    progressRepo as any,
    dailyRepo as any,
    {} as any,
    {} as any,
    dataSource as any,
  );
}

const dto = (d: Partial<LogActivityDto>) => d as LogActivityDto;

describe('ProgressService.logActivity (gamification)', () => {
  it('awards flashcard XP (5/card) and starts a streak for a brand-new user', async () => {
    const res = await build(null, null).logActivity(
      1,
      dto({ type: 'flashcard_session', cards_count: 10 }),
    );
    expect(res.xp_gained).toBe(50);
    expect(res.new_xp).toBe(50);
    expect(res.new_level).toBe(1);
    expect(res.streak_count).toBe(1);
    expect(res.streak_updated).toBe(true);
    expect(res.streak_tier).toBe('starter');
  });

  it('caps flashcard XP at 100', async () => {
    const res = await build(
      {
        user_id: 1,
        xp: 0,
        level: 1,
        streak_count: 0,
        longest_streak: 0,
        last_activity_date: null,
      } as any,
      null,
    ).logActivity(1, dto({ type: 'flashcard_session', cards_count: 50 }));
    expect(res.xp_gained).toBe(100);
  });

  it('scores quiz XP as 25 + floor(score/100 * 25)', async () => {
    const res = await build(
      {
        user_id: 1,
        xp: 0,
        level: 1,
        streak_count: 0,
        longest_streak: 0,
        last_activity_date: null,
      } as any,
      null,
    ).logActivity(1, dto({ type: 'quiz_completion', score: 80 }));
    expect(res.xp_gained).toBe(45); // 25 + floor(0.8*25)=25+20
  });

  it('levels up when XP crosses a threshold', async () => {
    const res = await build(
      {
        user_id: 1,
        xp: 90,
        level: 1,
        streak_count: 1,
        longest_streak: 1,
        last_activity_date: today,
      } as any,
      {
        user_id: 1,
        activity_date: today,
        xp_earned: 0,
        cards_studied: 0,
        quizzes_completed: 0,
      } as any,
    ).logActivity(1, dto({ type: 'flashcard_session', cards_count: 10 })); // +50 → 140
    expect(res.new_xp).toBe(140);
    expect(res.new_level).toBe(2);
    expect(res.level_up).toBe(true);
  });

  it('continues a streak from yesterday and flags the 10-day milestone', async () => {
    const res = await build(
      {
        user_id: 1,
        xp: 500,
        level: 4,
        streak_count: 9,
        longest_streak: 9,
        last_activity_date: yesterday,
      } as any,
      null,
    ).logActivity(1, dto({ type: 'flashcard_session', cards_count: 1 }));
    expect(res.streak_count).toBe(10);
    expect(res.streak_updated).toBe(true);
    expect(res.milestone_reached).toBe(true);
    expect(res.streak_tier).toBe('bronze');
  });

  it('resets the streak when the last activity was not yesterday', async () => {
    const res = await build(
      {
        user_id: 1,
        xp: 500,
        level: 4,
        streak_count: 9,
        longest_streak: 9,
        last_activity_date: '2020-01-01',
      } as any,
      null,
    ).logActivity(1, dto({ type: 'flashcard_session', cards_count: 1 }));
    expect(res.streak_count).toBe(1);
  });

  it('does not bump the streak twice on the same day', async () => {
    const res = await build(
      {
        user_id: 1,
        xp: 500,
        level: 4,
        streak_count: 5,
        longest_streak: 5,
        last_activity_date: today,
      } as any,
      {
        user_id: 1,
        activity_date: today,
        xp_earned: 0,
        cards_studied: 0,
        quizzes_completed: 0,
      } as any,
    ).logActivity(1, dto({ type: 'quiz_completion', score: 100 }));
    expect(res.streak_updated).toBe(false);
    expect(res.streak_count).toBe(5);
    expect(res.xp_gained).toBe(50); // 25 + 25
  });
});
