import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { VideosService } from './videos.service';
import {
  ROLE_STUDENT,
  ROLE_TEACHER,
  ROLE_ADMIN,
} from '../roles/entities/role.entity';

describe('VideosService.findOneForUser — resource isolation', () => {
  let service: VideosService;
  let videoRepo: any;
  let enrollRepo: any;

  const video = { id: 3, teacher_id: 10, class_id: 5, is_published: true };

  beforeEach(() => {
    videoRepo = { findOne: jest.fn() };
    enrollRepo = { findOne: jest.fn() };
    service = new VideosService(videoRepo, enrollRepo);
  });

  it('lets the owning teacher read their video', async () => {
    videoRepo.findOne.mockResolvedValue(video);
    expect((await service.findOneForUser(3, 10, ROLE_TEACHER)).id).toBe(3);
  });

  it('blocks a different teacher with 403', async () => {
    videoRepo.findOne.mockResolvedValue(video);
    await expect(service.findOneForUser(3, 99, ROLE_TEACHER)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('lets an enrolled student read the video', async () => {
    videoRepo.findOne.mockResolvedValue(video);
    enrollRepo.findOne.mockResolvedValue({ id: 1 });
    expect((await service.findOneForUser(3, 7, ROLE_STUDENT)).id).toBe(3);
  });

  it('blocks an unenrolled student with 403', async () => {
    videoRepo.findOne.mockResolvedValue(video);
    enrollRepo.findOne.mockResolvedValue(null);
    await expect(service.findOneForUser(3, 8, ROLE_STUDENT)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('lets an admin read any video', async () => {
    videoRepo.findOne.mockResolvedValue(video);
    expect((await service.findOneForUser(3, 1, ROLE_ADMIN)).id).toBe(3);
  });

  it('lets any student read a public video (class_id null)', async () => {
    videoRepo.findOne.mockResolvedValue({ ...video, class_id: null });
    expect((await service.findOneForUser(3, 8, ROLE_STUDENT)).id).toBe(3);
  });

  it('throws NotFound for a missing video', async () => {
    videoRepo.findOne.mockResolvedValue(null);
    await expect(service.findOneForUser(404, 1, ROLE_ADMIN)).rejects.toThrow(
      NotFoundException,
    );
  });
});
