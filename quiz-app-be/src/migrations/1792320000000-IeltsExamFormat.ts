import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The IELTS mock test follows the real format: typed-answer questions (form / note / sentence /
 * summary completion), a rubric per run of questions, and a numeric overall band per sitting.
 *  - `exam_questions.instruction`: the rubric shared by a run of questions;
 *  - `exam_questions.accepted_answers`: spellings that count as right for typed answers;
 *  - `exam_attempts.overall_band`: the band shown on the student's Target band card. Sittings from
 *    before bands only have a range ("6.0–6.5"), so the middle of the range is used for them.
 *  - `user_profiles.target_band` is dropped: the target band is no longer typed in by the student,
 *    it is the overall band of their latest mock test.
 * Idempotent so it also succeeds where DB_SYNCHRONIZE already created the columns.
 */
export class IeltsExamFormat1792320000000 implements MigrationInterface {
  name = 'IeltsExamFormat1792320000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "exam_questions" ADD COLUMN IF NOT EXISTS "instruction" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_questions" ADD COLUMN IF NOT EXISTS "accepted_answers" jsonb NOT NULL DEFAULT '[]'`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempts" ADD COLUMN IF NOT EXISTS "overall_band" real`,
    );
    // "6.0–6.5" (en dash) → 6.25 → 6.5 (nearest half); "8.0–9.0" → 8.5; "1.0–2.5" → 2.0.
    await queryRunner.query(
      `UPDATE "exam_attempts"
          SET "overall_band" = round((
                split_part("estimated_band", '–', 1)::numeric
              + split_part("estimated_band", '–', 2)::numeric) / 2 * 2) / 2
        WHERE "overall_band" IS NULL
          AND "estimated_band" ~ '^[0-9.]+–[0-9.]+$'`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_profiles" DROP COLUMN IF EXISTS "target_band"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_profiles" ADD COLUMN IF NOT EXISTS "target_band" real`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_attempts" DROP COLUMN IF EXISTS "overall_band"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_questions" DROP COLUMN IF EXISTS "accepted_answers"`,
    );
    await queryRunner.query(
      `ALTER TABLE "exam_questions" DROP COLUMN IF EXISTS "instruction"`,
    );
  }
}
