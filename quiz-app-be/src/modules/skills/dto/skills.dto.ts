import {
  IsEnum,
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  ArrayNotEmpty,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type ReadingType = 'story' | 'ielts' | 'toeic' | 'academic' | 'news';
export type ListeningType =
  | 'conversation'
  | 'monologue'
  | 'ielts'
  | 'toeic'
  | 'lecture';
export type WritingType = 'ielts_task1' | 'ielts_task2' | 'toeic' | 'general';

export class GetReadingDto {
  @IsEnum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  @IsOptional()
  level?: CefrLevel;

  @IsEnum(['story', 'ielts', 'toeic', 'academic', 'news'])
  @IsOptional()
  type?: ReadingType;

  @IsString()
  @IsOptional()
  topic?: string;
}

class ReadingQuestionDto {
  @IsInt()
  correct: number;
}

export class SubmitReadingDto {
  @IsString()
  passage_id: string;

  @IsArray()
  @IsInt({ each: true })
  answers: number[];

  @IsArray()
  @ArrayNotEmpty() // an empty list made the score NaN (division by zero)
  @ValidateNested({ each: true })
  @Type(() => ReadingQuestionDto)
  questions: ReadingQuestionDto[];
}

export class GetListeningDto {
  @IsEnum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  @IsOptional()
  level?: CefrLevel;

  @IsEnum(['conversation', 'monologue', 'ielts', 'toeic', 'lecture'])
  @IsOptional()
  type?: ListeningType;

  @IsString()
  @IsOptional()
  topic?: string;
}

export class GetWritingPromptDto {
  @IsEnum(['ielts_task1', 'ielts_task2', 'toeic', 'general'])
  @IsOptional()
  type?: WritingType;

  @IsEnum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  @IsOptional()
  level?: CefrLevel;
}

export class SubmitWritingDto {
  @IsString()
  prompt: string;

  @IsString()
  essay: string;

  @IsEnum(['ielts_task1', 'ielts_task2', 'toeic', 'general'])
  type: WritingType;

  @IsEnum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  @IsOptional()
  level?: CefrLevel;

  @IsInt()
  @Min(0)
  time_taken_seconds: number;
}

export class EvaluateSpeakingDto {
  @IsString()
  target_text: string;

  @IsString()
  spoken_transcript: string;

  @IsEnum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  @IsOptional()
  level?: CefrLevel;
}

export class GetSpeakingPromptDto {
  @IsEnum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
  @IsOptional()
  level?: CefrLevel;

  @IsEnum(['shadowing', 'speaking_test'])
  @IsOptional()
  mode?: 'shadowing' | 'speaking_test';
}
