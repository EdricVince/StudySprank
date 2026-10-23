import {
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

const mockCreate = jest.fn();
jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest
    .fn()
    .mockImplementation(() => ({ messages: { create: mockCreate } })),
}));

import {
  EntranceExamService,
  buildFormat,
  normalizeQuestions,
} from './entrance-exam.service';

const reply = (text: string) => ({ content: [{ type: 'text', text }] });
const QUESTIONS = [
  {
    id: 1,
    section: 'Reading',
    type: 'multiple-choice',
    passage: null,
    question: 'Q1?',
    options: ['a', 'b', 'c', 'd'],
    correct_answer: 2,
    explanation: 'because c',
  },
  {
    id: 2,
    section: 'Reading',
    type: 'true-false-not-given',
    passage: null,
    question: 'Q2?',
    options: ['a', 'b', 'c', 'd'],
    correct_answer: 0,
    explanation: 'because a',
  },
  {
    id: 3,
    section: 'Writing',
    type: 'writing-task2',
    passage: null,
    question: 'Write.',
    options: [],
    correct_answer: -1,
    explanation: '',
  },
];

/** In-memory stand-ins for the TypeORM repositories the service uses. */
function makeRepos() {
  const papers: any[] = [];
  const attempts: any[] = [];
  const matches = (row: any, where: Record<string, unknown>) =>
    Object.entries(where).every(([k, v]) => row[k] === v);
  const withPaper = (a: any) => ({
    ...a,
    paper: papers.find((p) => p.id === a.paper_id),
  });

  const paperRepo = {
    create: (d: any) => ({ ...d }),
    save: (p: any) => {
      p.id = p.id ?? papers.length + 1;
      p.questions = (p.questions ?? []).map((q: any, i: number) => ({
        id: i + 1,
        paper_id: p.id,
        ...q,
      }));
      papers.push(p);
      return Promise.resolve(p);
    },
    findOne: ({ where }: any) =>
      Promise.resolve(papers.find((p) => matches(p, where)) ?? null),
  };
  const attemptRepo = {
    create: (d: any) => ({ ...d }),
    save: (a: any) => {
      if (!a.id) {
        a.id = attempts.length + 1;
        attempts.push(a);
      } else {
        attempts[attempts.findIndex((x) => x.id === a.id)] = { ...a };
      }
      return Promise.resolve(a);
    },
    findOne: ({ where }: any) => {
      const a = attempts.find((x) => matches(x, where));
      return Promise.resolve(a ? withPaper(a) : null);
    },
    find: ({ where, take }: any) =>
      Promise.resolve(
        attempts
          .filter((a) => matches(a, where))
          .sort((a, b) => b.submitted_at - a.submitted_at)
          .slice(0, take)
          .map(withPaper),
      ),
  };
  return { papers, attempts, paperRepo, attemptRepo };
}

