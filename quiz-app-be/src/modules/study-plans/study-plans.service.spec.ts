import { ConflictException, NotFoundException } from '@nestjs/common';
import { MAX_PLANS_PER_USER, StudyPlansService } from './study-plans.service';

const ID = '3f2b8c1e-6d1a-4a53-9c1e-5a7f0f7d9b11';
const dto = { name: '  IELTS 7.0  ', form: { a: 1 }, plan: { months: 3 } };

function build(existing: Record<string, unknown> | null = null, count = 0) {
  const plans = {
    find: jest.fn().mockResolvedValue([{ id: ID }]),
    findOne: jest.fn().mockResolvedValue(existing),
    count: jest.fn().mockResolvedValue(count),
    create: jest.fn((x: Record<string, unknown>) => ({ ...x })),
    save: jest.fn((x: Record<string, unknown>) => Promise.resolve(x)),
    delete: jest.fn(),
  };
  return { service: new StudyPlansService(plans as never), plans };
}

describe('StudyPlansService', () => {
  it('lists only the caller’s plans, newest first', async () => {
    const { service, plans } = build();
    await service.list(7);
    expect(plans.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: 7 },
        order: { created_at: 'DESC' },
      }),
    );
  });

  it('creates a plan for the caller, trimming its name', async () => {
    const { service, plans } = build(null, 2);
    const saved = await service.save(7, ID, dto);
    expect(saved).toMatchObject({
      id: ID,
      user_id: 7,
      name: 'IELTS 7.0',
      plan: { months: 3 },
    });
    expect(plans.save).toHaveBeenCalled();
  });

  it('saves an existing plan of the caller again (edit / add a month) without counting it as new', async () => {
    const { service } = build(
      { id: ID, user_id: 7, created_at: new Date('2026-01-01') },
      MAX_PLANS_PER_USER,
    );
    const saved = await service.save(7, ID, dto);
    expect(saved.created_at).toEqual(new Date('2026-01-01'));
  });

  it('never overwrites a plan that belongs to someone else', async () => {
    const { service, plans } = build({ id: ID, user_id: 99 });
    await expect(service.save(7, ID, dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(plans.save).not.toHaveBeenCalled();
  });

  it('stops at the plan limit', async () => {
    const { service } = build(null, MAX_PLANS_PER_USER);
    await expect(service.save(7, ID, dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('deletes only the caller’s plan', async () => {
    const { service, plans } = build();
    plans.delete.mockResolvedValueOnce({ affected: 1 });
    await service.remove(7, ID);
    expect(plans.delete).toHaveBeenCalledWith({ id: ID, user_id: 7 });

    plans.delete.mockResolvedValueOnce({ affected: 0 });
    await expect(service.remove(7, ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
