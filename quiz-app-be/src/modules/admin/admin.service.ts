import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, EntityManager } from 'typeorm';
import { User } from '../users/entities/user.entity';
import type { TeacherStatus } from '../users/entities/user.entity';
import { UserProgress } from '../progress/entities/user-progress.entity';
import { DailyActivity } from '../progress/entities/daily-activity.entity';
import { LessonCompletion } from '../progress/entities/lesson-completion.entity';
import { Class } from '../classes/entities/class.entity';
import { ClassEnrollment } from '../classes/entities/class-enrollment.entity';
import { Lesson } from '../lessons/entities/lesson.entity';
import { VocabSet } from '../vocab-sets/entities/vocab-set.entity';
import { FlashcardDeck } from '../flashcard-decks/entities/flashcard-deck.entity';
import { CardReview } from '../flashcard-decks/entities/card-review.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Test } from '../tests/entities/test.entity';
import { TestSubmission } from '../tests/entities/test-submission.entity';
import { Assignment } from '../assignments/entities/assignment.entity';
import { ExamAttempt } from '../entrance-exam/entities/exam-attempt.entity';
import { UserGoalSettings } from '../goals/entities/user-goal-settings.entity';
import { UserCustomGoal } from '../goals/entities/user-custom-goal.entity';
import {
  ROLE_ADMIN,
  ROLE_STUDENT,
  ROLE_TEACHER,
} from '../roles/entities/role.entity';
import * as bcrypt from 'bcrypt';

const TEACHER_DOMAIN = '@teacher.sprk';

export interface AdminUserRow {
  id: number;
  email: string;
  name: string | null;
  role_id: number;
  is_active: boolean;
  created_at: Date;
  xp: number;
  is_verified: boolean;
  has_teacher_card: boolean;
  teacher_status: TeacherStatus;
  teacher_organization: string | null;
}

