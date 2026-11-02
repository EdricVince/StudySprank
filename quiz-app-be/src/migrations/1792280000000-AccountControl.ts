import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Account control, visible in the database exactly as the admin sees it:
 *  - users.teacher_applied_at / teacher_reviewed_by / last_login_at: when a teacher applied, which
 *    admin decided, and each account's last sign-in;
 *  - view `user_accounts`: one row per account (role, status, verification, reviewer, last login,
 *    class / content counts);
 *  - view `teacher_applications`: one row per teacher application with the full decision trail.
 * The audit trail of every account action stays in `activity_logs` / `activity_feed`
 * (filter entity_type = 'user' and entity_id = the account id).
 * Not reachable from the public Supabase API (no grants for anon/authenticated).
 * Idempotent so it also succeeds where DB_SYNCHRONIZE already added the columns.
 */
export class AccountControl1792280000000 implements MigrationInterface {
  name = 'AccountControl1792280000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "teacher_applied_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "teacher_reviewed_by" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_users_teacher_reviewed_by') THEN ALTER TABLE "users" ADD CONSTRAINT "FK_users_teacher_reviewed_by" FOREIGN KEY ("teacher_reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION; END IF; END $$`,
    );

    // Existing teachers: applied when the account was created; the reviewer is the admin who
    // made the latest decision according to the activity log (when there is one).
    await queryRunner.query(
      `UPDATE "users" SET "teacher_applied_at" = "created_at" WHERE "role_id" = 2 AND "teacher_applied_at" IS NULL`,
    );
    await queryRunner.query(
      `UPDATE "users" u SET "teacher_reviewed_by" = (
         SELECT l."actor_id" FROM "activity_logs" l
          WHERE l."action" = 'teacher.review' AND l."entity_id" = u."id" AND l."actor_id" IS NOT NULL
          ORDER BY l."id" DESC LIMIT 1)
        WHERE u."role_id" = 2 AND u."teacher_reviewed_at" IS NOT NULL AND u."teacher_reviewed_by" IS NULL`,
    );
    // Best available "last sign-in" for accounts that existed before this column: their newest session.
    await queryRunner.query(
      `UPDATE "users" u SET "last_login_at" = (SELECT MAX(t."created_at") FROM "refresh_tokens" t WHERE t."user_id" = u."id") WHERE u."last_login_at" IS NULL`,
    );

    await queryRunner.query(
      `CREATE OR REPLACE VIEW "user_accounts" AS
        SELECT u."id", u."email", u."name",
               CASE u."role_id" WHEN 3 THEN 'admin' WHEN 2 THEN 'teacher' ELSE 'student' END AS "role",
               u."is_active", u."is_verified", u."teacher_status", u."teacher_organization",
               (u."teacher_card_image" IS NOT NULL) AS "has_teacher_card",
               u."teacher_applied_at", u."teacher_reviewed_at",
               r."email" AS "teacher_reviewed_by_email", u."teacher_reject_reason",
               u."created_at", u."last_login_at",
               COALESCE(p."xp", 0) AS "xp",
               (SELECT COUNT(*)::int FROM "classes" c WHERE c."teacher_id" = u."id") AS "classes_owned",
               (SELECT COUNT(*)::int FROM "class_enrollments" e WHERE e."student_id" = u."id") AS "classes_joined"
          FROM "users" u
          LEFT JOIN "users" r ON r."id" = u."teacher_reviewed_by"
          LEFT JOIN "user_progress" p ON p."user_id" = u."id"
         ORDER BY u."created_at" DESC`,
    );
    await queryRunner.query(
      `CREATE OR REPLACE VIEW "teacher_applications" AS
        SELECT u."id", u."email", u."name", u."teacher_organization" AS "organization",
               u."teacher_status" AS "status", u."is_active",
               (u."teacher_card_image" IS NOT NULL) AS "has_document",
               u."created_at" AS "registered_at", u."teacher_applied_at" AS "applied_at",
               u."teacher_reviewed_at" AS "decided_at", r."email" AS "decided_by_email",
               u."teacher_reject_reason" AS "reject_reason", u."last_login_at",
               (SELECT COUNT(*)::int FROM "activity_logs" l WHERE l."action" = 'teacher.review' AND l."entity_id" = u."id") AS "decisions",
               (SELECT COUNT(*)::int FROM "activity_logs" l WHERE l."action" IN ('teacher.apply', 'teacher.resubmit') AND l."entity_id" = u."id") AS "submissions"
          FROM "users" u
          LEFT JOIN "users" r ON r."id" = u."teacher_reviewed_by"
         WHERE u."role_id" = 2
         ORDER BY CASE u."teacher_status" WHEN 'pending' THEN 0 ELSE 1 END, u."created_at" DESC`,
    );
    await queryRunner.query(
      `DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "user_accounts", "teacher_applications" FROM anon; END IF; IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "user_accounts", "teacher_applications" FROM authenticated; END IF; END $$`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS "teacher_applications"`);
    await queryRunner.query(`DROP VIEW IF EXISTS "user_accounts"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_teacher_reviewed_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "last_login_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "teacher_reviewed_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "teacher_applied_at"`,
    );
  }
}
