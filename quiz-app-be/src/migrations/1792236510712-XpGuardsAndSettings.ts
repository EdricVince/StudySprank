import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * XP anti-spam cooldown, daily-challenge claims and the app_settings table (AI key).
 * Idempotent (IF NOT EXISTS) so it also succeeds where DB_SYNCHRONIZE already added them.
 */
export class XpGuardsAndSettings1792236510712 implements MigrationInterface {
  name = 'XpGuardsAndSettings1792236510712';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "app_settings" ("key" character varying(100) NOT NULL, "value" text NOT NULL, "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_975c2db59c65c05fd9c6b63a2ab" PRIMARY KEY ("key"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_progress" ADD COLUMN IF NOT EXISTS "last_xp_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_activities" ADD COLUMN IF NOT EXISTS "claimed_challenges" jsonb NOT NULL DEFAULT '[]'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "daily_activities" DROP COLUMN "claimed_challenges"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_progress" DROP COLUMN "last_xp_at"`,
    );
    await queryRunner.query(`DROP TABLE "app_settings"`);
  }
}
