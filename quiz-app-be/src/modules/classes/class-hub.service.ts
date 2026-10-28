import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Class } from './entities/class.entity';
import { ROLE_ADMIN, ROLE_TEACHER } from '../roles/entities/role.entity';
import type { CurrentUserData } from '../../core/decorators/current-user.decorator';

export interface ClassHubStudent {
  id: number;
  name: string;
  email: string;
  joined_at: Date;
  xp: number;
  level: number;
  streak_count: number;
  tests_taken: number;
  avg_score: number;
}

/** Everything that belongs to one class, in a single response. */
export interface ClassHub {
  class: {
    id: number;
    name: string;
    subject: string | null;
    description: string | null;
    class_code: string | null;
    student_limit: number;
    is_active: boolean;
    student_count: number;
  };
  teacher_name: string;
  tests: Record<string, unknown>[];
  assignments: Record<string, unknown>[];
  lessons: Record<string, unknown>[];
  vocab_sets: Record<string, unknown>[];
  decks: Record<string, unknown>[];
  /** Roster with each student's progress — the class's teacher (or an admin) only. */
  students: ClassHubStudent[] | null;
}

type Row = Record<string, unknown>;

/**
 * The class "hub": the same endpoint feeds the teacher's class page (all content +
 * roster with progress) and the student's class page (published content only).
 * Plain SQL keeps it to a handful of light queries — no heavy JSON columns are loaded.
 */
@Injectable()
export class ClassHubService {
  constructor(
    @InjectRepository(Class) private readonly classRepo: Repository<Class>,
  ) {}

  private async assertAccess(
    cls: Class,
    user: CurrentUserData,
  ): Promise<{ staff: boolean }> {
    if (user.role_id === ROLE_ADMIN) return { staff: true };
    if (user.role_id === ROLE_TEACHER) {
      if (user.teacher_status !== 'approved' || cls.teacher_id !== user.id) {
        throw new ForbiddenException('Not your class');
      }
      return { staff: true };
    }
    const enrolled: unknown = await this.classRepo.query(
      `SELECT 1 FROM class_enrollments WHERE class_id = $1 AND student_id = $2 LIMIT 1`,
      [cls.id, user.id],
    );
    if (!Array.isArray(enrolled) || enrolled.length === 0) {
      throw new ForbiddenException('You are not enrolled in this class');
    }
    return { staff: false };
  }

  async getHub(classId: number, user: CurrentUserData): Promise<ClassHub> {
    const cls = await this.classRepo.findOne({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Class not found');
    const { staff } = await this.assertAccess(cls, user);

    // Students only see what the teacher has published.
    const published = staff ? '' : ' AND is_published = true';
    const q = (sql: string): Promise<Row[]> =>
      this.classRepo.query(sql, [classId]) as Promise<Row[]>;
    const len = (col: string) =>
      `CASE WHEN jsonb_typeof(${col}) = 'array' THEN jsonb_array_length(${col}) ELSE 0 END`;

    const [tests, assignments, lessons, vocabSets, decks, teacher, count] =
      await Promise.all([
        q(
          `SELECT id, title, description, time_limit, is_published, created_at, ${len('questions')} AS question_count
           FROM tests WHERE class_id = $1${published} ORDER BY created_at DESC`,
        ),
        q(
          `SELECT id, title, description, attachment_name, (attachment IS NOT NULL) AS has_attachment, is_published, created_at
           FROM assignments WHERE class_id = $1${published} ORDER BY created_at DESC`,
        ),
        q(
          `SELECT id, title, description, category, difficulty, is_published, created_at
           FROM lessons WHERE class_id = $1${published} ORDER BY created_at DESC`,
        ),
        q(
          `SELECT id, name, language, level, is_published, created_at, ${len('words')} AS word_count
           FROM vocab_sets WHERE class_id = $1${published} ORDER BY created_at DESC`,
        ),
        q(
          `SELECT id, title, description, category, created_at, ${len('cards')} AS card_count
           FROM flashcard_decks WHERE class_id = $1 ORDER BY created_at DESC`,
        ),
        this.classRepo.query(
          `SELECT COALESCE(name, split_part(email, '@', 1)) AS name FROM users WHERE id = $1`,
          [cls.teacher_id],
        ) as Promise<{ name: string }[]>,
        q(
          `SELECT COUNT(*)::int AS n FROM class_enrollments WHERE class_id = $1`,
        ),
      ]);

    return {
      class: {
        id: cls.id,
        name: cls.name,
        subject: cls.subject,
        description: cls.description,
        class_code: staff ? cls.class_code : null,
        student_limit: cls.student_limit,
        is_active: cls.is_active,
        student_count: Number(count[0]?.n ?? 0),
      },
      teacher_name: teacher[0]?.name ?? '',
      tests,
      assignments,
      lessons,
      vocab_sets: vocabSets,
      decks,
      students: staff ? await this.getStudents(classId) : null,
    };
  }

  private getStudents(classId: number): Promise<ClassHubStudent[]> {
    return this.classRepo.query(
      `SELECT u.id,
              COALESCE(u.name, split_part(u.email, '@', 1)) AS name,
              u.email,
              e.joined_at,
              COALESCE(p.xp, 0)::int AS xp,
              COALESCE(p.level, 1)::int AS level,
              COALESCE(p.streak_count, 0)::int AS streak_count,
              (SELECT COUNT(*)::int FROM test_submissions s JOIN tests t ON t.id = s.test_id
                WHERE s.student_id = u.id AND t.class_id = $1) AS tests_taken,
              (SELECT COALESCE(ROUND(AVG(s.score::numeric / NULLIF(s.total, 0) * 100)), 0)::int
                 FROM test_submissions s JOIN tests t ON t.id = s.test_id
                WHERE s.student_id = u.id AND t.class_id = $1) AS avg_score
         FROM class_enrollments e
         JOIN users u ON u.id = e.student_id
         LEFT JOIN user_progress p ON p.user_id = u.id
        WHERE e.class_id = $1
        ORDER BY e.joined_at`,
      [classId],
    ) as Promise<ClassHubStudent[]>;
  }
}
