/** Which requests are written to the activity log, and how they are described. */
export interface AuditRule {
  method: string;
  /** Express route path exactly as registered, e.g. `/api/v1/classes/:id`. */
  path: string;
  action: string;
  entity: string;
  /** Past-tense description used in the summary, e.g. "Created class". */
  label: string;
  /** Also record students (default: only teachers and admins are recorded). */
  anyRole?: boolean;
  /** The entity itself is a class (so its id is the activity's class id). */
  classIsEntity?: boolean;
}

function crud(
  base: string,
  entity: string,
  noun: string,
  extra: Pick<AuditRule, 'classIsEntity'> = {},
): AuditRule[] {
  const path = `/api/v1/${base}`;
  return [
    {
      method: 'POST',
      path,
      action: `${entity}.create`,
      entity,
      label: `Created ${noun}`,
      ...extra,
    },
    {
      method: 'PUT',
      path: `${path}/:id`,
      action: `${entity}.update`,
      entity,
      label: `Updated ${noun}`,
      ...extra,
    },
    {
      method: 'DELETE',
      path: `${path}/:id`,
      action: `${entity}.delete`,
      entity,
      label: `Deleted ${noun}`,
      ...extra,
    },
  ];
}

export const AUDIT_RULES: AuditRule[] = [
  // Classes
  ...crud('classes', 'class', 'class', { classIsEntity: true }),
  {
    method: 'POST',
    path: '/api/v1/classes/join',
    action: 'class.join',
    entity: 'class',
    label: 'Joined class',
    anyRole: true,
    classIsEntity: true,
  },
  {
    method: 'DELETE',
    path: '/api/v1/classes/:id/leave',
    action: 'class.leave',
    entity: 'class',
    label: 'Left class',
    anyRole: true,
    classIsEntity: true,
  },
  {
    method: 'DELETE',
    path: '/api/v1/classes/:id/students/:studentId',
    action: 'class.remove_student',
    entity: 'class',
    label: 'Removed a student from class',
    classIsEntity: true,
  },

  // Teaching content
  ...crud('tests', 'test', 'test'),
  {
    method: 'POST',
    path: '/api/v1/tests/:id/submit',
    action: 'test.submit',
    entity: 'test',
    label: 'Submitted test',
    anyRole: true,
  },
  ...crud('assignments', 'assignment', 'assignment'),
  ...crud('lessons', 'lesson', 'lesson'),
  ...crud('vocab-sets', 'vocab_set', 'vocabulary set'),
  ...crud('flashcard-decks', 'flashcard_deck', 'flashcard deck'),

  // Teacher applications
  {
    method: 'POST',
    path: '/api/v1/auth/register-teacher',
    action: 'teacher.apply',
    entity: 'user',
    label: 'Applied for a teacher account',
    anyRole: true,
  },
  {
    method: 'PUT',
    path: '/api/v1/auth/teacher/application',
    action: 'teacher.resubmit',
    entity: 'user',
    label: 'Re-submitted the teacher application',
    anyRole: true,
  },

  // Administration
  {
    method: 'POST',
    path: '/api/v1/admin/create-teacher',
    action: 'admin.create_teacher',
    entity: 'user',
    label: 'Created a teacher account',
  },
  {
    method: 'PATCH',
    path: '/api/v1/admin/users/:id/teacher-status',
    action: 'teacher.review',
    entity: 'user',
    label: 'Reviewed a teacher application',
  },
  {
    method: 'PATCH',
    path: '/api/v1/admin/users/:id/teacher-card',
    action: 'teacher.card_upload',
    entity: 'user',
    label: 'Uploaded a teacher document',
  },
  {
    method: 'PATCH',
    path: '/api/v1/admin/users/:id/active',
    action: 'user.set_active',
    entity: 'user',
    label: 'Changed account status',
  },
  {
    method: 'PATCH',
    path: '/api/v1/admin/users/:id/reset-password',
    action: 'user.reset_password',
    entity: 'user',
    label: 'Reset a password',
  },
  {
    method: 'DELETE',
    path: '/api/v1/admin/users/:id',
    action: 'user.delete',
    entity: 'user',
    label: 'Deleted an account',
  },
  {
    method: 'POST',
    path: '/api/v1/admin/users/bulk-delete',
    action: 'user.bulk_delete',
    entity: 'user',
    label: 'Deleted several accounts',
  },
  {
    method: 'POST',
    path: '/api/v1/admin/ai/key',
    action: 'ai.key_set',
    entity: 'setting',
    label: 'Set the AI key',
  },
  {
    method: 'DELETE',
    path: '/api/v1/admin/ai/key',
    action: 'ai.key_remove',
    entity: 'setting',
    label: 'Removed the AI key',
  },
];

const BY_ROUTE = new Map<string, AuditRule>();
for (const r of AUDIT_RULES) BY_ROUTE.set(`${r.method} ${r.path}`, r);

/** The rule for a request, or undefined when it is not audited. */
export function findAuditRule(
  method: string,
  routePath: unknown,
): AuditRule | undefined {
  return typeof routePath === 'string'
    ? BY_ROUTE.get(`${method.toUpperCase()} ${routePath}`)
    : undefined;
}
