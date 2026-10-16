/**
 * One-time script: enforce real PostgreSQL foreign keys.
 *
 * The entities declare their relationships (`@ManyToOne` + `onDelete`) but a DB
 * created before those relations existed has no FK constraints. This script:
 *   1. removes any orphaned rows (so the constraints can be created), then
 *   2. runs TypeORM `synchronize()` to create the FKs from the entity metadata,
 *   3. prints the resulting foreign keys for verification.
 *
 * Run once against the target DB:  pnpm sync:fks   (or: ts-node src/scripts/sync-foreign-keys.ts)
 * Safe to re-run — cleanup is idempotent and synchronize won't duplicate FKs.
 */
import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { DataSource, TableForeignKey } from 'typeorm';

import { User } from '../modules/users/entities/user.entity';
import { Role } from '../modules/roles/entities/role.entity';
import { UserProgress } from '../modules/progress/entities/user-progress.entity';
import { DailyActivity } from '../modules/progress/entities/daily-activity.entity';
import { UserGoalSettings } from '../modules/goals/entities/user-goal-settings.entity';
import { UserCustomGoal } from '../modules/goals/entities/user-custom-goal.entity';
import { LessonCompletion } from '../modules/progress/entities/lesson-completion.entity';
import { Class } from '../modules/classes/entities/class.entity';
import { ClassEnrollment } from '../modules/classes/entities/class-enrollment.entity';
import { Video } from '../modules/videos/entities/video.entity';
import { Lesson } from '../modules/lessons/entities/lesson.entity';
import { VocabSet } from '../modules/vocab-sets/entities/vocab-set.entity';
import { FlashcardDeck } from '../modules/flashcard-decks/entities/flashcard-deck.entity';
import { CardReview } from '../modules/flashcard-decks/entities/card-review.entity';
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity';
import { Test } from '../modules/tests/entities/test.entity';
import { TestSubmission } from '../modules/tests/entities/test-submission.entity';
import { Assignment } from '../modules/assignments/entities/assignment.entity';
import { LiveSession } from '../modules/live-quiz/entities/live-session.entity';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    User,
    Role,
    RefreshToken,
    UserProgress,
    DailyActivity,
    UserGoalSettings,
    UserCustomGoal,
    Class,
    ClassEnrollment,
    Video,
    Lesson,
    VocabSet,
    FlashcardDeck,
    CardReview,
    LiveSession,
    LessonCompletion,
    Test,
    TestSubmission,
    Assignment,
  ],
  synchronize: false,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: true }
      : { rejectUnauthorized: false },
});

