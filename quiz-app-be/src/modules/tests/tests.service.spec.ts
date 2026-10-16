import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { TestsService } from './tests.service';
import {
  ROLE_STUDENT,
  ROLE_TEACHER,
  ROLE_ADMIN,
} from '../roles/entities/role.entity';

describe('TestsService — RBAC, isolation, grading', () => {
  let service: TestsService;
  let testRepo: any;
  let subRepo: any;
  let enrollRepo: any;
  let userRepo: any;

  const questions = [
    { question: 'q1', options: ['a', 'b'], correct: 0, points: 1 },
    { question: 'q2', options: ['x', 'y', 'z'], correct: 2, points: 2 },
  ];
  const published = {
    id: 5,
    teacher_id: 10,
    class_id: null,
    is_published: true,
    questions,
  };

  beforeEach(() => {
    testRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((x: any) => x),
      save: jest.fn((x: any) => ({ id: 1, ...x })),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    subRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((x: any) => x),
      save: jest.fn((x: any) => ({ id: 7, ...x })),
    };
    enrollRepo = { find: jest.fn().mockResolvedValue([]), findOne: jest.fn() };
    userRepo = { find: jest.fn().mockResolvedValue([]) };
    service = new TestsService(testRepo, subRepo, enrollRepo, userRepo);
  });

  it('rejects a non-teacher from creating a test', async () => {
    await expect(
      service.create(7, ROLE_STUDENT, { title: 'X' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('strips the correct index when a student fetches a test', async () => {
    testRepo.findOne.mockResolvedValue(published);
    const t = await service.findOne(5, 7, ROLE_STUDENT);
    expect('correct' in t.questions[0]).toBe(false);
    expect(t.questions[0].options).toEqual(['a', 'b']);
  });

  it('keeps the correct index for the owning teacher', async () => {
    testRepo.findOne.mockResolvedValue(published);
    const t = await service.findOne(5, 10, ROLE_TEACHER);
    expect(t.questions[0].correct).toBe(0);
  });

  it('blocks another teacher from a test they do not own', async () => {
    testRepo.findOne.mockResolvedValue(published);
    await expect(service.findOne(5, 99, ROLE_TEACHER)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('hides an unpublished test from students', async () => {
    testRepo.findOne.mockResolvedValue({ ...published, is_published: false });
    await expect(service.findOne(5, 7, ROLE_STUDENT)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('auto-grades a submission by summing the points of correct answers', async () => {
    testRepo.findOne.mockResolvedValue(published);
    const r = await service.submit(5, 7, [0, 2]); // both correct → 1 + 2
    expect(r).toEqual(expect.objectContaining({ score: 3, total: 3 }));
    const r2 = await service.submit(5, 7, [1, 2]); // q1 wrong (0 pts), q2 right (2)
    expect(r2.score).toBe(2);
    expect(r2.total).toBe(3);
  });

  it('lets an admin read any test in full', async () => {
    testRepo.findOne.mockResolvedValue(published);
    const t = await service.findOne(5, 1, ROLE_ADMIN);
    expect(t.questions[0].correct).toBe(0);
  });

  it('blocks a non-owner from viewing submissions', async () => {
    testRepo.findOne.mockResolvedValue(published);
    await expect(service.getSubmissions(5, 99)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
