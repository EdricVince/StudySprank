import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from './roles.guard';

/**
 * Build a fake ExecutionContext whose request carries the given role_id
 * (or no user at all when roleId is undefined).
 */
function context(roleId?: number, teacherStatus = 'approved') {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        user:
          roleId === undefined
            ? undefined
            : { role_id: roleId, teacher_status: teacherStatus },
      }),
    }),
  } as any;
}

describe('RolesGuard', () => {
  /** A guard whose Reflector reports the given required roles. */
  const guardRequiring = (required?: number[]) => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(required),
    } as any;
    return new RolesGuard(reflector);
  };

  it('allows any authenticated user when no @Roles metadata is present', () => {
    expect(guardRequiring(undefined).canActivate(context(1))).toBe(true);
    expect(guardRequiring([]).canActivate(context(2))).toBe(true);
  });

  it('allows a user whose role is in the required list', () => {
    expect(guardRequiring([2]).canActivate(context(2))).toBe(true);
    expect(guardRequiring([2, 3]).canActivate(context(3))).toBe(true);
  });

  it('blocks a student (role 1) from a teacher-only (role 2) route with 403', () => {
    expect(() => guardRequiring([2]).canActivate(context(1))).toThrow(
      ForbiddenException,
    );
  });

  it.each(['pending', 'rejected', 'none'])(
    'blocks a teacher whose status is "%s" from teacher routes',
    (status) => {
      expect(() => guardRequiring([2]).canActivate(context(2, status))).toThrow(
        'awaiting approval',
      );
    },
  );

  it('does not apply the approval check to admins', () => {
    expect(guardRequiring([3]).canActivate(context(3, 'none'))).toBe(true);
  });

  it('blocks a request with no role_id', () => {
    expect(() => guardRequiring([2]).canActivate(context(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
