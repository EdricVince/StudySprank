import { lastValueFrom, of, throwError } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { AiGenerationService, clip } from './ai-generation.service';
import { AiLogInterceptor } from './ai-log.interceptor';
import { findAiLogRule } from './ai-log-rules';

const contextFor = (req: Record<string, unknown>) =>
  ({
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => req }),
  }) as unknown as ExecutionContext;

const handler = (value: unknown): CallHandler => ({
  handle: () => of(value),
});

describe('clip', () => {
  it('keeps short values and clips very long strings, deeply', () => {
    const long = 'x'.repeat(30000);
    const out = clip({ a: 'ok', nested: [{ essay: long }] }) as {
      a: string;
      nested: { essay: string }[];
    };
    expect(out.a).toBe('ok');
    expect(out.nested[0].essay).toHaveLength(20001);
    expect(out.nested[0].essay.endsWith('…')).toBe(true);
  });
});

describe('findAiLogRule', () => {
  it('matches AI routes by method and registered path only', () => {
    expect(findAiLogRule('POST', '/api/v1/ai/lesson')?.kind).toBe('lesson');
    expect(findAiLogRule('GET', '/api/v1/ai/lesson')).toBeUndefined();
    expect(findAiLogRule('POST', '/api/v1/classes')).toBeUndefined();
    expect(findAiLogRule('POST', undefined)).toBeUndefined();
  });
});

describe('AiGenerationService', () => {
  it('stores the result with the model and never throws when the insert fails', async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const repo = { create: (x: unknown) => x, save };
    const service = new AiGenerationService(repo as never);
    await service.record({
      kind: 'test',
      userId: 7,
      userRole: 2,
      input: { topic: 'x' },
      output: { questions: [] },
    });
    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 7,
        user_role: 2,
        kind: 'test',
        input: { topic: 'x' },
        output: { questions: [] },
        model: expect.stringContaining('claude') as unknown,
      }),
    );

    save.mockRejectedValue(new Error('db down'));
    await expect(
      service.record({ kind: 'test', output: {} }),
    ).resolves.toBeUndefined();
  });
});

describe('AiLogInterceptor', () => {
  const setup = () => {
    const record = jest.fn().mockResolvedValue(undefined);
    const interceptor = new AiLogInterceptor({ record } as never);
    return { record, interceptor };
  };

  it('records the request body and the AI answer of an AI route', async () => {
    const { record, interceptor } = setup();
    const req = {
      method: 'POST',
      route: { path: '/api/v1/skills/writing/submit' },
      body: { essay: 'hello' },
      user: { id: 3, role_id: 1 },
    };
    await lastValueFrom(
      interceptor.intercept(
        contextFor(req),
        handler({ code: 200, data: { overall_band: 6 } }),
      ),
    );
    expect(record).toHaveBeenCalledWith({
      kind: 'writing_evaluation',
      userId: 3,
      userRole: 1,
      input: { essay: 'hello' },
      output: { overall_band: 6 },
    });
  });

  it('ignores other routes and failed requests', async () => {
    const { record, interceptor } = setup();
    await lastValueFrom(
      interceptor.intercept(
        contextFor({ method: 'POST', route: { path: '/api/v1/classes' } }),
        handler({ data: {} }),
      ),
    );
    await expect(
      lastValueFrom(
        interceptor.intercept(
          contextFor({ method: 'POST', route: { path: '/api/v1/ai/test' } }),
          { handle: () => throwError(() => new Error('503')) },
        ),
      ),
    ).rejects.toThrow('503');
    expect(record).not.toHaveBeenCalled();
  });

  it('stores the word of the day only when it changes', async () => {
    const { record, interceptor } = setup();
    const req = {
      method: 'GET',
      route: { path: '/api/v1/ai/word-of-the-day' },
      query: {},
    };
    const ask = (word: string) =>
      lastValueFrom(
        interceptor.intercept(contextFor(req), handler({ data: { word } })),
      );
    await ask('oratory');
    await ask('oratory');
    await ask('checkpoint');
    expect(record).toHaveBeenCalledTimes(2);
  });
});