export interface AdminStats {
  total: number;
  students: number;
  teachers: number;
  active: number;
  newThisWeek: number;
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(UserProgress)
    private progressRepo: Repository<UserProgress>,
  ) {}

  async getStats(): Promise<AdminStats> {
    const users = await this.userRepo.find();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return {
      total: users.length,
      students: users.filter((u) => u.role_id === ROLE_STUDENT).length,
      teachers: users.filter((u) => u.role_id === ROLE_TEACHER).length,
      active: users.filter((u) => u.is_active).length,
      newThisWeek: users.filter((u) => new Date(u.created_at) >= weekAgo)
        .length,
    };
  }

  /** Ids of the users (or just `onlyId`) that have a verification document on file. */
  private async userIdsWithCard(onlyId?: number): Promise<Set<number>> {
    const params = onlyId === undefined ? [] : [onlyId];
    const filter = onlyId === undefined ? '' : 'AND id = $1';
    const rows = await this.userRepo.query<{ id: number }[]>(
      `SELECT id FROM users WHERE teacher_card_image IS NOT NULL ${filter}`,
      params,
    );
    return new Set(rows.map((r) => r.id));
  }

  async listUsers(): Promise<AdminUserRow[]> {
    const users = await this.userRepo.find({ order: { created_at: 'DESC' } });
    const progressList = await this.progressRepo.find();
    const progressMap = new Map(progressList.map((p) => [p.user_id, p]));
    const withCard = await this.userIdsWithCard();

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role_id: u.role_id,
      is_active: u.is_active,
      created_at: u.created_at,
      xp: progressMap.get(u.id)?.xp ?? 0,
      is_verified: u.is_verified,
      has_teacher_card: withCard.has(u.id),
      teacher_status: u.teacher_status,
      teacher_organization: u.teacher_organization,
    }));
  }

  /** An admin-created teacher is trusted: approved straight away (the card is optional). */
  async createTeacher(
    teacherName: string,
    password: string,
    customEmail?: string,
    teacherCardImage?: string,
  ): Promise<{ id: number; email: string }> {
    const email =
      customEmail ??
      `${teacherName.toLowerCase().replace(/\s+/g, '.')}${TEACHER_DOMAIN}`;

    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException(`Teacher account "${email}" already exists`);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = this.userRepo.create({
      email,
      password: hashedPassword,
      name: teacherName,
      role_id: ROLE_TEACHER,
      is_active: true,
      teacher_card_image: teacherCardImage ?? null,
      is_verified: true,
      teacher_status: 'approved',
      teacher_reviewed_at: new Date(),
    });
    const saved = await this.userRepo.save(user);
    return { id: saved.id, email: saved.email };
  }

  async getTeacherCard(userId: number): Promise<string | null> {
    // teacher_card_image is not selected by default (it can be megabytes).
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.teacher_card_image')
      .where('u.id = :userId', { userId })
      .getOne();
    if (!user) throw new NotFoundException('User not found');
    return user.teacher_card_image;
  }

  async setTeacherCard(userId: number, image: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    // Uploading a card on the teacher's behalf also approves the account.
    await this.userRepo.update(userId, {
      teacher_card_image: image,
      is_verified: true,
      teacher_status: 'approved',
      teacher_reject_reason: null,
      teacher_reviewed_at: new Date(),
    });
  }

  /**
   * Approve / reject / re-open a teacher application. `is_verified` always mirrors
   * "approved". A rejection keeps the reason so the teacher sees why.
   */
  async reviewTeacher(
    userId: number,
    status: Exclude<TeacherStatus, 'none'>,
    reason?: string,
  ): Promise<{ id: number; teacher_status: TeacherStatus }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role_id !== ROLE_TEACHER) {
      throw new BadRequestException('Only teacher accounts can be reviewed.');
    }
    const cleanReason = status === 'rejected' ? (reason ?? '').trim() : '';
    if (status === 'rejected' && !cleanReason) {
      throw new BadRequestException(
        'A reason is required to reject a teacher.',
      );
    }
    await this.userRepo.update(userId, {
      teacher_status: status,
      is_verified: status === 'approved',
      teacher_reject_reason: cleanReason || null,
      teacher_reviewed_at: status === 'pending' ? null : new Date(),
    });
    // No token revocation needed: JwtGuard reads teacher_status from the DB on every request.
    return { id: userId, teacher_status: status };
  }

  /** One row per teacher with their activity counts (backed by the teacher_overview view). */
  async getTeacherOverview(): Promise<Record<string, unknown>[]> {
    return this.userRepo.query<Record<string, unknown>[]>(
      `SELECT * FROM teacher_overview ORDER BY created_at DESC`,
    );
  }

  async setUserActive(userId: number, isActive: boolean): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!isActive && user.role_id === ROLE_ADMIN) {
      throw new ForbiddenException('Admin accounts cannot be deactivated.');
    }
    await this.userRepo.update(userId, { is_active: isActive });
    if (!isActive) await this.revokeRefreshTokens(userId);
  }

  async resetUserPassword(userId: number, newPassword: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const hashed = await bcrypt.hash(newPassword, 12);
    await this.userRepo.update(userId, { password: hashed });
    await this.revokeRefreshTokens(userId);
  }

  /** Sign the user out of every device (their refresh tokens stop working). */
  private async revokeRefreshTokens(userId: number): Promise<void> {
    await this.userRepo.manager.update(
      RefreshToken,
      { user_id: userId, revoked_at: IsNull() },
      { revoked_at: new Date() },
    );
  }

  async getUserProfile(userId: number) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const progress = await this.progressRepo.findOne({
      where: { user_id: userId },
    });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar ?? null,
      role_id: user.role_id,
      is_active: user.is_active,
      is_verified: user.is_verified,
      has_teacher_card: (await this.userIdsWithCard(userId)).has(userId),
      teacher_status: user.teacher_status,
      teacher_organization: user.teacher_organization,
      teacher_reject_reason: user.teacher_reject_reason,
      created_at: user.created_at,
      xp: progress?.xp ?? 0,
      level: progress?.level ?? 1,
      streak_count: progress?.streak_count ?? 0,
      longest_streak: progress?.longest_streak ?? 0,
      total_cards_studied: progress?.total_cards_studied ?? 0,
      total_quizzes_completed: progress?.total_quizzes_completed ?? 0,
    };
  }

  /**
   * Delete many users in ONE transaction (all or nothing); ids that don't exist
   * are skipped. Returns how many were removed.
   */
  async deleteUsers(ids: number[]): Promise<number> {
    const unique = [...new Set(ids)];
    if (!unique.length) return 0;
    const existing = await this.userRepo.find({
      where: { id: In(unique) },
      select: ['id', 'role_id'],
    });
    if (!existing.length) return 0;
    if (existing.some((u) => u.role_id === ROLE_ADMIN)) {
      throw new ForbiddenException('Admin accounts cannot be deleted.');
    }
    await this.userRepo.manager.transaction(async (m) => {
      for (const u of existing) await this.purgeUser(m, u.id);
    });
    return existing.length;
  }

  /**
   * Permanently delete a user AND every record tied to them, atomically.
   * The cascade is done explicitly here (not only via DB foreign keys), so it is
   * correct even on a database where `pnpm sync:fks` has not been run yet:
   * nothing this account owns or produced may survive its deletion.
   */
  async deleteUser(userId: number): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role_id === ROLE_ADMIN) {
      throw new ForbiddenException('Admin accounts cannot be deleted.');
    }

    await this.userRepo.manager.transaction((m) => this.purgeUser(m, userId));
  }

  /** The ordered cascade for one user, run inside the caller's transaction. */
  private async purgeUser(m: EntityManager, userId: number): Promise<void> {
    // Classes this teacher owns → drop their enrollments, then the classes.
    const owned = await m.find(Class, {
      where: { teacher_id: userId },
      select: ['id'],
    });
    const classIds = owned.map((c) => c.id);
    if (classIds.length) {
      await m.delete(ClassEnrollment, { class_id: In(classIds) });
      await m.delete(Class, { id: In(classIds) });
    }

    // This user's own enrollments (when they are a student).
    await m.delete(ClassEnrollment, { student_id: userId });

    // Content authored by this teacher. Other students' completions of this
    // teacher's lessons go first, so no lesson_completions row is orphaned.
    const ownedLessons = await m.find(Lesson, {
      where: { teacher_id: userId },
      select: ['id'],
    });
    const lessonIds = ownedLessons.map((l) => l.id);
    if (lessonIds.length)
      await m.delete(LessonCompletion, { lesson_id: In(lessonIds) });
    await m.delete(Lesson, { teacher_id: userId });
    await m.delete(VocabSet, { teacher_id: userId });
    // Spaced-repetition state: this user's reviews, plus everyone's reviews of
    // the decks this user owns (those decks are deleted next).
    await m.delete(CardReview, { user_id: userId });
    const ownedDecks = await m.find(FlashcardDeck, {
      where: { owner_id: userId },
      select: ['id'],
    });
    const deckIds = ownedDecks.map((d) => d.id);
    if (deckIds.length) await m.delete(CardReview, { deck_id: In(deckIds) });
    await m.delete(FlashcardDeck, { owner_id: userId });
    await m.delete(TestSubmission, { student_id: userId });
    // Every student's submissions to this teacher's tests, then the tests.
    const ownedTests = await m.find(Test, {
      where: { teacher_id: userId },
      select: ['id'],
    });
    const testIds = ownedTests.map((t) => t.id);
    if (testIds.length)
      await m.delete(TestSubmission, { test_id: In(testIds) });
    await m.delete(Test, { teacher_id: userId });
    await m.delete(Assignment, { teacher_id: userId });

    // Personal learning data.
    await m.delete(UserProgress, { user_id: userId });
    await m.delete(DailyActivity, { user_id: userId });
    await m.delete(LessonCompletion, { user_id: userId });
    await m.delete(UserGoalSettings, { user_id: userId });
    await m.delete(UserCustomGoal, { user_id: userId });
    await m.delete(RefreshToken, { user_id: userId });
    await m.delete(ExamAttempt, { user_id: userId });

    // Finally the account itself.
    await m.delete(User, { id: userId });
  }
}
