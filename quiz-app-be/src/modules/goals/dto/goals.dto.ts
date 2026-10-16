import {
  IsOptional,
  IsInt,
  IsString,
  IsBoolean,
  MinLength,
  Min,
  Max,
} from 'class-validator';

export class UpdateGoalSettingsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  target_cards?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  target_quizzes?: number;
}

export class CreateCustomGoalDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateCustomGoalDto {
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class DailyGoalItemDto {
  type: string;
  label: string;
  current: number;
  target: number;
  unit: string;
}

export class WeeklyChallengeDto {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  completed: boolean;
}

export class MilestoneDto {
  id: string;
  title: string;
  description: string;
  current: number;
  target: number;
  completed: boolean;
}

export class CustomGoalDto {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
}

export class GoalsResponseDto {
  daily_goals: DailyGoalItemDto[];
  weekly_challenges: WeeklyChallengeDto[];
  milestones: MilestoneDto[];
  custom_goals: CustomGoalDto[];
}
