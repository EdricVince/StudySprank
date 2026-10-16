import * as crypto from 'crypto';
import {
  BattleService,
  COUNTDOWN_MS,
  QUESTION_TIME_S,
  REVEAL_MS,
  serverTimeLeft,
} from './battle.service';
import { BattleGateway } from './battle.gateway';

const SECRET = 'test-secret';
const config = {
  get: (k: string) => (k === 'JWT_SECRET' ? SECRET : undefined),
} as any;
const future = Math.floor(Date.now() / 1000) + 3600;

function token(payload: object, secret = SECRET): string {
  const b64 = (o: object) =>
    Buffer.from(JSON.stringify(o)).toString('base64url');
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64(payload);
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${head}.${body}`)
    .digest('base64url');
  return `${head}.${body}.${sig}`;
}

const player = (socketId: string, userId: number) => ({
  socketId,
  userId,
  name: `U${userId}`,
  avatar: '🦊',
  difficulty: 'medium',
});

describe('BattleService', () => {
  let svc: BattleService;
  beforeEach(() => {
    svc = new BattleService(config);
  });

  describe('verifyToken (WS handshake auth)', () => {
    it('accepts a valid token and returns the identity', () => {
      const t = token({ sub: 7, email: 'a@b.c', role_id: 1, exp: future });
      expect(svc.verifyToken(t)).toEqual({ id: 7, email: 'a@b.c', role_id: 1 });
    });
    it('rejects a token signed with the wrong secret', () => {
      expect(
        svc.verifyToken(token({ sub: 1, exp: future }, 'wrong-secret')),
      ).toBeNull();
    });
    it('rejects an expired token', () => {
      expect(
        svc.verifyToken(
          token({ sub: 1, exp: Math.floor(Date.now() / 1000) - 10 }),
        ),
      ).toBeNull();
    });
    it('rejects a malformed or missing token', () => {
      expect(svc.verifyToken('not.a.jwt')).toBeNull();
      expect(svc.verifyToken(undefined)).toBeNull();
    });
  });

  describe('matchmaking + server-authoritative scoring', () => {
    beforeEach(() => {
      jest.spyOn(svc, 'generateQuestions').mockResolvedValue([
        { question: 'Q1', options: ['a', 'b', 'c', 'd'], correct: 1 },
        { question: 'Q2', options: ['a', 'b', 'c', 'd'], correct: 0 },
      ]);
    });

    it('queues the first player, then pairs the second into a room', async () => {
      expect(await svc.tryMatch(player('s1', 1))).toBeNull();
      const room = await svc.tryMatch(player('s2', 2));
      expect(room).not.toBeNull();
      expect(room!.players).toHaveLength(2);
      expect(room!.questions).toHaveLength(2);
    });

    it('never pairs a player with their own second socket (same userId)', async () => {
      await svc.tryMatch(player('s1', 1));
      expect(await svc.tryMatch(player('s1b', 1))).toBeNull();
    });

    it('strips the correct index from client questions', async () => {
      await svc.tryMatch(player('s1', 1));
      const room = await svc.tryMatch(player('s2', 2));
      const cq = svc.clientQuestions(room!);
      expect(cq[0]).toEqual({ question: 'Q1', options: ['a', 'b', 'c', 'd'] });
      expect(cq[0]).not.toHaveProperty('correct');
    });

    it('scores a correct answer server-side and ignores a duplicate answer', async () => {
      await svc.tryMatch(player('s1', 1));
      const room = await svc.tryMatch(player('s2', 2));
      // 4th arg = server clock; answering the instant Q1 appears leaves the full 10 s.
      const shown = room!.players[0].questionSentAt;

      const correct = svc.submitAnswer('s2', 0, 1, shown); // Q0 correct index = 1
      expect(correct!.correct).toBe(true);
      expect(correct!.gained).toBe(100 + 10 * 10 + 1 * 10); // base + time + streak = 210
      expect(correct!.me.score).toBe(210);

      expect(svc.submitAnswer('s2', 0, 1, shown)).toBeNull(); // same question again → ignored

      const wrong = svc.submitAnswer('s1', 0, 3, shown);
      expect(wrong!.correct).toBe(false);
      expect(wrong!.gained).toBe(0);
      expect(wrong!.me.score).toBe(0);
    });

    it('cancelQueue removes a waiting player so no room forms', async () => {
      await svc.tryMatch(player('s1', 1));
      svc.cancelQueue('s1');
      expect(await svc.tryMatch(player('s2', 2))).toBeNull();
    });
  });

  describe('server-measured answer time (TC-08)', () => {
    const T0 = 1_800_000_000_000;
    let nowSpy: jest.SpyInstance;

    beforeEach(async () => {
      nowSpy = jest.spyOn(Date, 'now').mockReturnValue(T0);
      jest.spyOn(svc, 'generateQuestions').mockResolvedValue([
        { question: 'Q1', options: ['a', 'b', 'c', 'd'], correct: 1 },
        { question: 'Q2', options: ['a', 'b', 'c', 'd'], correct: 0 },
      ]);
      await svc.tryMatch(player('s1', 1));
      await svc.tryMatch(player('s2', 2));
    });
    afterEach(() => nowSpy.mockRestore());

    const q1Shown = T0 + COUNTDOWN_MS;

    it('scores the time bonus from the server clock, not from the client', () => {
      // 7.5 s after Q1 appeared → 10 − 7 = 3 s left → 100 + 30 + 10 (streak 1)
      const r = svc.submitAnswer('s2', 0, 1, q1Shown + 7_500);
      expect(r!.timeLeft).toBe(3);
      expect(r!.gained).toBe(140);
    });

    it('ignores a forged timeLeft sent through the gateway', () => {
      const emits: Array<[string, any]> = [];
      const gw = new BattleGateway(svc);
      gw.server = {
        to: () => ({ emit: (ev: string, d: any) => emits.push([ev, d]) }),
      } as any;

      nowSpy.mockReturnValue(q1Shown + 9_000); // 1 s left on the server clock
      gw.onAnswer(
        { id: 's2' } as any,
        { questionIndex: 0, answerIndex: 1, timeLeft: 999 } as any,
      );

      const result = emits.find(([ev]) => ev === 'battle:answer_result')![1];
      expect(result.timeLeft).toBe(1);
      expect(result.gained).toBe(100 + 1 * 10 + 10); // not 100 + 9990 + 10
    });

    it('clamps the time left to 0 for a late answer and to the limit for an early one', () => {
      expect(svc.submitAnswer('s2', 0, 1, q1Shown + 60_000)!.gained).toBe(
        100 + 0 + 10,
      );
      expect(serverTimeLeft(q1Shown, q1Shown - 5_000)).toBe(QUESTION_TIME_S);
      expect(serverTimeLeft(q1Shown, q1Shown + 60_000)).toBe(0);
    });

    it("starts the next question's clock after the answer reveal", () => {
      const t1 = q1Shown + 2_000;
      svc.submitAnswer('s2', 0, 1, t1);
      // Q2 appears at t1 + REVEAL_MS; answered 2 s later → 8 s left, streak 2
      const r = svc.submitAnswer('s2', 1, 0, t1 + REVEAL_MS + 2_000);
      expect(r!.timeLeft).toBe(8);
      expect(r!.gained).toBe(100 + 80 + 20);
    });

    it('rejects answering a question out of order', () => {
      expect(svc.submitAnswer('s2', 1, 0, q1Shown + 1_000)).toBeNull();
    });
  });
});
