import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AdminService } from './admin.service';

describe('AdminService.deleteUser — transactional cascade', () => {
  it('throws NotFound when the user does not exist', async () => {
    const userRepo = { findOne: jest.fn().mockResolvedValue(null) } as any;
    const service = new AdminService(userRepo, {} as any);
    await expect(service.deleteUser(1)).rejects.toThrow(NotFoundException);
  });

  it('deletes every user-related table inside one transaction, user last', async () => {
    const deleted: string[] = [];
    const manager = {
      // one owned class → its enrollments + the class get removed
      find: jest.fn().mockResolvedValue([{ id: 5 }]),
      delete: jest.fn().mockImplementation((entity: any) => {
        deleted.push(entity.name);
        return Promise.resolve({});
      }),
    };
    const userRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 1 }),
      manager: {
        transaction: jest.fn().mockImplementation((cb: any) => cb(manager)),
      },
    } as any;
    const service = new AdminService(userRepo, {} as any);

    await service.deleteUser(1);

    // Every table that references a user is cleared...
    expect(deleted).toEqual(
      expect.arrayContaining([
        'ClassEnrollment',
        'Class',
        'Lesson',
        'UserProgress',
        'ExamAttempt',
        'DailyActivity',
        'UserGoalSettings',
        'UserCustomGoal',
        'User',
      ]),
    );
    // ...and the account row itself is deleted last, so nothing is orphaned.
    expect(deleted[deleted.length - 1]).toBe('User');
    expect(userRepo.manager.transaction).toHaveBeenCalledTimes(1);
  });

  it('clears spaced-repetition reviews before deleting the flashcard decks', async () => {
    const deleted: string[] = [];
    const manager = {
      find: jest.fn().mockResolvedValue([{ id: 5 }]),
      delete: jest.fn().mockImplementation((entity: any) => {
        deleted.push(entity.name);
        return Promise.resolve({});
      }),
    };
    const userRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 1 }),
      manager: {
        transaction: jest.fn().mockImplementation((cb: any) => cb(manager)),
      },
    } as any;
    await new AdminService(userRepo, {} as any).deleteUser(1);

    expect(deleted.filter((n) => n === 'CardReview')).toHaveLength(2); // own reviews + reviews of owned decks
    expect(deleted.lastIndexOf('CardReview')).toBeLessThan(
      deleted.indexOf('FlashcardDeck'),
    );
  });

  it("removes OTHER students' submissions/completions of a deleted teacher's tests and lessons", async () => {
    const calls: Array<[string, any]> = [];
    const manager = {
      find: jest.fn().mockResolvedValue([{ id: 5 }]),
      delete: jest.fn().mockImplementation((entity: any, crit: any) => {
        calls.push([entity.name, crit]);
        return Promise.resolve({});
      }),
    };
    const userRepo = {
      findOne: jest.fn().mockResolvedValue({ id: 1 }),
      manager: {
        transaction: jest.fn().mockImplementation((cb: any) => cb(manager)),
      },
    } as any;
    await new AdminService(userRepo, {} as any).deleteUser(1);

    const names = calls.map(([n]) => n);
    const byTest = calls.findIndex(
      ([n, c]) => n === 'TestSubmission' && 'test_id' in c,
    );
    const byLesson = calls.findIndex(
      ([n, c]) => n === 'LessonCompletion' && 'lesson_id' in c,
    );
    expect(byTest).toBeGreaterThanOrEqual(0);
    expect(byTest).toBeLessThan(names.indexOf('Test'));
    expect(byLesson).toBeGreaterThanOrEqual(0);
    expect(byLesson).toBeLessThan(names.indexOf('Lesson'));
  });
});

describe('AdminService.deleteUsers — bulk delete', () => {
  it('deletes all existing users in ONE transaction and skips unknown ids', async () => {
    const deletedUsers: number[] = [];
    const manager = {
      find: jest.fn().mockResolvedValue([]),
      delete: jest.fn().mockImplementation((entity: any, crit: any) => {
        if (entity.name === 'User') deletedUsers.push(crit.id);
        return Promise.resolve({});
      }),
    };
    const userRepo = {
      find: jest.fn().mockResolvedValue([{ id: 2 }, { id: 3 }]), // id 99 does not exist
      manager: {
        transaction: jest.fn().mockImplementation((cb: any) => cb(manager)),
      },
    } as any;

    const n = await new AdminService(userRepo, {} as any).deleteUsers([
      2, 3, 99, 3,
    ]);

    expect(n).toBe(2);
    expect(deletedUsers).toEqual([2, 3]);
    expect(userRepo.manager.transaction).toHaveBeenCalledTimes(1);
  });

  it('does nothing when none of the ids exist', async () => {
    const userRepo = {
      find: jest.fn().mockResolvedValue([]),
      manager: { transaction: jest.fn() },
    } as any;
    expect(await new AdminService(userRepo, {} as any).deleteUsers([42])).toBe(
      0,
    );
    expect(userRepo.manager.transaction).not.toHaveBeenCalled();
  });
});

describe('AdminService — teacher verification', () => {
  const build = (user: any) => {
    const userRepo = {
      findOne: jest.fn().mockResolvedValue(user),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn((x: any) => x),
      save: jest.fn((x: any) => Promise.resolve({ id: 9, ...x })),
      manager: { update: jest.fn() },
    } as any;
    return { userRepo, service: new AdminService(userRepo, {} as any) };
  };

  it('approving a teacher marks the account verified', async () => {
    const { userRepo, service } = build({ id: 4, role_id: 2 });
    await service.reviewTeacher(4, 'approved');
    expect(userRepo.update).toHaveBeenCalledWith(
      4,
      expect.objectContaining({
        teacher_status: 'approved',
        is_verified: true,
        teacher_reject_reason: null,
      }),
    );
  });

  it('rejecting needs a reason and stores it for the teacher to read', async () => {
    const { userRepo, service } = build({ id: 4, role_id: 2 });
    await expect(service.reviewTeacher(4, 'rejected', '  ')).rejects.toThrow(
      BadRequestException,
    );
    await service.reviewTeacher(4, 'rejected', ' Blurry photo ');
    expect(userRepo.update).toHaveBeenCalledWith(
      4,
      expect.objectContaining({
        teacher_status: 'rejected',
        is_verified: false,
        teacher_reject_reason: 'Blurry photo',
      }),
    );
  });

  it('only teacher accounts can be reviewed', async () => {
    const { service } = build({ id: 4, role_id: 1 });
    await expect(service.reviewTeacher(4, 'approved')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('an admin-created teacher is approved straight away', async () => {
    const { userRepo, service } = build(null);
    await service.createTeacher('Jane Roe', 'password123');
    expect(userRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        role_id: 2,
        teacher_status: 'approved',
        is_verified: true,
      }),
    );
  });

  it('refuses to delete or deactivate an administrator', async () => {
    const { service } = build({ id: 1, role_id: 3, is_active: true });
    await expect(service.deleteUser(1)).rejects.toThrow(ForbiddenException);
    await expect(service.setUserActive(1, false)).rejects.toThrow(
      ForbiddenException,
    );
    const userRepo = {
      find: jest.fn().mockResolvedValue([
        { id: 2, role_id: 1 },
        { id: 1, role_id: 3 },
      ]),
      manager: { transaction: jest.fn() },
    } as any;
    await expect(
      new AdminService(userRepo, {} as any).deleteUsers([1, 2]),
    ).rejects.toThrow(ForbiddenException);
    expect(userRepo.manager.transaction).not.toHaveBeenCalled();
  });
});
