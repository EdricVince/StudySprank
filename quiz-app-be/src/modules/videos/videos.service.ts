import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { IsString, IsOptional, IsInt, MinLength, Min } from 'class-validator';
import { Video } from './entities/video.entity';
import { ClassEnrollment } from '../classes/entities/class-enrollment.entity';
import { ROLE_TEACHER, ROLE_ADMIN } from '../roles/entities/role.entity';

export class CreateVideoDto {
  @IsOptional()
  @IsInt()
  class_id?: number;

  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @MinLength(1)
  video_url: string;

  @IsOptional()
  @IsString()
  lesson_name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;
}

@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(Video)
    private videoRepo: Repository<Video>,
    @InjectRepository(ClassEnrollment)
    private enrollRepo: Repository<ClassEnrollment>,
  ) {}

  async create(teacherId: number, dto: CreateVideoDto): Promise<Video> {
    const video = this.videoRepo.create({
      teacher_id: teacherId,
      class_id: dto.class_id ?? null,
      title: dto.title,
      description: dto.description ?? null,
      video_url: dto.video_url,
      lesson_name: dto.lesson_name ?? null,
      duration: dto.duration ?? 0,
      is_published: true,
    });
    return this.videoRepo.save(video);
  }

  /**
   * Access-controlled list.
   * - Teacher: only their own videos (optionally within one of their classes).
   * - Admin: any videos (optionally by class).
   * - Student: only published videos in classes they are enrolled in, plus
   *   public videos (class_id IS NULL). A student asking for a class they are
   *   not enrolled in gets an empty list, never another class's content.
   */
  async findForUser(
    userId: number,
    roleId: number,
    classId?: number,
  ): Promise<Video[]> {
    if (roleId === ROLE_TEACHER) {
      const where: FindOptionsWhere<Video> = { teacher_id: userId };
      if (classId) where.class_id = classId;
      return this.videoRepo.find({ where, order: { created_at: 'DESC' } });
    }

    if (roleId === ROLE_ADMIN) {
      const where: FindOptionsWhere<Video> = {};
      if (classId) where.class_id = classId;
      return this.videoRepo.find({ where, order: { created_at: 'DESC' } });
    }

    // Student
    const enrollments = await this.enrollRepo.find({
      where: { student_id: userId },
    });
    const classIds = enrollments.map((e) => e.class_id);
    const qb = this.videoRepo
      .createQueryBuilder('v')
      .where('v.is_published = true');

    if (classId) {
      if (!classIds.includes(classId)) return [];
      qb.andWhere('v.class_id = :classId', { classId });
    } else if (classIds.length > 0) {
      qb.andWhere('(v.class_id IN (:...classIds) OR v.class_id IS NULL)', {
        classIds,
      });
    } else {
      qb.andWhere('v.class_id IS NULL');
    }

    return qb.orderBy('v.created_at', 'DESC').getMany();
  }

  /** Internal: fetch a video with no access control (used by update/remove). */
  async findOne(id: number): Promise<Video> {
    const video = await this.videoRepo.findOne({ where: { id } });
    if (!video) throw new NotFoundException('Video not found');
    return video;
  }

  /** Access-controlled read for GET /videos/:id (mirrors findForUser rules). */
  async findOneForUser(
    id: number,
    userId: number,
    roleId: number,
  ): Promise<Video> {
    const video = await this.videoRepo.findOne({ where: { id } });
    if (!video) throw new NotFoundException('Video not found');

    if (roleId === ROLE_ADMIN) return video;

    if (roleId === ROLE_TEACHER) {
      if (video.teacher_id !== userId)
        throw new ForbiddenException('Not your video');
      return video;
    }

    // Student
    if (!video.is_published) throw new NotFoundException('Video not found');
    if (video.class_id) {
      const enrolled = await this.enrollRepo.findOne({
        where: { class_id: video.class_id, student_id: userId },
      });
      if (!enrolled)
        throw new ForbiddenException('You are not enrolled in this class');
    }
    return video;
  }

  async update(
    id: number,
    teacherId: number,
    dto: Partial<CreateVideoDto>,
  ): Promise<Video> {
    const video = await this.findOne(id);
    if (video.teacher_id !== teacherId)
      throw new ForbiddenException('Not your video');
    Object.assign(video, dto);
    return this.videoRepo.save(video);
  }

  async remove(id: number, teacherId: number): Promise<void> {
    const video = await this.findOne(id);
    if (video.teacher_id !== teacherId)
      throw new ForbiddenException('Not your video');
    await this.videoRepo.delete(id);
  }
}