// Delete/null any row whose parent is missing, in dependency order, so the
// FK constraints can be created without violating existing data.
const CLEANUP: string[] = [
  // Fill any null role names (the entity requires NOT NULL; older rows were null).
  `UPDATE roles SET name = CASE id WHEN 1 THEN 'STUDENT' WHEN 2 THEN 'TEACHER' WHEN 3 THEN 'ADMIN' ELSE 'ROLE_' || id END WHERE name IS NULL`,
  `UPDATE users SET role_id = 1 WHERE role_id NOT IN (SELECT id FROM roles)`,
  `DELETE FROM classes WHERE teacher_id NOT IN (SELECT id FROM users)`,
  `DELETE FROM class_enrollments WHERE student_id NOT IN (SELECT id FROM users)`,
  `DELETE FROM class_enrollments WHERE class_id NOT IN (SELECT id FROM classes)`,
  `DELETE FROM videos WHERE teacher_id NOT IN (SELECT id FROM users)`,
  `UPDATE videos SET class_id = NULL WHERE class_id IS NOT NULL AND class_id NOT IN (SELECT id FROM classes)`,
  `DELETE FROM lessons WHERE teacher_id NOT IN (SELECT id FROM users)`,
  `UPDATE lessons SET class_id = NULL WHERE class_id IS NOT NULL AND class_id NOT IN (SELECT id FROM classes)`,
  `DELETE FROM vocab_sets WHERE teacher_id NOT IN (SELECT id FROM users)`,
  `UPDATE vocab_sets SET class_id = NULL WHERE class_id IS NOT NULL AND class_id NOT IN (SELECT id FROM classes)`,
  `DELETE FROM flashcard_decks WHERE owner_id NOT IN (SELECT id FROM users)`,
  `DELETE FROM card_reviews WHERE user_id NOT IN (SELECT id FROM users)`,
  `DELETE FROM card_reviews WHERE deck_id NOT IN (SELECT id FROM flashcard_decks)`,
  `DELETE FROM lesson_completions WHERE user_id NOT IN (SELECT id FROM users)`,
  `DELETE FROM lesson_completions WHERE lesson_id NOT IN (SELECT id FROM lessons)`,
  `DELETE FROM tests WHERE teacher_id NOT IN (SELECT id FROM users)`,
  `UPDATE tests SET class_id = NULL WHERE class_id IS NOT NULL AND class_id NOT IN (SELECT id FROM classes)`,
  `DELETE FROM test_submissions WHERE student_id NOT IN (SELECT id FROM users)`,
  `DELETE FROM test_submissions WHERE test_id NOT IN (SELECT id FROM tests)`,
  `DELETE FROM live_sessions WHERE teacher_id NOT IN (SELECT id FROM users)`,
  `UPDATE live_sessions SET class_id = NULL WHERE class_id IS NOT NULL AND class_id NOT IN (SELECT id FROM classes)`,
  `DELETE FROM assignments WHERE teacher_id NOT IN (SELECT id FROM users)`,
  `UPDATE assignments SET class_id = NULL WHERE class_id IS NOT NULL AND class_id NOT IN (SELECT id FROM classes)`,
  `DELETE FROM user_progress WHERE user_id NOT IN (SELECT id FROM users)`,
  `DELETE FROM daily_activities WHERE user_id NOT IN (SELECT id FROM users)`,
  `DELETE FROM user_goal_settings WHERE user_id NOT IN (SELECT id FROM users)`,
  `DELETE FROM user_custom_goals WHERE user_id NOT IN (SELECT id FROM users)`,
  `DELETE FROM refresh_tokens WHERE user_id NOT IN (SELECT id FROM users)`,
];

