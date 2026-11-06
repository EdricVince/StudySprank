import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  SESSION_KINDS,
  SESSION_SOURCES,
} from '../entities/learning-session.entity';
import type {
  SessionKind,
  SessionSource,
} from '../entities/learning-session.entity';

/** Most words one session may carry (a typing round can run through a few hundred). */
export const MAX_SESSION_WORDS = 300;

export class SessionWordDto {
  @IsString() @MinLength(1) @MaxLength(500) term: string;
  @IsString() @MaxLength(2000) meaning: string;
  @IsOptional() @IsString() @MaxLength(2000) example?: string;
  @IsOptional() @IsBoolean() is_correct?: boolean;
}

export class CreateLearningSessionDto {
  @IsIn(SESSION_KINDS) kind: SessionKind;
  @IsString() @MinLength(1) @MaxLength(60) mode_id: string;
  @IsString() @MinLength(1) @MaxLength(120) mode_name: string;
  @IsIn(SESSION_SOURCES) source: SessionSource;
  @IsString() @MinLength(1) @MaxLength(255) title: string;

  @IsOptional() @IsInt() @Min(1) deck_id?: number;
  @IsOptional() @IsInt() @Min(1) vocab_set_id?: number;

  @IsOptional() @IsString() @MaxLength(8) learning_lang?: string;
  @IsOptional() @IsString() @MaxLength(8) meaning_lang?: string;

  @IsOptional() @IsInt() @Min(0) @Max(1_000_000) score?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100_000) xp_earned?: number;
  @IsOptional() @IsInt() @Min(0) @Max(86_400) duration_seconds?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_SESSION_WORDS)
  @ValidateNested({ each: true })
  @Type(() => SessionWordDto)
  words: SessionWordDto[];
}

export class ListLearningSessionsQuery {
  @IsOptional() @IsIn(SESSION_KINDS) kind?: SessionKind;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) offset?: number;
}
