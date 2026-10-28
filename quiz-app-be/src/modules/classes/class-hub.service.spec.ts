import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClassHubService } from './class-hub.service';

const CLASS = {
  id: 5,
  teacher_id: 10,
  name: 'IELTS 6.5',
  subject: 'IELTS',
  description: null,
  class_code: 'ABC-1234',
  student_limit: 30,
  is_active: true,
};

/** A repo whose raw `query` answers by recognising a fragment of the SQL. */
function build(cls: any, enrolled = true) {
  const sqls: string[] = [];
  const answers: [string, unknown[]][] = [
    ['AND student_id = $2', enrolled ? [{ ok: 1 }] : []],
    ['COUNT(*)::int AS n', [{ n: 3 }]],
    ['FROM users WHERE id', [{ name: 'Ms Lan' }]],
    ['FROM class_enrollments e', [{ id: 1, name: 'An' }]],
  ];
  const repo = {
    findOne: jest.fn().mockResolvedValue(cls),
    query: jest.fn((sql: string) => {
      sqls.push(sql);
      const hit = answers.find(([marker]) => sql.includes(marker));
      return Promise.resolve(hit ? hit[1] : []);
    }),
  } as any;
  return { sqls, service: new ClassHubService(repo) };
}

const teacher = {
  id: 10,
  email: 't@x.y',
  role_id: 2,
  teacher_status: 'approved' as const,
};
const student = { id: 20, email: 's@x.y', role_id: 1 };
const admin = { id: 1, email: 'a@x.y', role_id: 3 };

describe('ClassHubService', () => {
  it('404 for a class that does not exist', async () => {
    const { service } = build(null);
    await expect(service.getHub(99, teacher)).rejects.toThrow(
      NotFoundException,
    );
  });

  it("the class's teacher sees the roster, the code and unpublished items", async () => {
    const { service, sqls } = build(CLASS);
    const hub = await service.getHub(5, teacher);
    expect(hub.class).toMatchObject({
      name: 'IELTS 6.5',
      class_code: 'ABC-1234',
      student_count: 3,
    });
    expect(hub.teacher_name).toBe('Ms Lan');
    expect(hub.students).toEqual([{ id: 1, name: 'An' }]);
    const tests = sqls.find((s) => s.includes('FROM tests WHERE'))!;
    expect(tests).not.toContain('is_published = true');
  });

  it('a student gets published content only, no roster and no class code', async () => {
    const { service, sqls } = build(CLASS, true);
    const hub = await service.getHub(5, student);
    expect(hub.students).toBeNull();
    expect(hub.class.class_code).toBeNull();
    for (const table of ['tests', 'assignments', 'lessons', 'vocab_sets']) {
      const sql = sqls.find((s) => s.includes(`FROM ${table} WHERE`))!;
      expect(sql).toContain('is_published = true');
    }
  });

  it('refuses a student who is not enrolled (403)', async () => {
    const { service } = build(CLASS, false);
    await expect(service.getHub(5, student)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('refuses another teacher, and a teacher who is not approved (403)', async () => {
    const { service } = build(CLASS);
    const other = { ...teacher, id: 11 };
    const pending = { ...teacher, teacher_status: 'pending' as const };
    await expect(service.getHub(5, other)).rejects.toThrow(ForbiddenException);
    await expect(service.getHub(5, pending)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('an admin can open any class', async () => {
    const { service } = build(CLASS);
    const hub = await service.getHub(5, admin);
    expect(hub.students).not.toBeNull();
  });
});
