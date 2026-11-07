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

  /** Ignored: the length of the exam is fixed by the IELTS format (kept so older clients still validate). */
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

  /** Language of the feedback and recommendations (defaults to English). */
  @IsIn(['en', 'vi', 'zh'])
  @IsOptional()
  language?: 'en' | 'vi' | 'zh';
}

/** A question as stored / graded on the server (includes the answer key). */
export interface ExamQuestion {
  id: number;
  section: string;
  type: string;
  passage?: string | null;
  /** The rubric shared by a run of questions ("Write NO MORE THAN TWO WORDS…"). */
  instruction?: string;
  question: string;
  options: string[];
  /** Index of the right option; -1 for typed-answer and Writing questions. */
  correct_answer: number;
  /** Typed-answer questions: every spelling that counts as right (server-side only). */
  accepted_answers?: string[];
  explanation: string;
}

/** Per-question review shown after submission (answer key revealed only then). */
export interface ExamReviewItem {
  question_id: number;
  section: string;
  type: string;
  question: string;
  options: string[];
  selected: number | null;
  /** What was typed, for typed-answer questions. */
  written: string | null;
  is_correct: boolean;
  correct_answer: number;
  accepted_answers: string[];
  explanation: string;
}

/** The examiner-style feedback on one Writing task. */
export interface ExamWritingFeedback {
  task: string;
  /** Band for the task (mean of the four criteria, to the nearest half band). */
  band: number;
  words: number;
  criteria: { key: string; band: number; comment: string }[];
  strengths: string[];
  improvements: string[];
}

export interface ExamWritingResponse {
  task: string;
  question: string;
  text: string;
}

/** Listening / Reading / Writing as scored on the IELTS 0–9 scale. */
export interface ExamSkillScore {
  skill: 'Listening' | 'Reading' | 'Writing';
  correct: number | null;
  total: number | null;
  band: number | null;
}

export interface ExamResult {
  total: number;
  correct: number;
  score_percent: number;
  /** Overall band as text ("6.5"); older attempts hold a range ("6.0–6.5"). */
  estimated_band: string;
  estimated_score: string;
  level: string;
  /** Overall IELTS band (null when nothing could be scored). Missing on attempts from before bands. */
  overall_band?: number | null;
  skills?: ExamSkillScore[];
  breakdown: { section: string; correct: number; total: number }[];
  recommendations: string[];
  weak_areas: string[];
  review?: ExamReviewItem[];
  writing_responses?: ExamWritingResponse[];
  writing_feedback?: ExamWritingFeedback[];
}

/** One row of the student's exam history. */
export interface ExamHistoryItem {
  attempt_id: number;
  paper_id: number;
  theme: string;
  score_percent: number | null;
  estimated_band: string | null;
  overall_band: number | null;
  level: string | null;
  correct: number | null;
  total: number | null;
  submitted_at: Date | null;
}
