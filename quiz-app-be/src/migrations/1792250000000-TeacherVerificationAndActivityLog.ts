import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Teacher verification workflow (pending → approved/rejected) and the activity trail.
 *
 * - users: teacher_status / teacher_organization / teacher_reject_reason / teacher_reviewed_at.
 *   Existing teachers keep working if they were verified; unverified ones become 'pending'.
 * - activity_logs: who created/changed what and when.
 * - Views for browsing in the Supabase table editor: activity_feed, teacher_overview.
 * - The new objects are locked away from Supabase's public API roles (anon / authenticated);
 *   only the backend's own database user can read them.
 *
 * Idempotent (IF NOT EXISTS / OR REPLACE) so it also succeeds where DB_SYNCHRONIZE already
 * created the columns or table.
 */
export class TeacherVerificationAndActivityLog1792250000000
  implements MigrationInterface
{
  name = 'TeacherVerificationAndActivityLog1792250000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "teacher_status" character varying(20) NOT NULL DEFAULT 'none'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "teacher_organization" character varying(150)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "teacher_reject_reason" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "teacher_reviewed_at" TIMESTAMP`,
    );
    // Teachers created before this change: verified ones stay approved, the rest await review.
    await queryRunner.query(
      `UPDATE "users" SET "teacher_status" = CASE WHEN "is_verified" THEN 'approved' ELSE 'pending' END WHERE "role_id" = 2 AND "teacher_status" = 'none'`,
    );

    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "activity_logs" ("id" SERIAL NOT NULL, "actor_id" integer, "actor_role" integer, "action" character varying(60) NOT NULL, "entity_type" character varying(40) NOT NULL, "entity_id" integer, "class_id" integer, "summary" text NOT NULL DEFAULT '', "metadata" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_activity_logs" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_activity_logs_created" ON "activity_logs" ("created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_activity_logs_actor" ON "activity_logs" ("actor_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_activity_logs_class" ON "activity_logs" ("class_id", "created_at")`,
    );
    await queryRunner.query(
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_activity_logs_actor') THEN ALTER TABLE "activity_logs" ADD CONSTRAINT "FK_activity_logs_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION; END IF; END $$`,
    );

    // Readable feed: actor and class names resolved.
    await queryRunner.query(
      `CREATE OR REPLACE VIEW "activity_feed" AS SELECT l."id", l."created_at", l."action", l."summary", l."entity_type", l."entity_id", l."actor_id", COALESCE(u."name", u."email") AS "actor_name", u."email" AS "actor_email", l."actor_role", l."class_id", c."name" AS "class_name", c."class_code", l."metadata" FROM "activity_logs" l LEFT JOIN "users" u ON u."id" = l."actor_id" LEFT JOIN "classes" c ON c."id" = l."class_id"`,
    );
    // One row per teacher: approval state and how much they have created.
    await queryRunner.query(
      `CREATE OR REPLACE VIEW "teacher_overview" AS SELECT u."id", u."email", u."name", u."is_active", u."teacher_status", u."teacher_organization", u."teacher_reviewed_at", u."created_at", (SELECT COUNT(*)::int FROM "classes" c WHERE c."teacher_id" = u."id") AS "classes", (SELECT COUNT(*)::int FROM "class_enrollments" e JOIN "classes" c ON c."id" = e."class_id" WHERE c."teacher_id" = u."id") AS "students", (SELECT COUNT(*)::int FROM "tests" t WHERE t."teacher_id" = u."id") AS "tests", (SELECT COUNT(*)::int FROM "assignments" a WHERE a."teacher_id" = u."id") AS "assignments", (SELECT COUNT(*)::int FROM "lessons" ls WHERE ls."teacher_id" = u."id") AS "lessons", (SELECT COUNT(*)::int FROM "vocab_sets" v WHERE v."teacher_id" = u."id") AS "vocab_sets", (SELECT MAX(l."created_at") FROM "activity_logs" l WHERE l."actor_id" = u."id") AS "last_activity" FROM "users" u WHERE u."role_id" = 2`,
    );

    // Supabase exposes the public schema over its REST API to the anon/authenticated
    // roles. Keep the activity trail and teacher data away from them.
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "activity_logs" ENABLE ROW LEVEL SECURITY; IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "activity_logs", "activity_feed", "teacher_overview" FROM anon; END IF; IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "activity_logs", "activity_feed", "teacher_overview" FROM authenticated; END IF; END $$`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS "teacher_overview"`);
    await queryRunner.query(`DROP VIEW IF EXISTS "activity_feed"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_logs"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "teacher_reviewed_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "teacher_reject_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "teacher_organization"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "teacher_status"`,
    );
  }
}
