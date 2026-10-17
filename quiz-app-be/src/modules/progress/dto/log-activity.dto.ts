import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';

export type ActivityType = 'flashcard_session' | 'quiz_completion';

export class LogActivityDto {
  @IsEnum(['flashcard_session', 'quiz_completion'])
  type: ActivityType;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  cards_count?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;
}

export class LogActivityResponseDto {
  xp_gained: number;
  level_up: boolean;
  new_level: number;
  new_xp: number;
  streak_count: number;
  streak_updated: boolean;
  milestone_reached: boolean;
  streak_tier: string;
  /** True when the request came within the cooldown and nothing was recorded. */
  throttled: boolean;
  /** True when the daily XP cap reduced the reward. */
  capped: boolean;
}

export class ClaimChallengeResponseDto {
  xp_gained: number;
  bonus: number;
  new_xp: number;
  new_level: number;
  level_up: boolean;
  claimed: number[];
}
