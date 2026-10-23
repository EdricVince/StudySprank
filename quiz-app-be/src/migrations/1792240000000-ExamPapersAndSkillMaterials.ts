import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Persists AI-generated content: IELTS exam papers/questions/attempts (Entrance Exam)
 * and the exercises generated on the Skills pages. Idempotent (IF NOT EXISTS) so it also
 * succeeds where DB_SYNCHRONIZE already created the tables.
 */
export class ExamPapersAndSkillMaterials1792240000000
  implements MigrationInterface
{
  name = 'ExamPapersAndSkillMaterials1792240000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "exam_papers" ("id" SERIAL NOT NULL, "exam_type" character varying(20) NOT NULL DEFAULT 'ielts', "theme" text NOT NULL, "variant" integer NOT NULL DEFAULT '0', "time_limit" integer NOT NULL DEFAULT '30', "format" jsonb NOT NULL DEFAULT '[]', "created_by" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_exam_papers" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "exam_questions" ("id" SERIAL NOT NULL, "paper_id" integer NOT NULL, "position" integer NOT NULL, "section" character varying(60) NOT NULL, "type" character varying(40) NOT NULL, "passage" text, "question" text NOT NULL, "options" jsonb NOT NULL DEFAULT '[]', "correct_answer" integer NOT NULL DEFAULT '-1', "explanation" text NOT NULL DEFAULT '', CONSTRAINT "PK_exam_questions" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_exam_questions_paper" ON "exam_questions" ("paper_id", "position")`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "exam_attempts" ("id" SERIAL NOT NULL, "paper_id" integer NOT NULL, "user_id" integer NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'in_progress', "answers" jsonb NOT NULL DEFAULT '[]', "result" jsonb, "score_percent" integer, "estimated_band" character varying(20), "started_at" TIMESTAMP NOT NULL DEFAULT now(), "submitted_at" TIMESTAMP, CONSTRAINT "PK_exam_attempts" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_exam_attempts_user" ON "exam_attempts" ("user_id", "submitted_at")`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "skill_materials" ("id" SERIAL NOT NULL, "skill" character varying(20) NOT NULL, "kind" character varying(40) NOT NULL, "level" character varying(4), "topic" text, "content" jsonb NOT NULL, "created_by" integer, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_skill_materials" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_skill_materials_skill" ON "skill_materials" ("skill", "kind", "level")`,
    );

    // Foreign keys (guarded: ADD CONSTRAINT has no IF NOT EXISTS).
    await queryRunner.query(
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_exam_papers_created_by') THEN ALTER TABLE "exam_papers" ADD CONSTRAINT "FK_exam_papers_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION; END IF; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_exam_questions_paper') THEN ALTER TABLE "exam_questions" ADD CONSTRAINT "FK_exam_questions_paper" FOREIGN KEY ("paper_id") REFERENCES "exam_papers"("id") ON DELETE CASCADE ON UPDATE NO ACTION; END IF; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_exam_attempts_paper') THEN ALTER TABLE "exam_attempts" ADD CONSTRAINT "FK_exam_attempts_paper" FOREIGN KEY ("paper_id") REFERENCES "exam_papers"("id") ON DELETE CASCADE ON UPDATE NO ACTION; END IF; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_exam_attempts_user') THEN ALTER TABLE "exam_attempts" ADD CONSTRAINT "FK_exam_attempts_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION; END IF; END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_skill_materials_created_by') THEN ALTER TABLE "skill_materials" ADD CONSTRAINT "FK_skill_materials_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION; END IF; END $$`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "skill_materials"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exam_attempts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exam_questions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "exam_papers"`);
  }
}