describe('EntranceExamService — IELTS exam stored in the database', () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  let svc: EntranceExamService;
  let repos: ReturnType<typeof makeRepos>;
  let errSpy: jest.SpyInstance;

  beforeAll(() => {
    errSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });
  afterAll(() => {
    errSpy.mockRestore();
    process.env.ANTHROPIC_API_KEY = originalKey;
  });
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-testkey1234567890';
    mockCreate.mockReset();
    repos = makeRepos();
    svc = new EntranceExamService(
      repos.paperRepo as any,
      repos.attemptRepo as any,
    );
  });

  it('saves the generated paper, its questions and the exam format in the DB', async () => {
    mockCreate.mockResolvedValueOnce(reply(JSON.stringify(QUESTIONS)));
    const exam = await svc.generateExam({ variant: 0 }, 7);

    expect(repos.papers).toHaveLength(1);
    const paper = repos.papers[0];
    expect(paper.exam_type).toBe('ielts');
    expect(paper.created_by).toBe(7);
    expect(paper.questions).toHaveLength(3);
    expect(paper.questions[0]).toMatchObject({
      position: 0,
      type: 'multiple-choice',
      correct_answer: 2,
      explanation: 'because c',
    });
    expect(paper.format).toEqual([
      {
        section: 'Reading',
        count: 2,
        types: ['multiple-choice', 'true-false-not-given'],
      },
      { section: 'Writing', count: 1, types: ['writing-task2'] },
    ]);
    // …and a new in-progress attempt for the student.
    expect(repos.attempts).toHaveLength(1);
    expect(repos.attempts[0]).toMatchObject({
      user_id: 7,
      status: 'in_progress',
    });
    expect(exam.session_id).toBe(String(repos.attempts[0].id));
    expect(exam.paper_id).toBe(paper.id);
    expect(exam.exam_type).toBe('ielts');
  });

  it('strips correct_answer and explanation from every question sent to the student', async () => {
    mockCreate.mockResolvedValueOnce(reply(JSON.stringify(QUESTIONS)));
    const exam = await svc.generateExam({ variant: 0 }, 7);

    expect(exam.questions).toHaveLength(3);
    for (const q of exam.questions) {
      expect(q).not.toHaveProperty('correct_answer');
      expect(q).not.toHaveProperty('explanation');
      expect(q).toHaveProperty('options');
    }
    expect(JSON.stringify(exam)).not.toContain('because c');
  });

  it('grades on the server, reveals the key only in the result and stores it', async () => {
    mockCreate
      .mockResolvedValueOnce(reply(JSON.stringify(QUESTIONS)))
      .mockResolvedValueOnce(reply('["r1","r2","r3","r4"]')); // recommendations
    const exam = await svc.generateExam({ variant: 0 }, 7);

    const result = await svc.evaluateExam(
      {
        session_id: exam.session_id,
        answers: [
          { question_id: 1, selected: 2 },
          { question_id: 2, selected: 3 },
          { question_id: 3, written: 'My essay' },
        ],
      },
      7,
    );

    expect(result.correct).toBe(1);
    expect(result.total).toBe(2); // writing is not auto-scored
    expect(result.review).toEqual([
      {
        question_id: 1,
        section: 'Reading',
        question: 'Q1?',
        options: ['a', 'b', 'c', 'd'],
        selected: 2,
        correct_answer: 2,
        explanation: 'because c',
      },
      {
        question_id: 2,
        section: 'Reading',
        question: 'Q2?',
        options: ['a', 'b', 'c', 'd'],
        selected: 3,
        correct_answer: 0,
        explanation: 'because a',
      },
    ]);
    expect(result.writing_responses).toEqual([
      { task: 'writing-task2', question: 'Write.', text: 'My essay' },
    ]);

    const stored = repos.attempts[0];
    expect(stored.status).toBe('submitted');
    expect(stored.score_percent).toBe(50);
    expect(stored.estimated_band).toBe(result.estimated_band);
    expect(stored.result.correct).toBe(1);
    expect(stored.answers).toHaveLength(3);
    expect(stored.submitted_at).toBeInstanceOf(Date);
  });

  it('returns the saved result when the same attempt is submitted twice (no second AI call)', async () => {
    mockCreate
      .mockResolvedValueOnce(reply(JSON.stringify(QUESTIONS)))
      .mockResolvedValueOnce(reply('["r1"]'));
    const exam = await svc.generateExam({ variant: 0 }, 7);
    const dto = {
      session_id: exam.session_id,
      answers: [{ question_id: 1, selected: 2 }],
    };

    const first = await svc.evaluateExam(dto, 7);
    const second = await svc.evaluateExam(dto, 7);

    expect(second).toEqual(first);
    expect(mockCreate).toHaveBeenCalledTimes(2); // exam + recommendations only
  });

  it("does not let another student submit or open someone else's attempt", async () => {
    mockCreate.mockResolvedValueOnce(reply(JSON.stringify(QUESTIONS)));
    const exam = await svc.generateExam({ variant: 0 }, 7);

    await expect(
      svc.evaluateExam({ session_id: exam.session_id, answers: [] }, 8),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.getAttemptResult(1, 8)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('re-sits a stored paper without calling the AI, only for the student who sat it', async () => {
    mockCreate.mockResolvedValueOnce(reply(JSON.stringify(QUESTIONS)));
    const first = await svc.generateExam({ variant: 0 }, 7);
    mockCreate.mockClear();

    const again = await svc.generateExam({ paper_id: first.paper_id }, 7);

    expect(mockCreate).not.toHaveBeenCalled();
    expect(again.paper_id).toBe(first.paper_id);
    expect(again.session_id).not.toBe(first.session_id);
    expect(again.questions).toHaveLength(3);
    expect(repos.papers).toHaveLength(1);
    expect(repos.attempts).toHaveLength(2);
    await expect(
      svc.generateExam({ paper_id: first.paper_id }, 8),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists the submitted sittings of a student, newest first', async () => {
    mockCreate
      .mockResolvedValueOnce(reply(JSON.stringify(QUESTIONS)))
      .mockResolvedValueOnce(reply('["r1"]'))
      .mockResolvedValueOnce(reply('["r2"]'));
    const a = await svc.generateExam({ variant: 0 }, 7);
    await svc.evaluateExam({ session_id: a.session_id, answers: [] }, 7);
    const b = await svc.generateExam({ paper_id: a.paper_id }, 7);
    await svc.evaluateExam(
      { session_id: b.session_id, answers: [{ question_id: 1, selected: 2 }] },
      7,
    );
    // make the second sitting clearly newer
    repos.attempts[1].submitted_at = new Date(Date.now() + 60_000);
    // an unfinished sitting never shows up
    await svc.generateExam({ paper_id: a.paper_id }, 7);

    const history = await svc.getHistory(7);

    expect(history.map((h) => h.attempt_id)).toEqual([2, 1]);
    expect(history[0]).toMatchObject({
      paper_id: a.paper_id,
      score_percent: 50,
      correct: 1,
      total: 2,
    });
    expect(await svc.getHistory(8)).toEqual([]);
  });

  it('answers 503 and stores nothing when the AI returns no usable questions', async () => {
    mockCreate.mockResolvedValueOnce(reply('[{"nope": true}]'));

    await expect(svc.generateExam({ variant: 0 }, 7)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(repos.papers).toHaveLength(0);
    expect(repos.attempts).toHaveLength(0);
  });
});

describe('normalizeQuestions / buildFormat', () => {
  it('drops entries without question text and numbers the rest 1..n', () => {
    const out = normalizeQuestions([
      null,
      'text',
      { question: '   ' },
      { question: 'Keep me', options: ['a', 'b'], correct_answer: 1 },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      id: 1,
      question: 'Keep me',
      section: 'Reading',
    });
  });

  it('points the answer key at a real option, else -1', () => {
    const [ok, tooBig, notANumber] = normalizeQuestions([
      { question: 'a', options: ['x', 'y'], correct_answer: 1 },
      { question: 'b', options: ['x', 'y'], correct_answer: 5 },
      { question: 'c', options: ['x', 'y'], correct_answer: 'B' },
    ]);
    expect(ok.correct_answer).toBe(1);
    expect(tooBig.correct_answer).toBe(-1);
    expect(notANumber.correct_answer).toBe(-1);
  });

  it('stores a Writing Task 1 chart object as a JSON string and empties its options', () => {
    const chart = { type: 'bar-grouped', title: 'Chart' };
    const [task1] = normalizeQuestions([
      {
        section: 'Writing',
        type: 'writing-task1',
        passage: chart,
        question: 'Describe the chart',
        options: ['should be ignored'],
        correct_answer: 0,
      },
    ]);
    expect(task1.passage).toBe(JSON.stringify(chart));
    expect(task1.options).toEqual([]);
    expect(task1.correct_answer).toBe(-1);
  });

  it('summarises sections with their counts and question types', () => {
    const format = buildFormat(normalizeQuestions(QUESTIONS));
    expect(format.map((f) => [f.section, f.count])).toEqual([
      ['Reading', 2],
      ['Writing', 1],
    ]);
  });
});
