import {
  IsEnum,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';

export type ExamType = 'ielts' | 'toeic' | 'toefl';

export class StartExamDto {
  @IsEnum(['ielts', 'toeic', 'toefl'])
  exam_type: ExamType;

  @IsInt()
  @Min(10)
  @Max(40)
  @IsOptional()
  question_count?: number;

  @IsInt()
  @Min(0)
  @Max(17)
  @IsOptional()
  variant?: number;
}

export class SubmitExamDto {
  @IsEnum(['ielts', 'toeic', 'toefl'])
  exam_type: ExamType;

  @IsArray()
  answers: { question_id: number; selected?: number; written?: string }[];

  @IsString()
  session_id: string;
}

export interface ExamQuestion {
  id: number;
  section: string;
  type: string;
  passage?: string | null;
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

export interface ExamResult {
  total: number;
  correct: number;
  score_percent: number;
  estimated_band: string;
  estimated_score: string;
  level: string;
  breakdown: { section: string; correct: number; total: number }[];
  recommendations: string[];
  weak_areas: string[];
  review?: {
    question_id: number;
    correct_answer: number;
    explanation: string;
  }[];
}
