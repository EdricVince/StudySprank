import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Baseline schema (generated from the entities with `pnpm migration:generate`).
 *
 * Works on an empty database and on one created earlier with DB_SYNCHRONIZE=true
 * (e.g. the Supabase production DB): only missing tables are created, together with
 * their own indexes and foreign keys; existing tables and their data are left untouched.
 * The three roles are seeded either way.
 */
const SCHEMA: string[] = [
  `CREATE TABLE "users" ("id" SERIAL NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "role_id" integer NOT NULL DEFAULT '1', "name" character varying, "avatar" character varying, "teacher_card_image" text, "is_verified" boolean NOT NULL DEFAULT false, "reset_token_hash" character varying, "reset_token_expires" bigint, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
  `CREATE TABLE "classes" ("id" SERIAL NOT NULL, "teacher_id" integer NOT NULL, "name" character varying NOT NULL, "description" text, "subject" text, "class_code" character varying(10) NOT NULL, "student_limit" integer NOT NULL DEFAULT '30', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1c7a37d4b45c2664db574869ff8" UNIQUE ("class_code"), CONSTRAINT "PK_e207aa15404e9b2ce35910f9f7f" PRIMARY KEY ("id"))`,
  `CREATE TABLE "videos" ("id" SERIAL NOT NULL, "teacher_id" integer NOT NULL, "class_id" integer, "title" character varying NOT NULL, "description" text, "video_url" text NOT NULL, "lesson_name" text, "duration" integer NOT NULL DEFAULT '0', "is_published" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e4c86c0cf95aff16e9fb8220f6b" PRIMARY KEY ("id"))`,
  `CREATE TABLE "vocab_sets" ("id" SERIAL NOT NULL, "teacher_id" integer NOT NULL, "class_id" integer, "name" character varying NOT NULL, "language" character varying NOT NULL DEFAULT 'English', "level" character varying NOT NULL DEFAULT 'Intermediate', "words" jsonb NOT NULL DEFAULT '[]', "is_published" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0eda524f8438474ab147d6d52d6" PRIMARY KEY ("id"))`,
  `CREATE TABLE "tests" ("id" SERIAL NOT NULL, "teacher_id" integer NOT NULL, "class_id" integer, "title" character varying NOT NULL, "description" text, "questions" jsonb NOT NULL DEFAULT '[]', "time_limit" integer, "is_published" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_4301ca51edf839623386860aed2" PRIMARY KEY ("id"))`,
  `CREATE TABLE "test_submissions" ("id" SERIAL NOT NULL, "test_id" integer NOT NULL, "student_id" integer NOT NULL, "answers" jsonb NOT NULL DEFAULT '[]', "score" integer NOT NULL, "total" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e05ffc282586eb005bdbe62084b" PRIMARY KEY ("id"))`,
  `CREATE TABLE "roles" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`,
  `CREATE TABLE "lessons" ("id" SERIAL NOT NULL, "teacher_id" integer NOT NULL, "class_id" integer, "title" character varying NOT NULL, "description" text, "category" character varying NOT NULL DEFAULT 'General', "difficulty" character varying NOT NULL DEFAULT 'beginner', "content" jsonb NOT NULL, "is_published" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9b9a8d455cac672d262d7275730" PRIMARY KEY ("id"))`,
  `CREATE TABLE "lesson_completions" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "lesson_id" integer NOT NULL, "completed_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_888cc5486f57fddc6e449e30cea" UNIQUE ("user_id", "lesson_id"), CONSTRAINT "PK_2e5c1e7d0882eafd013035f5430" PRIMARY KEY ("id"))`,
  `CREATE TABLE "daily_activities" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "activity_date" character varying NOT NULL, "xp_earned" integer NOT NULL DEFAULT '0', "cards_studied" integer NOT NULL DEFAULT '0', "quizzes_completed" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c9ad6830783dbd1a7337ea21a18" PRIMARY KEY ("id"))`,
  `CREATE TABLE "user_progress" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "xp" integer NOT NULL DEFAULT '0', "level" integer NOT NULL DEFAULT '1', "streak_count" integer NOT NULL DEFAULT '0', "longest_streak" integer NOT NULL DEFAULT '0', "last_activity_date" character varying, "total_cards_studied" integer NOT NULL DEFAULT '0', "total_quizzes_completed" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_c41601eeb8415a9eb15c8a4e557" UNIQUE ("user_id"), CONSTRAINT "PK_7b5eb2436efb0051fdf05cbe839" PRIMARY KEY ("id"))`,
  `CREATE TABLE "live_sessions" ("id" SERIAL NOT NULL, "teacher_id" integer NOT NULL, "class_id" integer, "title" character varying NOT NULL, "pin" character varying(8) NOT NULL, "steps" text, "questions" text, "status" character varying NOT NULL DEFAULT 'waiting', "current_question" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_175a773806b9f1e224ba927a86a" UNIQUE ("pin"), CONSTRAINT "PK_cc3225418b55b1e022dbfb6dca5" PRIMARY KEY ("id"))`,
  `CREATE TABLE "user_goal_settings" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "target_cards" integer NOT NULL DEFAULT '50', "target_quizzes" integer NOT NULL DEFAULT '3', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f9f98bba1fdf9386f8b8e6d01df" UNIQUE ("user_id"), CONSTRAINT "PK_b604b77110eb522bd509d85a347" PRIMARY KEY ("id"))`,
  `CREATE TABLE "user_custom_goals" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "title" character varying NOT NULL, "description" character varying, "completed" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_39546ebd01e30ff7f2ff8725210" PRIMARY KEY ("id"))`,
  `CREATE TABLE "flashcard_decks" ("id" SERIAL NOT NULL, "owner_id" integer NOT NULL, "title" character varying NOT NULL, "description" text, "category" character varying NOT NULL DEFAULT 'General', "cards" jsonb NOT NULL DEFAULT '[]', "is_public" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b7013fe6cf1a9b4dd13e97d01d8" PRIMARY KEY ("id"))`,
  `CREATE TABLE "card_reviews" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "deck_id" integer NOT NULL, "card_key" character varying(255) NOT NULL, "ease_factor" double precision NOT NULL DEFAULT '2.5', "interval_days" integer NOT NULL DEFAULT '0', "repetitions" integer NOT NULL DEFAULT '0', "last_quality" integer, "due_at" TIMESTAMP WITH TIME ZONE NOT NULL, "last_reviewed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_db4aaddd3fd555f013039d68949" UNIQUE ("user_id", "deck_id", "card_key"), CONSTRAINT "PK_815ca241f8e694e9cb921b4f08c" PRIMARY KEY ("id"))`,
  `CREATE INDEX "IDX_5343118e91dc2e30553d5b18ea" ON "card_reviews" ("deck_id")`,
  `CREATE TABLE "class_enrollments" ("id" SERIAL NOT NULL, "class_id" integer NOT NULL, "student_id" integer NOT NULL, "joined_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ebe374c2bfa4dbc289401ef5496" PRIMARY KEY ("id"))`,
  `CREATE TABLE "refresh_tokens" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "token_hash" character varying(64) NOT NULL, "family_id" character varying(36) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_a7838d2ba25be1342091b6695f1" UNIQUE ("token_hash"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
  `CREATE INDEX "IDX_3ddc983c5f7bcf132fd8732c3f" ON "refresh_tokens" ("user_id")`,
  `CREATE INDEX "IDX_d5e27da0cd39bc3bb2811fc8ba" ON "refresh_tokens" ("family_id")`,
  `CREATE TABLE "assignments" ("id" SERIAL NOT NULL, "teacher_id" integer NOT NULL, "class_id" integer, "title" character varying NOT NULL, "description" text, "attachment" text, "attachment_name" character varying, "is_published" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c54ca359535e0012b04dcbd80ee" PRIMARY KEY ("id"))`,
  `ALTER TABLE "classes" ADD CONSTRAINT "FK_b34c92e413c4debb6e0f23fed46" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "videos" ADD CONSTRAINT "FK_3f89c5bb34b29121873a017ead8" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "videos" ADD CONSTRAINT "FK_d624c8e157de3f5a2ebdd2d515c" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
  `ALTER TABLE "vocab_sets" ADD CONSTRAINT "FK_0a22b4639bb140588f2fe72deb0" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "vocab_sets" ADD CONSTRAINT "FK_0efd91d1f124b0ff9777b288d0c" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
  `ALTER TABLE "tests" ADD CONSTRAINT "FK_3a4e54902753a8b6415963a3ea6" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "tests" ADD CONSTRAINT "FK_af99930c4bdce16544496de5f7c" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
  `ALTER TABLE "test_submissions" ADD CONSTRAINT "FK_983b7d564ea222e873cb9aeb88d" FOREIGN KEY ("test_id") REFERENCES "tests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "test_submissions" ADD CONSTRAINT "FK_40b9f854cab682e6305dd81e51e" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "lessons" ADD CONSTRAINT "FK_91eb3280b50fe17091b191bbd98" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "lessons" ADD CONSTRAINT "FK_e74cdae1a2f3312b240847dfa1f" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
  `ALTER TABLE "lesson_completions" ADD CONSTRAINT "FK_1fc9a8f84304a421c1b0aa2d15a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "lesson_completions" ADD CONSTRAINT "FK_bdcedea316987f7483035423e9a" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "daily_activities" ADD CONSTRAINT "FK_41b2afd0f87258187d2b2fc171e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "user_progress" ADD CONSTRAINT "FK_c41601eeb8415a9eb15c8a4e557" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "live_sessions" ADD CONSTRAINT "FK_5ffa59ef26badfd70d7cb850b5d" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "live_sessions" ADD CONSTRAINT "FK_71dc611529eec8d91fe6522fe46" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
  `ALTER TABLE "user_goal_settings" ADD CONSTRAINT "FK_f9f98bba1fdf9386f8b8e6d01df" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "user_custom_goals" ADD CONSTRAINT "FK_ffb3cab2524384c9ba8765aed69" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "flashcard_decks" ADD CONSTRAINT "FK_5e598c1fd4d9c3a2fa5967a9972" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "card_reviews" ADD CONSTRAINT "FK_9e3488525d0ab34e4bbad4de3ec" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "card_reviews" ADD CONSTRAINT "FK_5343118e91dc2e30553d5b18ea6" FOREIGN KEY ("deck_id") REFERENCES "flashcard_decks"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "class_enrollments" ADD CONSTRAINT "FK_dfd6aaba34336d3c77b06c5038c" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "class_enrollments" ADD CONSTRAINT "FK_65522583556b72ff2e3ce25d218" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "assignments" ADD CONSTRAINT "FK_27322fa090b5deacc5785fcb94c" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
  `ALTER TABLE "assignments" ADD CONSTRAINT "FK_951fd419e8486c10ba6302a934b" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
];

/** Table a statement belongs to (CREATE TABLE / ALTER TABLE / CREATE INDEX … ON). */
function tableOf(sql: string): string {
  const m =
    /^(?:CREATE|ALTER) TABLE "(\w+)"/.exec(sql) ?? / ON "(\w+)"/.exec(sql);
  if (!m) throw new Error(`Unrecognised schema statement: ${sql.slice(0, 60)}`);
  return m[1];
}

export class InitialSchema1792234878954 implements MigrationInterface {
  name = 'InitialSchema1792234878954';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const created = new Set<string>();
    for (const sql of SCHEMA) {
      const table = tableOf(sql);
      if (sql.startsWith('CREATE TABLE')) {
        if (await queryRunner.hasTable(table)) continue;
        created.add(table);
      } else if (!created.has(table)) {
        continue; // indexes / FKs only for tables created here — never alter existing data
      }
      await queryRunner.query(sql);
    }

    // Role ids are fixed: 1 STUDENT, 2 TEACHER, 3 ADMIN (see roles/entities/role.entity.ts).
    await queryRunner.query(`INSERT INTO "roles" ("id", "name", "description") VALUES
      (1, 'STUDENT', 'Regular student account'),
      (2, 'TEACHER', 'Teacher with class management access'),
      (3, 'ADMIN', 'Full system administrator')
      ON CONFLICT DO NOTHING`);
    await queryRunner.query(
      `SELECT setval(pg_get_serial_sequence('roles', 'id'), GREATEST((SELECT MAX("id") FROM "roles"), 1))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "assignments" DROP CONSTRAINT "FK_951fd419e8486c10ba6302a934b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "assignments" DROP CONSTRAINT "FK_27322fa090b5deacc5785fcb94c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_enrollments" DROP CONSTRAINT "FK_65522583556b72ff2e3ce25d218"`,
    );
    await queryRunner.query(
      `ALTER TABLE "class_enrollments" DROP CONSTRAINT "FK_dfd6aaba34336d3c77b06c5038c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "card_reviews" DROP CONSTRAINT "FK_5343118e91dc2e30553d5b18ea6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "card_reviews" DROP CONSTRAINT "FK_9e3488525d0ab34e4bbad4de3ec"`,
    );
    await queryRunner.query(
      `ALTER TABLE "flashcard_decks" DROP CONSTRAINT "FK_5e598c1fd4d9c3a2fa5967a9972"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_custom_goals" DROP CONSTRAINT "FK_ffb3cab2524384c9ba8765aed69"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_goal_settings" DROP CONSTRAINT "FK_f9f98bba1fdf9386f8b8e6d01df"`,
    );
    await queryRunner.query(
      `ALTER TABLE "live_sessions" DROP CONSTRAINT "FK_71dc611529eec8d91fe6522fe46"`,
    );
    await queryRunner.query(
      `ALTER TABLE "live_sessions" DROP CONSTRAINT "FK_5ffa59ef26badfd70d7cb850b5d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_progress" DROP CONSTRAINT "FK_c41601eeb8415a9eb15c8a4e557"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_activities" DROP CONSTRAINT "FK_41b2afd0f87258187d2b2fc171e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_completions" DROP CONSTRAINT "FK_bdcedea316987f7483035423e9a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lesson_completions" DROP CONSTRAINT "FK_1fc9a8f84304a421c1b0aa2d15a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lessons" DROP CONSTRAINT "FK_e74cdae1a2f3312b240847dfa1f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "lessons" DROP CONSTRAINT "FK_91eb3280b50fe17091b191bbd98"`,
    );
    await queryRunner.query(
      `ALTER TABLE "test_submissions" DROP CONSTRAINT "FK_40b9f854cab682e6305dd81e51e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "test_submissions" DROP CONSTRAINT "FK_983b7d564ea222e873cb9aeb88d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tests" DROP CONSTRAINT "FK_af99930c4bdce16544496de5f7c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tests" DROP CONSTRAINT "FK_3a4e54902753a8b6415963a3ea6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vocab_sets" DROP CONSTRAINT "FK_0efd91d1f124b0ff9777b288d0c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vocab_sets" DROP CONSTRAINT "FK_0a22b4639bb140588f2fe72deb0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" DROP CONSTRAINT "FK_d624c8e157de3f5a2ebdd2d515c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "videos" DROP CONSTRAINT "FK_3f89c5bb34b29121873a017ead8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "classes" DROP CONSTRAINT "FK_b34c92e413c4debb6e0f23fed46"`,
    );
    await queryRunner.query(`DROP TABLE "assignments"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d5e27da0cd39bc3bb2811fc8ba"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3ddc983c5f7bcf132fd8732c3f"`,
    );
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "class_enrollments"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5343118e91dc2e30553d5b18ea"`,
    );
    await queryRunner.query(`DROP TABLE "card_reviews"`);
    await queryRunner.query(`DROP TABLE "flashcard_decks"`);
    await queryRunner.query(`DROP TABLE "user_custom_goals"`);
    await queryRunner.query(`DROP TABLE "user_goal_settings"`);
    await queryRunner.query(`DROP TABLE "live_sessions"`);
    await queryRunner.query(`DROP TABLE "user_progress"`);
    await queryRunner.query(`DROP TABLE "daily_activities"`);
    await queryRunner.query(`DROP TABLE "lesson_completions"`);
    await queryRunner.query(`DROP TABLE "lessons"`);
    await queryRunner.query(`DROP TABLE "roles"`);
    await queryRunner.query(`DROP TABLE "test_submissions"`);
    await queryRunner.query(`DROP TABLE "tests"`);
    await queryRunner.query(`DROP TABLE "vocab_sets"`);
    await queryRunner.query(`DROP TABLE "videos"`);
    await queryRunner.query(`DROP TABLE "classes"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
