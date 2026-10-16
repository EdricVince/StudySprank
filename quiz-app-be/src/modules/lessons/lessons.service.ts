import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lesson } from './entities/lesson.entity';
import type { LessonContent } from './entities/lesson.entity';
import { ClassEnrollment } from '../classes/entities/class-enrollment.entity';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { ROLE_TEACHER, ROLE_ADMIN } from '../roles/entities/role.entity';

export class CreateLessonDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() difficulty?: string;
  @IsOptional() @IsInt() class_id?: number;
  @IsObject() content: LessonContent;
}

export class UpdateLessonDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() difficulty?: string;
  @IsOptional() @IsInt() class_id?: number;
  @IsOptional() @IsBoolean() is_published?: boolean;
  @IsOptional() @IsObject() content?: LessonContent;
}

@Injectable()
export class LessonsService {
  constructor(
    @InjectRepository(Lesson)
    private lessonRepo: Repository<Lesson>,
    @InjectRepository(ClassEnrollment)
    private enrollRepo: Repository<ClassEnrollment>,
  ) {}

  async create(
    teacherId: number,
    roleId: number,
    dto: CreateLessonDto,
  ): Promise<Lesson> {
    if (roleId !== ROLE_TEACHER)
      throw new ForbiddenException('Only teachers can create lessons');
    const lesson = this.lessonRepo.create({
      teacher_id: teacherId,
      class_id: dto.class_id ?? null,
      title: dto.title,
      description: dto.description ?? null,
      category: dto.category ?? 'General',
      difficulty: dto.difficulty ?? 'beginner',
      content: dto.content,
      is_published: true,
    });
    return this.lessonRepo.save(lesson);
  }

  async findForUser(
    userId: number,
    roleId: number,
  ): Promise<Omit<Lesson, 'content'>[]> {
    let lessons: Lesson[];

    if (roleId === ROLE_TEACHER) {
      lessons = await this.lessonRepo.find({
        where: { teacher_id: userId },
        order: { created_at: 'DESC' },
      });
    } else if (roleId === ROLE_ADMIN) {
      lessons = await this.lessonRepo.find({ order: { created_at: 'DESC' } });
    } else {
      // Student: get lessons for enrolled classes + public lessons (class_id IS NULL)
      const enrollments = await this.enrollRepo.find({
        where: { student_id: userId },
      });
      const classIds = enrollments.map((e) => e.class_id);

      const qb = this.lessonRepo
        .createQueryBuilder('l')
        .where('l.is_published = true');

      if (classIds.length > 0) {
        qb.andWhere('(l.class_id IN (:...classIds) OR l.class_id IS NULL)', {
          classIds,
        });
      } else {
        qb.andWhere('l.class_id IS NULL');
      }

      lessons = await qb.orderBy('l.created_at', 'DESC').getMany();
    }

    return lessons.map(
      ({ content: _c, ...rest }) => rest as Omit<Lesson, 'content'>,
    );
  }

  async findOne(id: number, userId: number, roleId: number): Promise<Lesson> {
    const lesson = await this.lessonRepo.findOne({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    if (roleId === ROLE_ADMIN) return lesson;

    if (roleId === ROLE_TEACHER) {
      if (lesson.teacher_id !== userId)
        throw new ForbiddenException('Not your lesson');
      return lesson;
    }

    // Student: verify enrollment
    if (!lesson.is_published) throw new NotFoundException('Lesson not found');

    if (lesson.class_id) {
      const enrolled = await this.enrollRepo.findOne({
        where: { class_id: lesson.class_id, student_id: userId },
      });
      if (!enrolled)
        throw new ForbiddenException('You are not enrolled in this class');
    }

    return lesson;
  }

  async update(
    id: number,
    teacherId: number,
    dto: UpdateLessonDto,
  ): Promise<Lesson> {
    const lesson = await this.lessonRepo.findOne({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.teacher_id !== teacherId)
      throw new ForbiddenException('Not your lesson');
    Object.assign(lesson, dto);
    return this.lessonRepo.save(lesson);
  }

  async remove(id: number, teacherId: number): Promise<void> {
    const lesson = await this.lessonRepo.findOne({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    if (lesson.teacher_id !== teacherId)
      throw new ForbiddenException('Not your lesson');
    await this.lessonRepo.delete(id);
  }
}
