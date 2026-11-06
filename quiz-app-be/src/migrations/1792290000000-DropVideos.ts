import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Video is no longer a feature of the platform: nothing in the API or the web app reads or writes
 * the `videos` table any more, so it is removed from the database (Supabase included).
 * No CASCADE on purpose: if anything unexpected still depends on the table the migration fails
 * instead of silently dropping it.
 * `down` restores the empty table as the baseline migration created it.
 */
export class DropVideos1792290000000 implements MigrationInterface {
  name = 'DropVideos1792290000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "videos"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "videos" ("id" SERIAL NOT NULL, "teacher_id" integer NOT NULL, "class_id" integer, "title" character varying NOT NULL, "description" text, "video_url" text NOT NULL, "lesson_name" text, "duration" integer NOT NULL DEFAULT '0', "is_published" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e4c86c0cf95aff16e9fb8220f6b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ADD CONSTRAINT "FK_3f89c5bb34b29121873a017ead8" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" ADD CONSTRAINT "FK_d624c8e157de3f5a2ebdd2d515c" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
