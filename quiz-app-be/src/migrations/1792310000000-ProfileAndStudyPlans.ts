import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Two things the app used to keep only in the browser, now in the database:
 *  - `user_profiles`: the profile card (handle, phone, title, location, bio, social links), the
 *    IELTS target band and the settings page (study / notification / privacy preferences);
 *  - `study_plans`: the plans made with the AI study planner.
 * Not reachable from the public Supabase API (RLS on, no grants for anon/authenticated).
 * Idempotent so it also succeeds where DB_SYNCHRONIZE already created the tables.
 */
export class ProfileAndStudyPlans1792310000000 implements MigrationInterface {
  name = 'ProfileAndStudyPlans1792310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "user_profiles" (
        "user_id" integer NOT NULL,
        "username" character varying(40),
        "phone" character varying(30),
        "title" character varying(120),
        "location" character varying(120),
        "bio" text,
        "social_links" jsonb NOT NULL DEFAULT '[]',
        "target_band" real,
        "preferences" jsonb NOT NULL DEFAULT '{}',
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_profiles" PRIMARY KEY ("user_id")
      )`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "study_plans" (
        "id" uuid NOT NULL,
        "user_id" integer NOT NULL,
        "name" character varying(255) NOT NULL,
        "form" jsonb NOT NULL DEFAULT '{}',
        "plan" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_study_plans" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_study_plans_user" ON "study_plans" ("user_id", "created_at")`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_user_profiles_user') THEN
          ALTER TABLE "user_profiles" ADD CONSTRAINT "FK_user_profiles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_study_plans_user') THEN
          ALTER TABLE "study_plans" ADD CONSTRAINT "FK_study_plans_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;
        ALTER TABLE "study_plans" ENABLE ROW LEVEL SECURITY;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          REVOKE ALL ON "user_profiles", "study_plans" FROM anon;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          REVOKE ALL ON "user_profiles", "study_plans" FROM authenticated;
        END IF;
      END $$`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "study_plans"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "user_profiles"`);
  }
}
