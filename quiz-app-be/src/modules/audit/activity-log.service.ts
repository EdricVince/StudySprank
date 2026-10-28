import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity';
import { Class } from '../classes/entities/class.entity';
import { ROLE_ADMIN, ROLE_TEACHER } from '../roles/entities/role.entity';
import type { AuditRule } from './audit-rules';
import type { CurrentUserData } from '../../core/decorators/current-user.decorator';

/** The parts of an HTTP request the audit trail needs. */
export interface AuditRequest {
  method: string;
  route?: { path?: unknown };
  params: Record<string, string | undefined>;
  body?: unknown;
  user?: CurrentUserData;
}

export interface ActivityFilter {
  actor_id?: number;
  class_id?: number;
  /** Prefix match, e.g. "class" or "teacher.review". */
  action?: string;
  /** Cursor: only rows older than this id. */
  before_id?: number;
  limit?: number;
}

export interface ActivityRow {
  id: number;
  created_at: Date;
  action: string;
  entity_type: string;
  entity_id: number | null;
  class_id: number | null;
  class_name: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  actor: {
    id: number;
    name: string | null;
    email: string;
    role_id: number | null;
  } | null;
}

/** Request/response fields that are safe to keep (never passwords, tokens or images). */
const METADATA_KEYS = [
  'name',
  'title',
  'subject',
  'class_id',
  'status',
  'reason',
  'verified',
  'is_active',
  'is_published',
] as const;

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

function toId(value: unknown): number | null {
  const n = typeof value === 'string' && value ? Number(value) : value;
  return typeof n === 'number' && Number.isInteger(n) && n > 0 ? n : null;
}

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(
    @InjectRepository(ActivityLog)
    private readonly logs: Repository<ActivityLog>,
    @InjectRepository(Class) private readonly classes: Repository<Class>,
  ) {}

  /** Write one entry. Never throws: auditing must not break the action being audited. */
  async log(entry: Partial<ActivityLog> & Pick<ActivityLog, 'action'>) {
    try {
      await this.logs.save(
        this.logs.create({
          entity_type: 'unknown',
          summary: '',
          metadata: {},
          ...entry,
        }),
      );
    } catch (e) {
      this.logger.error(`Could not record activity "${entry.action}"`, e);
    }
  }

  /** Turn a successful, audited request into a log entry. */
  async record(
    rule: AuditRule,
    req: AuditRequest,
    response: unknown,
  ): Promise<void> {
    const data = asRecord(asRecord(response).data);
    const payload = asRecord(req.body);

    const actorRole = req.user?.role_id ?? null;
    const isStaff = actorRole === ROLE_TEACHER || actorRole === ROLE_ADMIN;
    if (!rule.anyRole && !isStaff) return;

    // Sign-up style requests have no JWT yet — the new account is the actor.
    const actorId = req.user?.id ?? toId(data.id);
    const entityId = toId(req.params.id) ?? toId(data.id);
    const classId = rule.classIsEntity
      ? entityId
      : (toId(payload.class_id) ?? toId(data.class_id));

    const rawName = payload.name ?? payload.title ?? data.name ?? data.title;
    const name =
      typeof rawName === 'string' ? rawName.trim().slice(0, 120) : '';

    const metadata: Record<string, unknown> = {};
    for (const key of METADATA_KEYS) {
      if (payload[key] !== undefined) metadata[key] = payload[key];
    }
    if (req.params.studentId) metadata.student_id = toId(req.params.studentId);

    await this.log({
      actor_id: actorId,
      actor_role: actorRole ?? (rule.anyRole ? ROLE_TEACHER : null),
      action: rule.action,
      entity_type: rule.entity,
      entity_id: entityId,
      class_id: classId,
      summary: name ? `${rule.label} “${name}”` : rule.label,
      metadata,
    });
  }

  /** Newest first, with the actor and class names resolved. */
  async list(filter: ActivityFilter): Promise<ActivityRow[]> {
    const limit = Math.min(
      Math.max(filter.limit ?? DEFAULT_LIMIT, 1),
      MAX_LIMIT,
    );
    const qb = this.logs
      .createQueryBuilder('l')
      .leftJoin('l.actor', 'u')
      .addSelect(['u.id', 'u.name', 'u.email'])
      .orderBy('l.id', 'DESC')
      .take(limit);

    if (filter.actor_id) {
      qb.andWhere('l.actor_id = :actor', { actor: filter.actor_id });
    }
    if (filter.class_id) {
      qb.andWhere('l.class_id = :cls', { cls: filter.class_id });
    }
    if (filter.before_id) {
      qb.andWhere('l.id < :before', { before: filter.before_id });
    }
    if (filter.action) {
      qb.andWhere('l.action LIKE :action', { action: `${filter.action}%` });
    }

    const rows = await qb.getMany();
    const classIds = new Set<number>();
    for (const r of rows) if (r.class_id) classIds.add(r.class_id);
    const names = new Map<number, string>();
    if (classIds.size) {
      const found = await this.classes.find({
        where: { id: In([...classIds]) },
        select: ['id', 'name'],
      });
      for (const c of found) names.set(c.id, c.name);
    }

    return rows.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      action: r.action,
      entity_type: r.entity_type,
      entity_id: r.entity_id,
      class_id: r.class_id,
      class_name: r.class_id ? (names.get(r.class_id) ?? null) : null,
      summary: r.summary,
      metadata: r.metadata,
      actor: r.actor
        ? {
            id: r.actor.id,
            name: r.actor.name,
            email: r.actor.email,
            role_id: r.actor_role,
          }
        : null,
    }));
  }
}
