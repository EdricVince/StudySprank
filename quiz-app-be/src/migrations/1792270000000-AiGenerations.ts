import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `ai_generations`: every AI result (generated lessons / vocabulary sets / tests, content scans,
 * schedules, writing and speaking evaluations, Battle Mode questions) with the request behind it,
 * plus the `ai_generation_feed` view for reading it in Supabase. Not reachable from the public
 * Supabase API (RLS on, no grants for anon/authenticated); the backend's own connection is unaffected.
 * Idempotent so it also succeeds where DB_SYNCHRONIZE already created the table.
 */
export class AiGenerations1792270000000 implements MigrationInterface {
  name = 'AiGenerations1792270000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "ai_generations" (
        "id" SERIAL NOT NULL,
        "user_id" integer,
        "user_role" integer,
        "kind" character varying(40) NOT NULL,
        "input" jsonb NOT NULL DEFAULT '{}',
        "output" jsonb NOT NULL DEFAULT '{}',
        "model" character varying(60),
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_generations" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ai_generations_kind" ON "ai_generations" ("kind", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_ai_generations_user" ON "ai_generations" ("user_id", "created_at")`,
    );
    await queryRunner.query(
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_ai_generations_user') THEN ALTER TABLE "ai_generations" ADD CONSTRAINT "FK_ai_generations_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION; END IF; END $$`,
    );
    await queryRunner.query(
      `CREATE OR REPLACE VIEW "ai_generation_feed" AS
        SELECT g.id, g.created_at, g.kind, g.model,
               u.email AS user_email, COALESCE(u.name, split_part(u.email, '@', 1)) AS user_name,
               g.user_role, g.input, g.output
          FROM "ai_generations" g
          LEFT JOIN "users" u ON u.id = g.user_id
         ORDER BY g.created_at DESC`,
    );
    await queryRunner.query(
      `DO $$ BEGIN ALTER TABLE "ai_generations" ENABLE ROW LEVEL SECURITY; IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN REVOKE ALL ON "ai_generations", "ai_generation_feed" FROM anon; END IF; IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN REVOKE ALL ON "ai_generations", "ai_generation_feed" FROM authenticated; END IF; END $$`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS "ai_generation_feed"`);
    await queryRunner.query(
      `ALTER TABLE "ai_generations" DROP CONSTRAINT IF EXISTS "FK_ai_generations_user"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_generations_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_ai_generations_kind"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_generations"`);
  }
}
