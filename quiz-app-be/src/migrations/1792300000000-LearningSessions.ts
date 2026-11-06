import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Flashcard and quiz history, stored in the database instead of the browser:
 *  - `learning_sessions`: one row per finished flashcard session / quiz game of a student (mode,
 *    deck or vocabulary set, languages, score, accuracy, XP, duration);
 *  - `learning_session_words`: every word practised in it with the meaning and whether the student
 *    knew it;
 *  - view `learning_history_feed`: the same, readable in Supabase (who, what, which class deck,
 *    and the words as text).
 * Not reachable from the public Supabase API (RLS on, no grants for anon/authenticated).
 * Idempotent so it also succeeds where DB_SYNCHRONIZE already created the tables.
 */
export class LearningSessions1792300000000 implements MigrationInterface {
  name = 'LearningSessions1792300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "learning_sessions" (
        "id" SERIAL NOT NULL,
        "user_id" integer NOT NULL,
        "kind" character varying(20) NOT NULL,
        "mode_id" character varying(60) NOT NULL,
        "mode_name" character varying(120) NOT NULL,
        "source" character varying(20) NOT NULL,
        "title" character varying(255) NOT NULL,
        "deck_id" integer,
        "vocab_set_id" integer,
        "learning_lang" character varying(8) NOT NULL DEFAULT 'en',
        "meaning_lang" character varying(8) NOT NULL DEFAULT 'en',
        "total_items" integer NOT NULL DEFAULT 0,
        "correct_items" integer NOT NULL DEFAULT 0,
        "accuracy" integer NOT NULL DEFAULT 0,
        "score" integer NOT NULL DEFAULT 0,
        "xp_earned" integer NOT NULL DEFAULT 0,
        "duration_seconds" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_learning_sessions" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_learning_sessions_user" ON "learning_sessions" ("user_id", "kind", "created_at")`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "learning_session_words" (
        "id" SERIAL NOT NULL,
        "session_id" integer NOT NULL,
        "position" integer NOT NULL,
        "term" character varying(500) NOT NULL,
        "meaning" text NOT NULL DEFAULT '',
        "example" text,
        "is_correct" boolean,
        CONSTRAINT "PK_learning_session_words" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_learning_session_words_session" ON "learning_session_words" ("session_id", "position")`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_learning_sessions_user') THEN
          ALTER TABLE "learning_sessions" ADD CONSTRAINT "FK_learning_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_learning_sessions_deck') THEN
          ALTER TABLE "learning_sessions" ADD CONSTRAINT "FK_learning_sessions_deck" FOREIGN KEY ("deck_id") REFERENCES "flashcard_decks"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_learning_sessions_vocab_set') THEN
          ALTER TABLE "learning_sessions" ADD CONSTRAINT "FK_learning_sessions_vocab_set" FOREIGN KEY ("vocab_set_id") REFERENCES "vocab_sets"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_learning_session_words_session') THEN
          ALTER TABLE "learning_session_words" ADD CONSTRAINT "FK_learning_session_words_session" FOREIGN KEY ("session_id") REFERENCES "learning_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$`,
    );
    await queryRunner.query(
      `CREATE OR REPLACE VIEW "learning_history_feed" AS
        SELECT s.id, s.created_at,
               u.email AS user_email, COALESCE(u.name, split_part(u.email, '@', 1)) AS user_name,
               s.kind, s.mode_id, s.mode_name, s.source, s.title,
               c.name AS class_name,
               s.learning_lang, s.meaning_lang,
               s.total_items, s.correct_items, s.accuracy, s.score, s.xp_earned, s.duration_seconds,
               (SELECT string_agg(
                         w.term || ' = ' || w.meaning
                           || CASE WHEN w.is_correct IS NULL THEN '' WHEN w.is_correct THEN ' (✓)' ELSE ' (✗)' END,
                         '; ' ORDER BY w.position)
                  FROM "learning_session_words" w WHERE w.session_id = s.id) AS words
          FROM "learning_sessions" s
          LEFT JOIN "users" u ON u.id = s.user_id
          LEFT JOIN "flashcard_decks" d ON d.id = s.deck_id
          LEFT JOIN "classes" c ON c.id = d.class_id
         ORDER BY s.created_at DESC`,
    );
    await queryRunner.query(
      `DO $$ BEGIN
        ALTER TABLE "learning_sessions" ENABLE ROW LEVEL SECURITY;
        ALTER TABLE "learning_session_words" ENABLE ROW LEVEL SECURITY;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          REVOKE ALL ON "learning_sessions", "learning_session_words", "learning_history_feed" FROM anon;
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          REVOKE ALL ON "learning_sessions", "learning_session_words", "learning_history_feed" FROM authenticated;
        END IF;
      END $$`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS "learning_history_feed"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "learning_session_words"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "learning_sessions"`);
  }
}