// The foreign keys to enforce. Created via TypeORM's createForeignKey with no
// explicit name, so the generated name matches what the app's own synchronize
// would produce — the app won't create a duplicate on its next boot.
const FKS: Array<{
  table: string;
  column: string;
  ref: string;
  onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT';
}> = [
  {
    table: 'user_progress',
    column: 'user_id',
    ref: 'users',
    onDelete: 'CASCADE',
  },
  {
    table: 'daily_activities',
    column: 'user_id',
    ref: 'users',
    onDelete: 'CASCADE',
  },
  {
    table: 'user_goal_settings',
    column: 'user_id',
    ref: 'users',
    onDelete: 'CASCADE',
  },
  {
    table: 'user_custom_goals',
    column: 'user_id',
    ref: 'users',
    onDelete: 'CASCADE',
  },
  { table: 'classes', column: 'teacher_id', ref: 'users', onDelete: 'CASCADE' },
  {
    table: 'class_enrollments',
    column: 'student_id',
    ref: 'users',
    onDelete: 'CASCADE',
  },
  {
    table: 'class_enrollments',
    column: 'class_id',
    ref: 'classes',
    onDelete: 'CASCADE',
  },
  { table: 'videos', column: 'teacher_id', ref: 'users', onDelete: 'CASCADE' },
  { table: 'videos', column: 'class_id', ref: 'classes', onDelete: 'SET NULL' },
  { table: 'lessons', column: 'teacher_id', ref: 'users', onDelete: 'CASCADE' },
  {
    table: 'lessons',
    column: 'class_id',
    ref: 'classes',
    onDelete: 'SET NULL',
  },
  {
    table: 'vocab_sets',
    column: 'teacher_id',
    ref: 'users',
    onDelete: 'CASCADE',
  },
  {
    table: 'vocab_sets',
    column: 'class_id',
    ref: 'classes',
    onDelete: 'SET NULL',
  },
  {
    table: 'flashcard_decks',
    column: 'owner_id',
    ref: 'users',
    onDelete: 'CASCADE',
  },
  {
    table: 'card_reviews',
    column: 'user_id',
    ref: 'users',
    onDelete: 'CASCADE',
  },
  {
    table: 'card_reviews',
    column: 'deck_id',
    ref: 'flashcard_decks',
    onDelete: 'CASCADE',
  },
  {
    table: 'lesson_completions',
    column: 'user_id',
    ref: 'users',
    onDelete: 'CASCADE',
  },
  {
    table: 'lesson_completions',
    column: 'lesson_id',
    ref: 'lessons',
    onDelete: 'CASCADE',
  },
  { table: 'tests', column: 'teacher_id', ref: 'users', onDelete: 'CASCADE' },
  { table: 'tests', column: 'class_id', ref: 'classes', onDelete: 'SET NULL' },
  {
    table: 'test_submissions',
    column: 'student_id',
    ref: 'users',
    onDelete: 'CASCADE',
  },
  {
    table: 'test_submissions',
    column: 'test_id',
    ref: 'tests',
    onDelete: 'CASCADE',
  },
  {
    table: 'live_sessions',
    column: 'teacher_id',
    ref: 'users',
    onDelete: 'CASCADE',
  },
  {
    table: 'live_sessions',
    column: 'class_id',
    ref: 'classes',
    onDelete: 'SET NULL',
  },
  {
    table: 'assignments',
    column: 'teacher_id',
    ref: 'users',
    onDelete: 'CASCADE',
  },
  {
    table: 'assignments',
    column: 'class_id',
    ref: 'classes',
    onDelete: 'SET NULL',
  },
  {
    table: 'refresh_tokens',
    column: 'user_id',
    ref: 'users',
    onDelete: 'CASCADE',
  },
  // Note: users.role_id → roles is intentionally NOT a DB FK — roles are static
  // reference data (never deleted) and registering Role for that one relation
  // makes TypeORM synchronize churn the roles table. App-level integrity only.
];

async function main() {
  await dataSource.initialize();
  console.log('Connected. Cleaning orphaned rows…');
  for (const sql of CLEANUP) {
    await dataSource.query(sql);
  }

  console.log('Orphans cleaned. Creating foreign keys…');
  const runner = dataSource.createQueryRunner();
  for (const fk of FKS) {
    const existing = (await runner.query(
      `SELECT 1 FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
       WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
         AND tc.table_name = $1 AND kcu.column_name = $2 LIMIT 1`,
      [fk.table, fk.column],
    )) as unknown[];
    if (existing.length) {
      console.log(`  = ${fk.table}.${fk.column} already has a FK — skipped`);
      continue;
    }
    await runner.createForeignKey(
      fk.table,
      new TableForeignKey({
        columnNames: [fk.column],
        referencedTableName: fk.ref,
        referencedColumnNames: ['id'],
        onDelete: fk.onDelete,
      }),
    );
    console.log(
      `  + ${fk.table}.${fk.column} → ${fk.ref} (ON DELETE ${fk.onDelete})`,
    );
  }
  await runner.release();

  const fks: Array<{
    table_name: string;
    column_name: string;
    referenced_table: string;
    delete_rule: string;
  }> = await dataSource.query(`
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS referenced_table, rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name
  `);

  console.log(`\nForeign keys now enforced by PostgreSQL (${fks.length}):`);
  for (const fk of fks) {
    console.log(
      `  ${fk.table_name}.${fk.column_name} → ${fk.referenced_table} (ON DELETE ${fk.delete_rule})`,
    );
  }

  await dataSource.destroy();
  console.log('\nDone.');
}

main().catch(async (err) => {
  console.error('FK sync failed:', err instanceof Error ? err.message : err);
  try {
    await dataSource.destroy();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
