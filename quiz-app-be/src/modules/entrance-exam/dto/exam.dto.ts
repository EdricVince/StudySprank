import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** The Entrance Exam is IELTS only. */
export type ExamType = 'ielts';

export class StartExamDto {
  /** Optional and only 'ielts' is accepted (kept so older clients still validate). */
  @IsIn(['ielts'])
  @IsOptional()
  exam_type?: ExamType;

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

  /** Re-sit a stored paper instead of generating a new one with the AI. */
  @IsInt()
  @Min(1)
  @IsOptional()
  paper_id?: number;
}

export class ExamAnswerDto {
  @IsInt()
  question_id: number;

  @IsInt()
  @IsOptional()
  selected?: number;

  @IsString()
  @MaxLength(20000)
  @IsOptional()
  written?: string;
}

export class SubmitExamDto {
  @IsIn(['ielts'])
  @IsOptional()
  exam_type?: ExamType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamAnswerDto)
  answers: ExamAnswerDto[];

  /** Id of the exam attempt returned by `generate`. */
  @IsString()
  @Matches(/^\d+$/)
  session_id: string;
}

/** A question as stored / graded on the server (includes the answer key). */
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

/** Per-question review shown after submission (answer key revealed only then). */
export interface ExamReviewItem {
  question_id: number;
  section: string;
  question: string;
  options: string[];
  selected: number | null;
  correct_answer: number;
  explanation: string;
}

export interface ExamWritingResponse {
  task: string;
  question: string;
  text: string;
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
  review?: ExamReviewItem[];
  writing_responses?: ExamWritingResponse[];
}

/** One row of the student's exam history. */
export interface ExamHistoryItem {
  attempt_id: number;
  paper_id: number;
  theme: string;
  score_percent: number | null;
  estimated_band: string | null;
  level: string | null;
  correct: number | null;
  total: number | null;
  submitted_at: Date | null;
}
