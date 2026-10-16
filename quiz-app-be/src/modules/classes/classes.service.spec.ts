import {
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import {
  ROLE_STUDENT,
  ROLE_TEACHER,
  ROLE_ADMIN,
} from '../roles/entities/role.entity';

/** A query-builder stub whose getRawMany resolves to the given rows. */
function queryBuilder(rows: any[] = []) {
  return {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rows),
  };
}

describe('ClassesService', () => {
  let service: ClassesService;
  let classRepo: any;
  let enrollRepo: any;

  beforeEach(() => {
    classRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findBy: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    enrollRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(() => queryBuilder([])),
    };
    service = new ClassesService(classRepo, enrollRepo);
  });

  describe('findOneForUser — resource isolation', () => {
    const cls = { id: 5, teacher_id: 10, name: 'Private A' };

    it('lets the owning teacher read their class', async () => {
      classRepo.findOne.mockResolvedValue(cls);
      const res = await service.findOneForUser(5, 10, ROLE_TEACHER);
      expect(res.id).toBe(5);
    });

    it('blocks a different teacher with 403', async () => {
      classRepo.findOne.mockResolvedValue(cls);
      await expect(service.findOneForUser(5, 99, ROLE_TEACHER)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lets an enrolled student read the class', async () => {
      classRepo.findOne.mockResolvedValue(cls);
      enrollRepo.findOne.mockResolvedValue({
        id: 1,
        class_id: 5,
        student_id: 7,
      });
      const res = await service.findOneForUser(5, 7, ROLE_STUDENT);
      expect(res.id).toBe(5);
    });

    it('blocks an unenrolled student with 403', async () => {
      classRepo.findOne.mockResolvedValue(cls);
      enrollRepo.findOne.mockResolvedValue(null);
      await expect(service.findOneForUser(5, 8, ROLE_STUDENT)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lets an admin read any class', async () => {
      classRepo.findOne.mockResolvedValue(cls);
      const res = await service.findOneForUser(5, 1, ROLE_ADMIN);
      expect(res.id).toBe(5);
    });

    it('throws NotFound for a missing class', async () => {
      classRepo.findOne.mockResolvedValue(null);
      await expect(service.findOneForUser(404, 1, ROLE_ADMIN)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('ownership on mutations', () => {
    it('rejects update by a non-owner with 403', async () => {
      classRepo.findOne.mockResolvedValue({ id: 5, teacher_id: 10 });
      await expect(service.update(5, 99, { name: 'x' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects delete by a non-owner with 403', async () => {
      classRepo.findOne.mockResolvedValue({ id: 5, teacher_id: 10 });
      await expect(service.delete(5, 99)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('joinClass', () => {
    it('rejects joining a non-existent or inactive class', async () => {
      classRepo.findOne.mockResolvedValue(null);
      await expect(service.joinClass('NOPE-0000', 7)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects a duplicate enrollment', async () => {
      classRepo.findOne.mockResolvedValue({
        id: 5,
        is_active: true,
        student_limit: 30,
      });
      enrollRepo.findOne.mockResolvedValue({ id: 1 });
      await expect(service.joinClass('ABC-1234', 7)).rejects.toThrow(
        ConflictException,
      );
    });

    it('rejects when the class is already full', async () => {
      classRepo.findOne.mockResolvedValue({
        id: 5,
        is_active: true,
        student_limit: 1,
      });
      enrollRepo.findOne.mockResolvedValue(null);
      enrollRepo.createQueryBuilder.mockReturnValue(
        queryBuilder([{ class_id: 5, cnt: '1' }]),
      );
      await expect(service.joinClass('ABC-1234', 7)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('create', () => {
    it('generates a unique class code and returns student_count 0', async () => {
      classRepo.findOne.mockResolvedValue(null); // code is unique on first try
      classRepo.create.mockImplementation((x: any) => x);
      classRepo.save.mockImplementation(async (x: any) => ({ id: 1, ...x }));

      const res = await service.create(10, { name: 'New Class' });

      expect(res.teacher_id).toBe(10);
      expect(res.student_count).toBe(0);
      expect(res.class_code).toMatch(/^[A-Z]{3}-\d{4}$/);
    });
  });
});
