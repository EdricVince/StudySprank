import { ActivityLogService } from './activity-log.service';
import type { AuditRequest } from './activity-log.service';
import { findAuditRule } from './audit-rules';

describe('findAuditRule', () => {
  it('matches the audited routes by method + Express route path', () => {
    expect(findAuditRule('POST', '/api/v1/classes')?.action).toBe(
      'class.create',
    );
    expect(findAuditRule('put', '/api/v1/tests/:id')?.action).toBe(
      'test.update',
    );
    expect(
      findAuditRule('PATCH', '/api/v1/admin/users/:id/teacher-status'),
    ).toMatchObject({ action: 'teacher.review', entity: 'user' });
  });

  it('ignores reads, unknown routes and missing paths', () => {
    expect(findAuditRule('GET', '/api/v1/classes')).toBeUndefined();
    expect(findAuditRule('POST', '/api/v1/progress/activity')).toBeUndefined();
    expect(findAuditRule('POST', undefined)).toBeUndefined();
  });

  it('does not audit flashcard reviews (student study noise)', () => {
    expect(
      findAuditRule('POST', '/api/v1/flashcard-decks/:id/review'),
    ).toBeUndefined();
  });
});

describe('ActivityLogService.record', () => {
  const build = () => {
    const rows: any[] = [];
    const logs = {
      create: (x: any) => ({ ...x }),
      save: jest.fn((x: any) => {
        rows.push(x);
        return Promise.resolve(x);
      }),
    } as any;
    return { rows, logs, service: new ActivityLogService(logs, {} as any) };
  };
  const req = (over: Partial<AuditRequest>): AuditRequest => ({
    method: 'POST',
    params: {},
    ...over,
  });

  it('records a teacher creating a class, with the class as its own class_id', async () => {
    const { rows, service } = build();
    await service.record(
      findAuditRule('POST', '/api/v1/classes')!,
      req({
        user: { id: 7, email: 't@x.y', role_id: 2 },
        body: { name: 'IELTS 6.5', password: 'never-stored' },
      }),
      { code: 201, data: { id: 42, name: 'IELTS 6.5' } },
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      actor_id: 7,
      actor_role: 2,
      action: 'class.create',
      entity_type: 'class',
      entity_id: 42,
      class_id: 42,
      summary: 'Created class “IELTS 6.5”',
      metadata: { name: 'IELTS 6.5' },
    });
    expect(JSON.stringify(rows[0])).not.toContain('never-stored');
  });

  it('links a test or assignment to its class through class_id in the body', async () => {
    const { rows, service } = build();
    await service.record(
      findAuditRule('POST', '/api/v1/assignments')!,
      req({
        user: { id: 7, email: 't@x.y', role_id: 2 },
        body: { title: 'Unit 1 handout', class_id: 5 },
      }),
      { data: { id: 9 } },
    );
    expect(rows[0]).toMatchObject({
      action: 'assignment.create',
      entity_id: 9,
      class_id: 5,
    });
  });

  it('uses the route id for updates and deletes', async () => {
    const { rows, service } = build();
    await service.record(
      findAuditRule('DELETE', '/api/v1/classes/:id')!,
      req({
        method: 'DELETE',
        params: { id: '12' },
        user: { id: 7, email: 't@x.y', role_id: 2 },
      }),
      { data: null },
    );
    expect(rows[0]).toMatchObject({
      action: 'class.delete',
      entity_id: 12,
      class_id: 12,
    });
  });

  it('only records students for the rules that allow it (joining a class)', async () => {
    const { rows, service } = build();
    const student = { id: 3, email: 's@x.y', role_id: 1 };
    await service.record(
      findAuditRule('POST', '/api/v1/tests')!,
      req({ user: student, body: { title: 'x' } }),
      { data: { id: 1 } },
    );
    expect(rows).toHaveLength(0);

    await service.record(
      findAuditRule('POST', '/api/v1/classes/join')!,
      req({ user: student, body: { class_code: 'ABC-1234' } }),
      { data: { id: 5, name: 'Class A' } },
    );
    expect(rows[0]).toMatchObject({
      actor_id: 3,
      actor_role: 1,
      action: 'class.join',
      class_id: 5,
    });
  });

  it('attributes a teacher application to the new account (no JWT yet)', async () => {
    const { rows, service } = build();
    await service.record(
      findAuditRule('POST', '/api/v1/auth/register-teacher')!,
      req({ body: { email: 'new@x.y', password: 'secret123', name: 'Jo' } }),
      { data: { id: 21, email: 'new@x.y' } },
    );
    expect(rows[0]).toMatchObject({
      actor_id: 21,
      action: 'teacher.apply',
      entity_id: 21,
    });
    expect(JSON.stringify(rows[0])).not.toContain('secret123');
  });

  it('never throws when the database write fails', async () => {
    const logs = {
      create: (x: any) => x,
      save: jest.fn().mockRejectedValue(new Error('db down')),
    } as any;
    const service = new ActivityLogService(logs, {} as any);
    await expect(
      service.record(
        findAuditRule('POST', '/api/v1/classes')!,
        req({ user: { id: 1, email: 'a@b.c', role_id: 3 } }),
        { data: { id: 1 } },
      ),
    ).resolves.toBeUndefined();
  });
});
