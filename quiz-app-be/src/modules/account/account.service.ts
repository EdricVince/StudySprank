import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  SocialLink,
  UserPreferences,
  UserProfile,
} from './entities/user-profile.entity';
import type { UpdateAccountProfileDto } from './dto/account.dto';
import { AuthService } from '../auth/auth.service';
import { AdminService } from '../admin/admin.service';
import { UsersService } from '../users/users.service';
import { ROLE_ADMIN } from '../roles/entities/role.entity';

export interface AccountProfileView {
  username: string;
  phone: string;
  title: string;
  location: string;
  bio: string;
  social_links: SocialLink[];
  preferences: UserPreferences;
}

const SECTIONS = ['study', 'notifications', 'privacy'] as const;

/** Keep only the keys that were really sent (undefined means "leave it as it is"). */
const defined = <T extends object>(patch: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== undefined),
  ) as Partial<T>;

/**
 * Merge a partial preferences update into the stored ones, section by section and key by key,
 * so saving the notification toggles never wipes the study settings.
 */
export function mergePreferences(
  current: UserPreferences | null | undefined,
  patch: Partial<Record<(typeof SECTIONS)[number], object | undefined>>,
): UserPreferences {
  const merged: Record<string, object> = { ...(current ?? {}) };
  for (const section of SECTIONS) {
    const incoming = patch[section];
    if (incoming) {
      merged[section] = { ...(merged[section] ?? {}), ...defined(incoming) };
    }
  }
  return merged as UserPreferences;
}

const trimmed = (value: string | undefined) => value?.trim() ?? undefined;
const orNull = (value: string | undefined) =>
  value === undefined ? undefined : value === '' ? null : value;

/** The signed-in user's profile card, settings, password, data export and account deletion. */
@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly profiles: Repository<UserProfile>,
    private readonly db: DataSource,
    private readonly auth: AuthService,
    private readonly admin: AdminService,
    private readonly users: UsersService,
  ) {}

  private view(row: UserProfile | null): AccountProfileView {
    return {
      username: row?.username ?? '',
      phone: row?.phone ?? '',
      title: row?.title ?? '',
      location: row?.location ?? '',
      bio: row?.bio ?? '',
      social_links: row?.social_links ?? [],
      preferences: row?.preferences ?? {},
    };
  }

  async getProfile(userId: number): Promise<AccountProfileView> {
    return this.view(
      await this.profiles.findOne({ where: { user_id: userId } }),
    );
  }

  async updateProfile(
    userId: number,
    dto: UpdateAccountProfileDto,
  ): Promise<AccountProfileView> {
    const row =
      (await this.profiles.findOne({ where: { user_id: userId } })) ??
      this.profiles.create({
        user_id: userId,
        social_links: [],
        preferences: {},
      });

    Object.assign(
      row,
      defined({
        username: orNull(trimmed(dto.username)),
        phone: orNull(trimmed(dto.phone)),
        title: orNull(trimmed(dto.title)),
        location: orNull(trimmed(dto.location)),
        bio: orNull(trimmed(dto.bio)),
      }),
    );
    if (dto.social_links !== undefined) {
      row.social_links = dto.social_links.map((l) => ({
        platform: l.platform.trim(),
        url: l.url.trim(),
      }));
    }
    if (dto.preferences) {
      row.preferences = mergePreferences(row.preferences, dto.preferences);
    }
    return this.view(await this.profiles.save(row));
  }

  /** Change the password and keep this device signed in with a fresh token pair. */
  changePassword(userId: number, current: string, next: string) {
    return this.auth.changePassword(userId, current, next);
  }

  /** Permanently delete the caller's own account and everything tied to it (after the password). */
  async deleteAccount(userId: number, password: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) return;
    if (user.role_id === ROLE_ADMIN) {
      throw new ForbiddenException('Admin accounts cannot be deleted.');
    }
    if (!(await this.auth.checkPassword(user.password, password))) {
      throw new BadRequestException('Password is incorrect');
    }
    await this.admin.deleteUser(userId);
  }

  /** Everything the app holds about the caller, as one downloadable document. */
  async exportData(userId: number) {
    const rows = <T>(sql: string) => this.db.query<T[]>(sql, [userId]);
    const [
      account,
      progress,
      dailyActivity,
      sessions,
      words,
      decks,
      testResults,
      examAttempts,
      goals,
      classes,
      studyPlans,
    ] = await Promise.all([
      rows(
        `SELECT id, email, name, role_id, created_at FROM users WHERE id = $1`,
      ),
      rows(`SELECT xp, level, streak_count, longest_streak, last_activity_date,
                   total_cards_studied, total_quizzes_completed
              FROM user_progress WHERE user_id = $1`),
      rows(`SELECT activity_date, xp_earned, cards_studied, quizzes_completed
              FROM daily_activities WHERE user_id = $1 ORDER BY activity_date`),
      rows(`SELECT id, kind, mode_id, mode_name, source, title, learning_lang, meaning_lang,
                   total_items, correct_items, accuracy, score, xp_earned, duration_seconds, created_at
              FROM learning_sessions WHERE user_id = $1 ORDER BY id`),
      rows(`SELECT w.session_id, w.position, w.term, w.meaning, w.example, w.is_correct
              FROM learning_session_words w
              JOIN learning_sessions s ON s.id = w.session_id
             WHERE s.user_id = $1 ORDER BY w.session_id, w.position`),
      rows(`SELECT id, title, description, category, cards, is_public, class_id, created_at
              FROM flashcard_decks WHERE owner_id = $1 ORDER BY id`),
      rows(`SELECT s.test_id, t.title, s.score, s.total, s.created_at
              FROM test_submissions s JOIN tests t ON t.id = s.test_id
             WHERE s.student_id = $1 ORDER BY s.created_at`),
      rows(
        `SELECT id, status, started_at FROM exam_attempts WHERE user_id = $1 ORDER BY id`,
      ),
      rows(
        `SELECT 'custom' AS kind, title, description, completed FROM user_custom_goals WHERE user_id = $1`,
      ),
      rows(`SELECT c.id, c.name, e.joined_at
              FROM class_enrollments e JOIN classes c ON c.id = e.class_id
             WHERE e.student_id = $1`),
      rows(
        `SELECT id, name, form, plan, created_at FROM study_plans WHERE user_id = $1 ORDER BY created_at`,
      ),
    ]);

    const wordsOf = new Map<number, unknown[]>();
    for (const w of words as { session_id: number }[]) {
      wordsOf.set(w.session_id, [...(wordsOf.get(w.session_id) ?? []), w]);
    }
    return {
      exportedAt: new Date().toISOString(),
      account: account[0] ?? null,
      profile: await this.getProfile(userId),
      progress: progress[0] ?? null,
      dailyActivity,
      learningHistory: (sessions as { id: number }[]).map((s) => ({
        ...s,
        words: wordsOf.get(s.id) ?? [],
      })),
      flashcardDecks: decks,
      classTestResults: testResults,
      examAttempts,
      goals,
      classes,
      studyPlans,
    };
  }
}
