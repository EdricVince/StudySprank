import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Test, TestQuestion } from './entities/test.entity';
import { TestSubmission } from './entities/test-submission.entity';
import { ClassEnrollment } from '../classes/entities/class-enrollment.entity';
import { User } from '../users/entities/user.entity';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ROLE_TEACHER, ROLE_ADMIN } from '../roles/entities/role.entity';

/** A test as a student sees it before submitting: no `correct` index. */
export type StudentTestView = Omit<Test, 'questions'> & {
  questions: { question: string; options: string[]; points: number }[];
};

export class CreateTestDto {
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() class_id?: number;
  @IsOptional() @IsInt() time_limit?: number;
  @IsOptional() @IsBoolean() is_published?: boolean;
  @IsOptional() @IsArray() questions?: TestQuestion[];
}

export class UpdateTestDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() class_id?: number;
  @IsOptional() @IsInt() time_limit?: number;
  @IsOptional() @IsBoolean() is_published?: boolean;
  @IsOptional() @IsArray() questions?: TestQuestion[];
}

export class SubmitTestDto {
  @IsArray() answers!: number[];
}

@Injectable()
export class TestsService {
  constructor(
    @InjectRepository(Test) private testRepo: Repository<Test>,
    @InjectRepository(TestSubmission)
    private subRepo: Repository<TestSubmission>,
    @InjectRepository(ClassEnrollment)
    private enrollRepo: Repository<ClassEnrollment>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  private pts(q: TestQuestion): number {
    return q.points && q.points > 0 ? q.points : 1;
  }

  async create(
    teacherId: number,
    roleId: number,
    dto: CreateTestDto,
  ): Promise<Test> {
    if (roleId !== ROLE_TEACHER)
      throw new ForbiddenException('Only teachers can create tests');
    const test = this.testRepo.create({
      teacher_id: teacherId,
      class_id: dto.class_id ?? null,
      title: dto.title,
      description: dto.description ?? null,
      questions: (dto.questions ?? []).map((q) => ({
        ...q,
        points: this.pts(q),
      })),
      time_limit: dto.time_limit ?? null,
      is_published: dto.is_published ?? false,
    });
    return this.testRepo.save(test);
  }

  /** List — teacher: own tests + submission stats; student: published tests for enrolled classes + public (with the student's own latest score). */
  async findForUser(userId: number, roleId: number): Promise<any[]> {
    if (roleId === ROLE_TEACHER || roleId === ROLE_ADMIN) {
      const tests = await this.testRepo.find({
        where: roleId === ROLE_TEACHER ? { teacher_id: userId } : {},
        order: { created_at: 'DESC' },
      });
      const ids = tests.map((t) => t.id);
      const subs = ids.length
        ? await this.subRepo.find({ where: { test_id: In(ids) } })
        : [];
      return tests.map((t) => {
        const ts = subs.filter((s) => s.test_id === t.id);
        const avg = ts.length
          ? Math.round(
              ts.reduce(
                (a, s) => a + (s.total ? (s.score / s.total) * 100 : 0),
                0,
              ) / ts.length,
            )
          : 0;
        return {
          ...t,
          question_count: t.questions.length,
          submission_count: ts.length,
          avg_score: avg,
        };
      });
    }
    // Student: published tests visible to them.
    const enrollments = await this.enrollRepo.find({
      where: { student_id: userId },
    });
    const classIds = enrollments.map((e) => e.class_id);
    const qb = this.testRepo
      .createQueryBuilder('t')
      .where('t.is_published = true');
    if (classIds.length)
      qb.andWhere('(t.class_id IN (:...classIds) OR t.class_id IS NULL)', {
        classIds,
      });
    else qb.andWhere('t.class_id IS NULL');
    const tests = await qb.orderBy('t.created_at', 'DESC').getMany();

    const ids = tests.map((t) => t.id);
    const mySubs = ids.length
      ? await this.subRepo.find({
          where: { test_id: In(ids), student_id: userId },
        })
      : [];
    return tests.map((t) => {
      const my = mySubs
        .filter((s) => s.test_id === t.id)
        .sort((a, b) => b.id - a.id)[0];
      return {
        id: t.id,
        title: t.title,
        description: t.description,
        question_count: t.questions.length,
        time_limit: t.time_limit,
        class_id: t.class_id,
        created_at: t.created_at,
        my_score: my ? my.score : null,
        my_total: my ? my.total : null,
      };
    });
  }

  /** One test — teacher/admin get the full test (with correct answers); students get it with the correct index stripped (for taking). */
  async findOne(
    id: number,
    userId: number,
    roleId: number,
  ): Promise<Test | StudentTestView> {
    const test = await this.testRepo.findOne({ where: { id } });
    if (!test) throw new NotFoundException('Test not found');
    if (roleId === ROLE_ADMIN) return test;
    if (roleId === ROLE_TEACHER) {
      if (test.teacher_id !== userId)
        throw new ForbiddenException('Not your test');
      return test;
    }
    // Student
    if (!test.is_published) throw new NotFoundException('Test not found');
    if (test.class_id) {
      const enrolled = await this.enrollRepo.findOne({
        where: { class_id: test.class_id, student_id: userId },
      });
      if (!enrolled)
        throw new ForbiddenException('You are not enrolled in this class');
    }
    return {
      ...test,
      questions: test.questions.map((q) => ({
        question: q.question,
        options: q.options,
        points: this.pts(q),
      })),
    };
  }

  async update(
    id: number,
    teacherId: number,
    dto: UpdateTestDto,
  ): Promise<Test> {
    const test = await this.testRepo.findOne({ where: { id } });
    if (!test) throw new NotFoundException('Test not found');
    if (test.teacher_id !== teacherId)
      throw new ForbiddenException('Not your test');
    if (dto.questions)
      dto.questions = dto.questions.map((q) => ({ ...q, points: this.pts(q) }));
    Object.assign(test, dto);
    return this.testRepo.save(test);
  }

  async remove(id: number, teacherId: number): Promise<void> {
    const test = await this.testRepo.findOne({ where: { id } });
    if (!test) throw new NotFoundException('Test not found');
    if (test.teacher_id !== teacherId)
      throw new ForbiddenException('Not your test');
    await this.testRepo.delete(id);
  }

  /** Student submits answers → auto-grade → save + return the score. */
  async submit(
    testId: number,
    studentId: number,
    answers: number[],
  ): Promise<{ score: number; total: number; submission_id: number }> {
    const test = await this.testRepo.findOne({ where: { id: testId } });
    if (!test) throw new NotFoundException('Test not found');
    // The owner may preview-submit their own test (even a draft); others need it published + (if class-scoped) enrolled.
    const isOwner = test.teacher_id === studentId;
    if (!isOwner) {
      if (!test.is_published) throw new NotFoundException('Test not found');
      if (test.class_id) {
        const enrolled = await this.enrollRepo.findOne({
          where: { class_id: test.class_id, student_id: studentId },
        });
        if (!enrolled)
          throw new ForbiddenException('You are not enrolled in this class');
      }
    }
    let score = 0;
    let total = 0;
    test.questions.forEach((q, i) => {
      const p = this.pts(q);
      total += p;
      if (answers[i] === q.correct) score += p;
    });
    const sub = await this.subRepo.save(
      this.subRepo.create({
        test_id: testId,
        student_id: studentId,
        answers,
        score,
        total,
      }),
    );
    return { score, total, submission_id: sub.id };
  }

  /** Teacher views all submissions for their test (with student names). */
  async getSubmissions(testId: number, teacherId: number): Promise<any[]> {
    const test = await this.testRepo.findOne({ where: { id: testId } });
    if (!test) throw new NotFoundException('Test not found');
    if (test.teacher_id !== teacherId)
      throw new ForbiddenException('Not your test');
    const subs = await this.subRepo.find({
      where: { test_id: testId },
      order: { created_at: 'DESC' },
    });
    const studentIds = [...new Set(subs.map((s) => s.student_id))];
    const users = studentIds.length
      ? await this.userRepo.find({ where: { id: In(studentIds) } })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));
    return subs.map((s) => {
      const u = byId.get(s.student_id);
      return {
        id: s.id,
        student_id: s.student_id,
        student_name: u?.name ?? u?.email?.split('@')[0] ?? 'Student',
        student_email: u?.email,
        score: s.score,
        total: s.total,
        submitted_at: s.created_at,
      };
    });
  }
}
