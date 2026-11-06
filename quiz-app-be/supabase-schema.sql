-- ============================================================
-- StudySpark — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- 1. ROLES
CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  role_id    INTEGER NOT NULL DEFAULT 1,
  name       VARCHAR(255),
  avatar     VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. USER PROGRESS
CREATE TABLE IF NOT EXISTS user_progress (
  id                     SERIAL PRIMARY KEY,
  user_id                INTEGER NOT NULL UNIQUE,
  xp                     INTEGER NOT NULL DEFAULT 0,
  level                  INTEGER NOT NULL DEFAULT 1,
  streak_count           INTEGER NOT NULL DEFAULT 0,
  longest_streak         INTEGER NOT NULL DEFAULT 0,
  last_activity_date     VARCHAR(20),
  total_cards_studied    INTEGER NOT NULL DEFAULT 0,
  total_quizzes_completed INTEGER NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. DAILY ACTIVITIES
CREATE TABLE IF NOT EXISTS daily_activities (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL,
  activity_date     VARCHAR(20) NOT NULL,
  xp_earned         INTEGER NOT NULL DEFAULT 0,
  cards_studied     INTEGER NOT NULL DEFAULT 0,
  quizzes_completed INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. USER GOAL SETTINGS
CREATE TABLE IF NOT EXISTS user_goal_settings (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER NOT NULL UNIQUE,
  target_cards   INTEGER NOT NULL DEFAULT 50,
  target_quizzes INTEGER NOT NULL DEFAULT 3,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. USER CUSTOM GOALS
CREATE TABLE IF NOT EXISTS user_custom_goals (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  title       VARCHAR(255) NOT NULL,
  description VARCHAR(500),
  completed   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. CLASSES
CREATE TABLE IF NOT EXISTS classes (
  id            SERIAL PRIMARY KEY,
  teacher_id    INTEGER NOT NULL,
  name          VARCHAR(255) NOT NULL,
  description   TEXT,
  subject       VARCHAR(100),
  class_code    VARCHAR(10) NOT NULL UNIQUE,
  student_limit INTEGER NOT NULL DEFAULT 30,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. CLASS ENROLLMENTS
CREATE TABLE IF NOT EXISTS class_enrollments (
  id         SERIAL PRIMARY KEY,
  class_id   INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(class_id, student_id)
);

-- 10. LIVE SESSIONS
CREATE TABLE IF NOT EXISTS live_sessions (
  id               SERIAL PRIMARY KEY,
  teacher_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id         INTEGER REFERENCES classes(id) ON DELETE SET NULL,
  title            VARCHAR(255) NOT NULL,
  pin              VARCHAR(8) NOT NULL UNIQUE,
  questions        TEXT,
  status           VARCHAR(20) NOT NULL DEFAULT 'waiting',
  current_question INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_email        ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id      ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_uid  ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_act_uid_date ON daily_activities(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_goal_settings_uid  ON user_goal_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_goals_uid   ON user_custom_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher     ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_code        ON classes(class_code);
CREATE INDEX IF NOT EXISTS idx_enrollments_class   ON class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_pin   ON live_sessions(pin);

-- ── Auto-update updated_at ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE TRIGGER trg_user_progress_updated_at
  BEFORE UPDATE ON user_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Seed: default roles ───────────────────────────────────────
INSERT INTO roles (id, name, description) VALUES
  (1, 'STUDENT', 'Regular student account'),
  (2, 'TEACHER', 'Teacher with class management access'),
  (3, 'ADMIN',   'Full system administrator')
ON CONFLICT (name) DO NOTHING;

-- Reset sequence after manual id insert
SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles));
