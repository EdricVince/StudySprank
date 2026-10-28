import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Class } from './entities/class.entity';
import { ClassEnrollment } from './entities/class-enrollment.entity';
import { User } from '../users/entities/user.entity';
import { ROLE_TEACHER, ROLE_ADMIN } from '../roles/entities/role.entity';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  Max,
  MinLength,
} from 'class-validator';

export class CreateClassDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  student_limit?: number;
}

export class UpdateClassDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  student_limit?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Class)
    private classRepo: Repository<Class>,
    @InjectRepository(ClassEnrollment)
    private enrollRepo: Repository<ClassEnrollment>,
  ) {}

  private generateCode(): string {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const prefix = Array.from(
      { length: 3 },
      () => letters[Math.floor(Math.random() * letters.length)],
    ).join('');
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${num}`;
  }

  private async getStudentCounts(
    classIds: number[],
  ): Promise<Map<number, number>> {
    if (!classIds.length) return new Map();
    const rows = await this.enrollRepo
      .createQueryBuilder('e')
      .select('e.class_id', 'class_id')
      .addSelect('COUNT(*)', 'cnt')
      .where('e.class_id IN (:...ids)', { ids: classIds })
      .groupBy('e.class_id')
      .getRawMany<{ class_id: number; cnt: string }>();
    return new Map(rows.map((r) => [r.class_id, parseInt(r.cnt, 10)]));
  }

  async create(
    teacherId: number,
    dto: CreateClassDto,
  ): Promise<Class & { student_count: number }> {
    let code = this.generateCode();
    while (await this.classRepo.findOne({ where: { class_code: code } })) {
      code = this.generateCode();
    }
    const cls = this.classRepo.create({
      teacher_id: teacherId,
      name: dto.name,
      subject: dto.subject ?? null,
      description: dto.description ?? null,
      student_limit: dto.student_limit ?? 30,
      class_code: code,
      is_active: true,
    });
    const saved = await this.classRepo.save(cls);
    return { ...saved, student_count: 0 };
  }

  async findAll(
    userId: number,
    roleId: number,
  ): Promise<(Class & { student_count: number })[]> {
    let classes: Class[];

    if (roleId === ROLE_TEACHER) {
      classes = await this.classRepo.find({
        where: { teacher_id: userId },
        order: { created_at: 'DESC' },
      });
    } else {
      const enrollments = await this.enrollRepo.find({
        where: { student_id: userId },
      });
      if (!enrollments.length) return [];
      const classIds = enrollments.map((e) => e.class_id);
      classes = await this.classRepo.findBy({ id: In(classIds) });
    }

    if (!classes.length) return [];
    const countMap = await this.getStudentCounts(classes.map((c) => c.id));
    return classes.map((cls) => ({
      ...cls,
      student_count: countMap.get(cls.id) ?? 0,
    }));
  }

  /** Internal: fetch a class with its student count, no access control. */
  async findOne(id: number): Promise<Class & { student_count: number }> {
    const cls = await this.classRepo.findOne({ where: { id } });
    if (!cls) throw new NotFoundException('Class not found');
    const countMap = await this.getStudentCounts([id]);
    return { ...cls, student_count: countMap.get(id) ?? 0 };
  }

  /**
   * Access-controlled read for GET /classes/:id.
   * A teacher may only see their own class; a student only a class they are
   * enrolled in; an admin may see any. This prevents unrelated users from
   * reading a class by guessing its id.
   */
  async findOneForUser(
    id: number,
    userId: number,
    roleId: number,
  ): Promise<Class & { student_count: number }> {
    const cls = await this.classRepo.findOne({ where: { id } });
    if (!cls) throw new NotFoundException('Class not found');

    if (roleId === ROLE_ADMIN) {
      // full access
    } else if (roleId === ROLE_TEACHER) {
      if (cls.teacher_id !== userId)
        throw new ForbiddenException('Not your class');
    } else {
      const enrolled = await this.enrollRepo.findOne({
        where: { class_id: id, student_id: userId },
      });
      if (!enrolled)
        throw new ForbiddenException('You are not enrolled in this class');
    }

    const countMap = await this.getStudentCounts([id]);
    return { ...cls, student_count: countMap.get(id) ?? 0 };
  }

  async update(
    id: number,
    teacherId: number,
    dto: UpdateClassDto,
  ): Promise<Class & { student_count: number }> {
    const cls = await this.classRepo.findOne({ where: { id } });
    if (!cls) throw new NotFoundException('Class not found');
    if (cls.teacher_id !== teacherId)
      throw new ForbiddenException('Not your class');
    Object.assign(cls, dto);
    await this.classRepo.save(cls);
    return this.findOne(id);
  }

  async delete(id: number, teacherId: number): Promise<void> {
    const cls = await this.classRepo.findOne({ where: { id } });
    if (!cls) throw new NotFoundException('Class not found');
    if (cls.teacher_id !== teacherId)
      throw new ForbiddenException('Not your class');
    await this.enrollRepo.delete({ class_id: id });
    await this.classRepo.delete(id);
  }

  async getStudents(classId: number, teacherId: number) {
    const cls = await this.classRepo.findOne({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Class not found');
    if (cls.teacher_id !== teacherId)
      throw new ForbiddenException('Not your class');

    return this.enrollRepo
      .createQueryBuilder('e')
      .leftJoin(User, 'u', 'u.id = e.student_id')
      .select([
        'e.id         AS id',
        'e.class_id   AS class_id',
        'e.student_id AS student_id',
        'e.joined_at  AS joined_at',
        'u.email      AS student_email',
        'u.name       AS student_name',
      ])
      .where('e.class_id = :classId', { classId })
      .getRawMany();
  }

  async removeStudent(
    classId: number,
    studentId: number,
    teacherId: number,
  ): Promise<void> {
    const cls = await this.classRepo.findOne({ where: { id: classId } });
    if (!cls) throw new NotFoundException('Class not found');
    if (cls.teacher_id !== teacherId)
      throw new ForbiddenException('Not your class');
    const enrollment = await this.enrollRepo.findOne({
      where: { class_id: classId, student_id: studentId },
    });
    if (!enrollment) throw new NotFoundException('Student not in class');
    await this.enrollRepo.delete({ class_id: classId, student_id: studentId });
  }

  /** A student leaves a class they joined (their progress and test results stay). */
  async leaveClass(classId: number, studentId: number): Promise<void> {
    const enrollment = await this.enrollRepo.findOne({
      where: { class_id: classId, student_id: studentId },
    });
    if (!enrollment) throw new NotFoundException('You are not in this class');
    await this.enrollRepo.delete({ class_id: classId, student_id: studentId });
  }

  async joinClass(
    classCode: string,
    studentId: number,
  ): Promise<Class & { student_count: number }> {
    const cls = await this.classRepo.findOne({
      where: { class_code: classCode, is_active: true },
      relations: { teacher: true },
    });
    if (!cls) throw new NotFoundException('Class not found or inactive');
    // A class of a teacher who has not been (or is no longer) approved is closed.
    if (cls.teacher && cls.teacher.teacher_status !== 'approved') {
      throw new NotFoundException('Class not found or inactive');
    }

    const existing = await this.enrollRepo.findOne({
      where: { class_id: cls.id, student_id: studentId },
    });
    if (existing) throw new ConflictException('Already enrolled in this class');

    const countMap = await this.getStudentCounts([cls.id]);
    const count = countMap.get(cls.id) ?? 0;
    if (count >= cls.student_limit)
      throw new BadRequestException('Class is full');

    await this.enrollRepo.save(
      this.enrollRepo.create({ class_id: cls.id, student_id: studentId }),
    );
    return this.findOne(cls.id);
  }
}
