import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from './entities/assignment.entity';
import { ClassEnrollment } from '../classes/entities/class-enrollment.entity';
import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { ROLE_TEACHER, ROLE_ADMIN } from '../roles/entities/role.entity';

export class CreateAssignmentDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() attachment?: string;
  @IsOptional() @IsString() attachment_name?: string;
  @IsOptional() @IsInt() class_id?: number;
  @IsOptional() @IsBoolean() is_published?: boolean;
}

export class UpdateAssignmentDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() attachment?: string;
  @IsOptional() @IsString() attachment_name?: string;
  @IsOptional() @IsBoolean() is_published?: boolean;
}

@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private repo: Repository<Assignment>,
    @InjectRepository(ClassEnrollment)
    private enrollRepo: Repository<ClassEnrollment>,
  ) {}

  async create(
    teacherId: number,
    roleId: number,
    dto: CreateAssignmentDto,
  ): Promise<Assignment> {
    if (roleId !== ROLE_TEACHER)
      throw new ForbiddenException('Only teachers can create assignments');
    const a = this.repo.create({
      teacher_id: teacherId,
      class_id: dto.class_id ?? null,
      title: dto.title,
      description: dto.description ?? null,
      attachment: dto.attachment ?? null,
      attachment_name: dto.attachment_name ?? null,
      is_published: dto.is_published ?? false,
    });
    return this.repo.save(a);
  }

  async findForUser(userId: number, roleId: number): Promise<Assignment[]> {
    if (roleId === ROLE_TEACHER) {
      return this.repo.find({
        where: { teacher_id: userId },
        order: { created_at: 'DESC' },
      });
    }
    if (roleId === ROLE_ADMIN) {
      return this.repo.find({ order: { created_at: 'DESC' } });
    }
    const enrollments = await this.enrollRepo.find({
      where: { student_id: userId },
    });
    const classIds = enrollments.map((e) => e.class_id);
    const qb = this.repo.createQueryBuilder('a').where('a.is_published = true');
    if (classIds.length)
      qb.andWhere('(a.class_id IN (:...classIds) OR a.class_id IS NULL)', {
        classIds,
      });
    else qb.andWhere('a.class_id IS NULL');
    return qb.orderBy('a.created_at', 'DESC').getMany();
  }

  async findOne(
    id: number,
    userId: number,
    roleId: number,
  ): Promise<Assignment> {
    const a = await this.repo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Assignment not found');
    if (roleId === ROLE_ADMIN) return a;
    if (roleId === ROLE_TEACHER) {
      if (a.teacher_id !== userId)
        throw new ForbiddenException('Not your assignment');
      return a;
    }
    if (!a.is_published) throw new NotFoundException('Assignment not found');
    if (a.class_id) {
      const enrolled = await this.enrollRepo.findOne({
        where: { class_id: a.class_id, student_id: userId },
      });
      if (!enrolled)
        throw new ForbiddenException('You are not enrolled in this class');
    }
    return a;
  }

  async update(
    id: number,
    teacherId: number,
    dto: UpdateAssignmentDto,
  ): Promise<Assignment> {
    const a = await this.repo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Assignment not found');
    if (a.teacher_id !== teacherId)
      throw new ForbiddenException('Not your assignment');
    Object.assign(a, dto);
    return this.repo.save(a);
  }

  async remove(id: number, teacherId: number): Promise<void> {
    const a = await this.repo.findOne({ where: { id } });
    if (!a) throw new NotFoundException('Assignment not found');
    if (a.teacher_id !== teacherId)
      throw new ForbiddenException('Not your assignment');
    await this.repo.delete(id);
  }
}
