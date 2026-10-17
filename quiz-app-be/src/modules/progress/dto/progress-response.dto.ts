export class TodayActivityDto {
  cards_studied: number;
  quizzes_completed: number;
  xp_earned: number;
  claimed_challenges: number[];
}

export class WeeklyActivityItemDto {
  date: string; // YYYY-MM-DD
  day_label: string; // Mon, Tue, ...
  xp_earned: number;
  cards_studied: number;
  quizzes_completed: number;
}

export class StreakTierDto {
  tier: string;
  label: string;
  color: string;
  next_milestone: number | null;
  days_to_next: number | null;
}

export class ProgressResponseDto {
  xp: number;
  level: number;
  streak_count: number;
  longest_streak: number;
  total_cards_studied: number;
  total_quizzes_completed: number;
  xp_for_current_level: number;
  xp_to_next_level: number;
  xp_progress_percent: number;
  streak_tier: StreakTierDto;
  today: TodayActivityDto;
}
