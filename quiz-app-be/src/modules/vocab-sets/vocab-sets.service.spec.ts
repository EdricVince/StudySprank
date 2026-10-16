import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { VocabSetsService } from './vocab-sets.service';
import {
  ROLE_STUDENT,
  ROLE_TEACHER,
  ROLE_ADMIN,
} from '../roles/entities/role.entity';

describe('VocabSetsService — RBAC + resource isolation', () => {
  let service: VocabSetsService;
  let setRepo: any;
  let enrollRepo: any;

  const published = { id: 3, teacher_id: 10, class_id: 5, is_published: true };

  beforeEach(() => {
    setRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((x: any) => x),
      save: jest.fn((x: any) => ({ id: 1, ...x })),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    enrollRepo = { findOne: jest.fn(), find: jest.fn().mockResolvedValue([]) };
    service = new VocabSetsService(setRepo, enrollRepo);
  });

  describe('create', () => {
    it('rejects a non-teacher with 403', async () => {
      await expect(
        service.create(7, ROLE_STUDENT, { name: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates for a teacher with sensible defaults', async () => {
      const set = await service.create(10, ROLE_TEACHER, { name: 'Animals' });
      expect(setRepo.save).toHaveBeenCalled();
      expect(set.teacher_id).toBe(10);
      expect(set.is_published).toBe(false);
      expect(set.words).toEqual([]);
    });
  });

  describe('findOne — isolation', () => {
    it('lets the owning teacher read their set', async () => {
      setRepo.findOne.mockResolvedValue(published);
      expect((await service.findOne(3, 10, ROLE_TEACHER)).id).toBe(3);
    });

    it('blocks a different teacher with 403', async () => {
      setRepo.findOne.mockResolvedValue(published);
      await expect(service.findOne(3, 99, ROLE_TEACHER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lets an enrolled student read a published set', async () => {
      setRepo.findOne.mockResolvedValue(published);
      enrollRepo.findOne.mockResolvedValue({ id: 1 });
      expect((await service.findOne(3, 7, ROLE_STUDENT)).id).toBe(3);
    });

    it('blocks an unenrolled student with 403', async () => {
      setRepo.findOne.mockResolvedValue(published);
      enrollRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(3, 8, ROLE_STUDENT)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('hides an unpublished set from students (404)', async () => {
      setRepo.findOne.mockResolvedValue({ ...published, is_published: false });
      await expect(service.findOne(3, 7, ROLE_STUDENT)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lets any student read a public published set (class_id null)', async () => {
      setRepo.findOne.mockResolvedValue({ ...published, class_id: null });
      expect((await service.findOne(3, 8, ROLE_STUDENT)).id).toBe(3);
    });

    it('lets an admin read any set', async () => {
      setRepo.findOne.mockResolvedValue(published);
      expect((await service.findOne(3, 1, ROLE_ADMIN)).id).toBe(3);
    });

    it('throws NotFound for a missing set', async () => {
      setRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne(404, 1, ROLE_ADMIN)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update / remove — ownership', () => {
    it("blocks updating another teacher's set", async () => {
      setRepo.findOne.mockResolvedValue(published);
      await expect(service.update(3, 99, { name: 'hijack' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("blocks deleting another teacher's set", async () => {
      setRepo.findOne.mockResolvedValue(published);
      await expect(service.remove(3, 99)).rejects.toThrow(ForbiddenException);
    });

    it('lets the owner update their set', async () => {
      setRepo.findOne.mockResolvedValue({ ...published });
      await service.update(3, 10, { is_published: true });
      expect(setRepo.save).toHaveBeenCalled();
    });
  });
});
