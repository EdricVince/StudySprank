import { IsObject, IsString, MaxLength, MinLength } from 'class-validator';

export class SaveStudyPlanDto {
  @IsString() @MinLength(1) @MaxLength(255) name: string;

  /** The answers the student gave the planner. */
  @IsObject() form: Record<string, unknown>;

  /** The plan the AI returned, month by month. */
  @IsObject() plan: Record<string, unknown>;
}
