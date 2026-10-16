import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { LiveQuizService } from './live-quiz.service';

function build(
  existingPins: string[] = [],
  session: any = { id: 1, teacher_id: 10, status: 'waiting' },
) {
  const repo = {
    findOne: jest.fn(async ({ where }: any) => {
      if (where.pin !== undefined)
        return existingPins.includes(where.pin)
          ? { pin: where.pin, status: 'ended' }
          : null;
      return where.id === session.id ? { ...session } : null;
    }),
    create: jest.fn((x: any) => x),
    save: jest.fn(async (x: any) => x),
    delete: jest.fn(),
  };
  return { svc: new LiveQuizService(repo as any), repo };
}

describe('LiveQuizService', () => {
  it('generates a 6-digit PIN that does not collide with ANY stored session (pin is UNIQUE)', async () => {
    const { svc, repo } = build();
    // first candidate collides with an ENDED session, second is free
    repo.findOne
      .mockResolvedValueOnce({ pin: '111111', status: 'ended' })
      .mockResolvedValueOnce(null);
    const s = await svc.create(10, 'Lesson');

    expect(s.pin).toMatch(/^\d{6}$/);
    expect(repo.findOne).toHaveBeenCalledTimes(2);
    // the uniqueness check must not be limited to status 'waiting'
    expect(repo.findOne.mock.calls[0][0].where).not.toHaveProperty('status');
  });

  it('rejects an unknown status (400) and a non-owner (403)', async () => {
    const { svc } = build();
    await expect(svc.updateStatus(1, 10, 'paused')).rejects.toThrow(
      BadRequestException,
    );
    await expect(svc.updateStatus(1, 99, 'live')).rejects.toThrow(
      ForbiddenException,
    );
    await expect(svc.delete(1, 99)).rejects.toThrow(ForbiddenException);
  });

  it('lets the owner move the session to live / ended', async () => {
    const { svc } = build();
    expect((await svc.updateStatus(1, 10, 'live')).status).toBe('live');
    expect((await svc.updateStatus(1, 10, 'ended')).status).toBe('ended');
  });
});
