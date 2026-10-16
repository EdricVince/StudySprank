import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VocabSet, VocabWord } from './entities/vocab-set.entity';
import { ClassEnrollment } from '../classes/entities/class-enrollment.entity';
import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ROLE_TEACHER, ROLE_ADMIN } from '../roles/entities/role.entity';

export class CreateVocabSetDto {
  @IsString() name: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsInt() class_id?: number;
  @IsOptional() @IsBoolean() is_published?: boolean;
  @IsOptional() @IsArray() words?: VocabWord[];
}

export class UpdateVocabSetDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsBoolean() is_published?: boolean;
  @IsOptional() @IsArray() words?: VocabWord[];
}

@Injectable()
export class VocabSetsService {
  constructor(
    @InjectRepository(VocabSet)
    private setRepo: Repository<VocabSet>,
    @InjectRepository(ClassEnrollment)
    private enrollRepo: Repository<ClassEnrollment>,
  ) {}

  async create(
    teacherId: number,
    roleId: number,
    dto: CreateVocabSetDto,
  ): Promise<VocabSet> {
    if (roleId !== ROLE_TEACHER)
      throw new ForbiddenException('Only teachers can create vocabulary sets');
    const set = this.setRepo.create({
      teacher_id: teacherId,
      class_id: dto.class_id ?? null,
      name: dto.name,
      language: dto.language ?? 'English',
      level: dto.level ?? 'Intermediate',
      words: dto.words ?? [],
      is_published: dto.is_published ?? false,
    });
    return this.setRepo.save(set);
  }

  async findForUser(userId: number, roleId: number): Promise<VocabSet[]> {
    if (roleId === ROLE_TEACHER) {
      return this.setRepo.find({
        where: { teacher_id: userId },
        order: { created_at: 'DESC' },
      });
    }
    if (roleId === ROLE_ADMIN) {
      return this.setRepo.find({ order: { created_at: 'DESC' } });
    }
    // Student: published sets for enrolled classes + public (class_id IS NULL)
    const enrollments = await this.enrollRepo.find({
      where: { student_id: userId },
    });
    const classIds = enrollments.map((e) => e.class_id);
    const qb = this.setRepo
      .createQueryBuilder('s')
      .where('s.is_published = true');
    if (classIds.length > 0) {
      qb.andWhere('(s.class_id IN (:...classIds) OR s.class_id IS NULL)', {
        classIds,
      });
    } else {
      qb.andWhere('s.class_id IS NULL');
    }
    return qb.orderBy('s.created_at', 'DESC').getMany();
  }

  async findOne(id: number, userId: number, roleId: number): Promise<VocabSet> {
    const set = await this.setRepo.findOne({ where: { id } });
    if (!set) throw new NotFoundException('Vocabulary set not found');

    if (roleId === ROLE_ADMIN) return set;

    if (roleId === ROLE_TEACHER) {
      if (set.teacher_id !== userId)
        throw new ForbiddenException('Not your vocabulary set');
      return set;
    }

    // Student: must be published + enrolled (public sets need no enrollment)
    if (!set.is_published)
      throw new NotFoundException('Vocabulary set not found');
    if (set.class_id) {
      const enrolled = await this.enrollRepo.findOne({
        where: { class_id: set.class_id, student_id: userId },
      });
      if (!enrolled)
        throw new ForbiddenException('You are not enrolled in this class');
    }
    return set;
  }

  async update(
    id: number,
    teacherId: number,
    dto: UpdateVocabSetDto,
  ): Promise<VocabSet> {
    const set = await this.setRepo.findOne({ where: { id } });
    if (!set) throw new NotFoundException('Vocabulary set not found');
    if (set.teacher_id !== teacherId)
      throw new ForbiddenException('Not your vocabulary set');
    Object.assign(set, dto);
    return this.setRepo.save(set);
  }

  async remove(id: number, teacherId: number): Promise<void> {
    const set = await this.setRepo.findOne({ where: { id } });
    if (!set) throw new NotFoundException('Vocabulary set not found');
    if (set.teacher_id !== teacherId)
      throw new ForbiddenException('Not your vocabulary set');
    await this.setRepo.delete(id);
  }
}
