import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Flashcard decks can be assigned to a class: visible only to that class's teacher and
 * enrolled students. Idempotent so it also succeeds where DB_SYNCHRONIZE added the column.
 */
export class ClassFlashcardDecks1792260000000 implements MigrationInterface {
  name = 'ClassFlashcardDecks1792260000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "flashcard_decks" ADD COLUMN IF NOT EXISTS "class_id" integer`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_flashcard_decks_class" ON "flashcard_decks" ("class_id")`,
    );
    await queryRunner.query(
      `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_flashcard_decks_class') THEN ALTER TABLE "flashcard_decks" ADD CONSTRAINT "FK_flashcard_decks_class" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE NO ACTION; END IF; END $$`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "flashcard_decks" DROP CONSTRAINT IF EXISTS "FK_flashcard_decks_class"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_flashcard_decks_class"`);
    await queryRunner.query(
      `ALTER TABLE "flashcard_decks" DROP COLUMN IF EXISTS "class_id"`,
    );
  }
}
