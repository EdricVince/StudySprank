import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsArray,
  Min,
  Max,
  IsNumber,
} from 'class-validator';

export type CefrLevel = 'beginner' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type TargetExam = 'IELTS' | 'General';

export class GenerateScheduleDto {
  @IsEnum(['beginner', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  current_level: CefrLevel;

  @IsEnum(['IELTS', 'General'])
  target_exam: TargetExam;

  @IsString()
  @IsOptional()
  target_band?: string;

  @IsInt()
  @Min(2)
  @Max(40)
  weekly_hours: number;

  @IsArray()
  @IsOptional()
  focus_areas?: string[];

  @IsString()
  @IsOptional()
  target_date?: string;
}

export interface DaySchedule {
  day: string;
  skill: string;
  topic: string;
  is_rest: boolean;
}

export interface WeekSummary {
  week_in_month: number;
  focus: string;
  daily_schedule: DaySchedule[];
}

export interface MonthPlan {
  month: number;
  theme: string;
  objective: string;
  total_hours: number;
  week_summaries: WeekSummary[];
}

export class ExtendScheduleDto {
  @IsString()
  current_level: string;

  @IsString()
  target_exam: string;

  @IsString()
  @IsOptional()
  target_band?: string;

  @IsInt()
  @Min(2)
  @Max(40)
  weekly_hours: number;

  @IsNumber()
  next_month_number: number;

  @IsArray()
  existing_themes: string[];

  @IsArray()
  @IsOptional()
  focus_areas?: string[];
}

export interface StudyPlan {
  level: string;
  target: string;
  months_needed: number;
  monthly_plan: MonthPlan[];
  tips: string[];
  resources: { name: string; type: string; description: string }[];
}
