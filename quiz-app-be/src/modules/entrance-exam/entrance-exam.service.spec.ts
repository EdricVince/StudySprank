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
  mapLimit,
  toClientQuestions,
} from './entrance-exam.service';
import type { ExamAnswerDto } from './dto/exam.dto';
import {
  ALL_PARTS,
  PartBlueprint,
  GradedType,
  isOptionType,
  isTextType,
} from './ielts-format';

const reply = (text: string) => ({ content: [{ type: 'text', text }] });
const WORDS = (n: number) => Array(n).fill('word').join(' ');

// ── A fake AI that answers every kind of prompt the service sends ──────────────

function fakeQuestion(type: GradedType, i: number) {
  const base = { type, instruction: 'Rubric.', explanation: 'because' };
  if (isTextType(type)) {
    return {
      ...base,
      question: `Gap ${i + 1}: ______`,
      options: [],
      correct_answer: -1,
      accepted_answers: [`ans${i}`, `alt${i}`],
    };
  }
  if (type === 'true-false-not-given' || type === 'yes-no-not-given') {
    return { ...base, question: `Statement ${i + 1}`, correct_answer: i % 3 };
  }
  if (type === 'matching' || type === 'matching-headings') {
    return {
      ...base,
      question: `Item ${i + 1}`,
      options: ['one', 'two', 'three', 'four', 'five', 'six', 'seven'],
      correct_answer: i,
    };
  }
  return {
    ...base,
    question: `Question ${i + 1}?`,
    options: ['first', 'second', 'third'],
    correct_answer: 1,
  };
}

function fakePart(part: PartBlueprint) {
  const questions = part.groups.flatMap((g) =>
    Array.from({ length: g.count }, (_, i) => fakeQuestion(g.type, i)),
  );
  return {
    [part.skill === 'Listening' ? 'transcript' : 'passage']: WORDS(
      part.words[0],
    ),
    questions,
  };
}

const FAKE_CHART = {
  type: 'bar-grouped',
  title: 'Internet access in four countries',
  yLabel: 'Percentage (%)',
  categories: ['2000', '2005', '2010', '2015', '2020'],
  series: [
    { name: 'Norway', values: [20, 40, 60, 80, 95] },
    { name: 'Chile', values: [5, 15, 30, 50, 70] },
  ],
};

const FAKE_WRITING = {
  task1: {
    chart: FAKE_CHART,
    sentence:
      'The chart below shows the percentage of households with internet access in two countries.',
  },
  task2: {
    prompt:
      'Some people think that public transport should be free. To what extent do you agree or disagree? Give reasons for your answer.',
  },
};

const marks = (t1: number[], t2: number[]) => {
  const task = (name: string, b: number[]) => ({
    task: name,
    criteria: {
      task_achievement: { band: b[0], comment: 'ta' },
      coherence_cohesion: { band: b[1], comment: 'cc' },
      lexical_resource: { band: b[2], comment: 'lr' },
      grammatical_range: { band: b[3], comment: 'gr' },
    },
    strengths: ['s1', 's2'],
    improvements: ['i1', 'i2', 'i3'],
  });
  return {
    tasks: [task('writing-task1', t1), task('writing-task2', t2)],
  };
};

interface FakeAi {
  prompts: string[];
  /** Replace how one kind of prompt is answered (return a string, or throw). */
  override?: (prompt: string) => string | undefined;
  marking: unknown;
}

function installFakeAi(ai: FakeAi) {
  mockCreate.mockImplementation(
    ({ messages }: { messages: { content: string }[] }) => {
      const prompt = messages[0].content;
      ai.prompts.push(prompt);
      const custom = ai.override?.(prompt);
      if (custom !== undefined) return Promise.resolve(reply(custom));
      if (prompt.includes('Write the two Writing tasks')) {
        return Promise.resolve(reply(JSON.stringify(FAKE_WRITING)));
      }
      if (prompt.includes('certified IELTS Writing examiner')) {
        if (ai.marking === 'fail') return Promise.reject(new Error('down'));
        return Promise.resolve(reply(JSON.stringify(ai.marking)));
      }
      if (prompt.includes('study recommendations')) {
        return Promise.resolve(reply('["r1","r2","r3","r4"]'));
      }
      const part = ALL_PARTS.find((p) =>
        prompt.includes(`Write ${p.section} of`),
      );
      if (!part) return Promise.reject(new Error('unexpected prompt'));
      return Promise.resolve(reply(JSON.stringify(fakePart(part))));
    },
  );
}

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

describe('EntranceExamService — the IELTS mock test stored in the database', () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;
  let svc: EntranceExamService;
  let repos: ReturnType<typeof makeRepos>;
  let ai: FakeAi;
  let spies: jest.SpyInstance[];

  beforeAll(() => {
    spies = [
      jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined),
      jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined),
    ];
  });
  afterAll(() => {
    spies.forEach((s) => s.mockRestore());
    process.env.ANTHROPIC_API_KEY = originalKey;
  });
  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-testkey1234567890';
    mockCreate.mockReset();
    ai = { prompts: [], marking: marks([6, 6.5, 6, 6.5], [7, 7, 7, 7]) };
    installFakeAi(ai);
    repos = makeRepos();
    svc = new EntranceExamService(
      repos.paperRepo as any,
      repos.attemptRepo as any,
    );
  });

  /** The answers of a student who knows everything (typed answers: the first accepted spelling). */
  const perfectAnswers = (writing = true): ExamAnswerDto[] =>
    (repos.papers[0].questions as any[]).flatMap((q, i): ExamAnswerDto[] => {
      if (q.section === 'Writing') {
        return writing ? [{ question_id: i + 1, written: WORDS(180) }] : [];
      }
      return q.options.length
        ? [{ question_id: i + 1, selected: q.correct_answer }]
        : [{ question_id: i + 1, written: q.accepted_answers[0] }];
    });

  it('builds the paper from the IELTS blueprint: 30 Listening + 30 Reading questions and 2 Writing tasks', async () => {
    const exam = await svc.generateExam({ variant: 0 }, 7);

    // one AI call per Listening part / Reading passage + one for the Writing tasks
    expect(mockCreate).toHaveBeenCalledTimes(7 + 1);
    const paper = repos.papers[0];
    expect(paper.questions).toHaveLength(62);
    expect(paper.time_limit).toBe(150);
    expect(paper.created_by).toBe(7);
    expect(paper.format).toEqual([
      {
        section: 'Listening Part 1',
        count: 8,
        types: ['form-completion', 'note-completion'],
      },
      {
        section: 'Listening Part 2',
        count: 7,
        types: ['multiple-choice', 'matching'],
      },
      {
        section: 'Listening Part 3',
        count: 8,
        types: ['multiple-choice', 'sentence-completion'],
      },
      {
        section: 'Listening Part 4',
        count: 7,
        types: ['note-completion', 'summary-completion'],
      },
      {
        section: 'Reading Passage 1',
        count: 10,
        types: ['true-false-not-given', 'sentence-completion'],
      },
      {
        section: 'Reading Passage 2',
        count: 10,
        types: ['matching-headings', 'multiple-choice'],
      },
      {
        section: 'Reading Passage 3',
        count: 10,
        types: ['yes-no-not-given', 'multiple-choice', 'summary-completion'],
      },
      {
        section: 'Writing',
        count: 2,
        types: ['writing-task1', 'writing-task2'],
      },
    ]);
    const sectionOf = (prefix: string) =>
      paper.questions.filter((q: any) => q.section.startsWith(prefix)).length;
    expect(sectionOf('Listening')).toBe(30);
    expect(sectionOf('Reading')).toBe(30);
    // the script / passage sits on the first question of its part only
    const withText = paper.questions.filter((q: any) => q.passage);
    expect(withText).toHaveLength(7 + 1); // 7 parts + the Task 1 chart
    expect(paper.questions[0].passage).toBeTruthy();
    expect(paper.questions[1].passage).toBeNull();
    // typed answers keep their accepted spellings, option questions their key
    expect(paper.questions[0]).toMatchObject({
      type: 'form-completion',
      options: [],
      accepted_answers: ['ans0', 'alt0'],
      instruction: 'Rubric.',
    });
    // Task 1 carries the chart as JSON with server-assigned colours and axis
    const chart = JSON.parse(paper.questions[60].passage);
    expect(chart).toMatchObject({ type: 'bar-grouped', yMax: 100 });
    expect(chart.series.every((s: any) => /^#[0-9a-f]{6}$/.test(s.color))).toBe(
      true,
    );
    expect(paper.questions[60].question).toContain('Write at least 150 words');
    expect(paper.questions[61].question).toContain('Write at least 250 words');

    expect(repos.attempts[0]).toMatchObject({
      user_id: 7,
      status: 'in_progress',
    });
    expect(exam.session_id).toBe(String(repos.attempts[0].id));
    expect(exam.time_limit).toBe(150);
    expect(exam.skill_minutes).toEqual({
      Listening: 30,
      Reading: 60,
      Writing: 60,
    });
  });

  it('uses a different topic for each academic part', async () => {
    await svc.generateExam({ variant: 3 }, 7);
    const topics = ai.prompts
      .map((p) => /TOPIC: (.+)/.exec(p)?.[1])
      .filter(Boolean);
    expect(topics).toHaveLength(7);
    expect(new Set(topics).size).toBe(7);
  });

  it('never sends the answer key, the accepted answers or explanations to the student', async () => {
    const exam = await svc.generateExam({ variant: 0 }, 7);

    expect(exam.questions).toHaveLength(62);
    for (const q of exam.questions) {
      expect(q).not.toHaveProperty('correct_answer');
      expect(q).not.toHaveProperty('explanation');
      expect(q).not.toHaveProperty('accepted_answers');
    }
    const json = JSON.stringify(exam);
    expect(json).not.toContain('ans0');
    expect(json).not.toContain('because');
  });

  it('asks the AI again when a part comes back short, and still builds the paper', async () => {
    let failed = false;
    ai.override = (prompt) => {
      if (!failed && prompt.includes('Write Reading Passage 2 of')) {
        failed = true;
        return '{"passage": "too short", "questions": []}';
      }
      return undefined;
    };
    await svc.generateExam({ variant: 0 }, 7);
    expect(failed).toBe(true);
    expect(mockCreate).toHaveBeenCalledTimes(7 + 1 + 1); // one retry
    expect(repos.papers[0].questions).toHaveLength(62);
  });

  it('answers 503 and stores nothing when a part can never be filled', async () => {
    ai.override = (prompt) =>
      prompt.includes('Write Listening Part 3 of')
        ? JSON.stringify({
            transcript: WORDS(450),
            questions: [fakeQuestion('multiple-choice', 0)],
          })
        : undefined;

    await expect(svc.generateExam({ variant: 0 }, 7)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(repos.papers).toHaveLength(0);
    expect(repos.attempts).toHaveLength(0);
  });

  it('answers 503 when the AI is not configured', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(svc.generateExam({ variant: 0 }, 7)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('scores a perfect paper with the official tables and the weighted Writing band', async () => {
    const exam = await svc.generateExam({ variant: 0 }, 7);
    const result = await svc.evaluateExam(
      { session_id: exam.session_id, answers: perfectAnswers() },
      7,
    );

    expect(result.total).toBe(60);
    expect(result.correct).toBe(60);
    expect(result.skills).toEqual([
      { skill: 'Listening', correct: 30, total: 30, band: 9 },
      { skill: 'Reading', correct: 30, total: 30, band: 9 },
      { skill: 'Writing', correct: null, total: null, band: 7 }, // (6.5×1 + 7×2) / 3 = 6.83 → 7
    ]);
    expect(result.overall_band).toBe(8.5); // (9 + 9 + 7) / 3 = 8.33 → 8.5
    expect(result.estimated_band).toBe('8.5');
    expect(result.level).toBe('C2 — Expert');
    expect(result.writing_feedback).toHaveLength(2);
    expect(result.writing_feedback?.[0]).toMatchObject({
      task: 'writing-task1',
      band: 6.5,
      words: 180,
    });
    expect(result.writing_feedback?.[0].criteria.map((c) => c.key)).toEqual([
      'task_achievement',
      'coherence_cohesion',
      'lexical_resource',
      'grammatical_range',
    ]);
    expect(result.review).toHaveLength(60);
    expect(result.review?.every((r) => r.is_correct)).toBe(true);

    const stored = repos.attempts[0];
    expect(stored.status).toBe('submitted');
    expect(stored.overall_band).toBe(8.5);
    expect(stored.estimated_band).toBe('8.5');
    expect(stored.score_percent).toBe(100);
    expect(stored.submitted_at).toBeInstanceOf(Date);
  });

  it('grades typed answers ignoring case and punctuation, and wrong ones as wrong', async () => {
    const exam = await svc.generateExam({ variant: 0 }, 7);
    const answers = perfectAnswers(false);
    answers[0] = { question_id: 1, written: '  ANS0. ' }; // right: case and full stop do not matter
    answers[1] = { question_id: 2, written: 'ans0' }; // wrong: Q2 wants ans1
    const result = await svc.evaluateExam(
      { session_id: exam.session_id, answers },
      7,
    );

    const [q1, q2] = result.review!;
    expect(q1).toMatchObject({
      is_correct: true,
      written: 'ANS0.',
      type: 'form-completion',
    });
    expect(q2).toMatchObject({
      is_correct: false,
      written: 'ans0',
      accepted_answers: ['ans1', 'alt1'],
    });
    expect(result.correct).toBe(59);
  });

  it('leaves Writing out of the overall band when nothing was written, and scores blanks as zero', async () => {
    const exam = await svc.generateExam({ variant: 0 }, 7);
    const result = await svc.evaluateExam(
      { session_id: exam.session_id, answers: [] },
      7,
    );

    expect(result.correct).toBe(0);
    expect(result.skills?.map((s) => s.skill)).toEqual([
      'Listening',
      'Reading',
    ]);
    expect(result.overall_band).toBe(0);
    expect(result.estimated_band).toBe('0.0');
    expect(result.writing_feedback).toEqual([]);
    expect(result.weak_areas).toContain('Listening Part 1');
  });

  it('scales the tables to the length of the paper (28/30 counts as 37/40: band 8.5)', async () => {
    const exam = await svc.generateExam({ variant: 0 }, 7);
    const answers = perfectAnswers(false).filter(
      (a) => a.question_id !== 1 && a.question_id !== 2, // two Listening questions missed
    );
    const result = await svc.evaluateExam(
      { session_id: exam.session_id, answers },
      7,
    );
    expect(result.skills?.[0]).toMatchObject({
      skill: 'Listening',
      correct: 28,
      band: 8.5,
    });
  });

  it('gives band 1 to a Writing answer with no assessable text without asking the AI, and never guesses when marking fails', async () => {
    const exam = await svc.generateExam({ variant: 0 }, 7);
    const callsBefore = mockCreate.mock.calls.length;
    const result = await svc.evaluateExam(
      {
        session_id: exam.session_id,
        answers: [
          { question_id: 61, written: 'too short' },
          { question_id: 62, written: 'also short' },
        ],
      },
      7,
    );
    const marking = ai.prompts
      .slice(callsBefore)
      .filter((p) => p.includes('IELTS Writing examiner'));
    expect(marking).toHaveLength(0);
    expect(result.writing_feedback?.map((f) => f.band)).toEqual([1, 1]);
    expect(result.skills?.find((s) => s.skill === 'Writing')?.band).toBe(1);

    // AI cannot mark → no Writing band, overall from the other skills only
    ai.marking = 'fail';
    const again = await svc.generateExam({ paper_id: exam.paper_id }, 7);
    const failed = await svc.evaluateExam(
      {
        session_id: again.session_id,
        answers: [{ question_id: 61, written: WORDS(200) }],
      },
      7,
    );
    expect(failed.writing_feedback).toEqual([]);
    expect(failed.skills?.find((s) => s.skill === 'Writing')?.band).toBeNull();
    expect(failed.overall_band).toBe(0);
  });

  it('writes the feedback and the advice in the language of the student', async () => {
    const exam = await svc.generateExam({ variant: 0 }, 7);
    await svc.evaluateExam(
      {
        session_id: exam.session_id,
        language: 'vi',
        answers: perfectAnswers(),
      },
      7,
    );
    const marking = ai.prompts.find((p) =>
      p.includes('IELTS Writing examiner'),
    )!;
    const advice = ai.prompts.find((p) => p.includes('study recommendations'))!;
    expect(marking).toContain('in Vietnamese');
    expect(advice).toContain('in Vietnamese');
  });

  it('grades papers stored before this format (multiple-choice "completion" questions) by option', async () => {
    const legacy = {
      id: 1,
      exam_type: 'ielts',
      theme: 'old',
      variant: 0,
      time_limit: 30,
      format: [],
      created_by: 7,
      questions: [
        {
          id: 1,
          paper_id: 1,
          position: 0,
          section: 'Reading',
          type: 'note-completion',
          passage: null,
          question: 'Q?',
          options: ['a', 'b', 'c', 'd'],
          correct_answer: 2,
          explanation: 'x',
        },
      ],
    };
    repos.papers.push(legacy);
    repos.attempts.push({
      id: 1,
      paper_id: 1,
      user_id: 7,
      status: 'in_progress',
      answers: [],
    });

    const result = await svc.evaluateExam(
      { session_id: '1', answers: [{ question_id: 1, selected: 2 }] },
      7,
    );
    expect(result.correct).toBe(1);
    expect(result.review?.[0]).toMatchObject({
      selected: 2,
      written: null,
      is_correct: true,
    });
  });

  it('returns the saved result when the same attempt is submitted twice (no second AI call)', async () => {
    const exam = await svc.generateExam({ variant: 0 }, 7);
    const dto = { session_id: exam.session_id, answers: perfectAnswers() };

    const first = await svc.evaluateExam(dto, 7);
    const calls = mockCreate.mock.calls.length;
    const second = await svc.evaluateExam(dto, 7);

    expect(second).toEqual(first);
    expect(mockCreate).toHaveBeenCalledTimes(calls);
  });

  it("does not let another student submit or open someone else's attempt", async () => {
    const exam = await svc.generateExam({ variant: 0 }, 7);

    await expect(
      svc.evaluateExam({ session_id: exam.session_id, answers: [] }, 8),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.getAttemptResult(1, 8)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('re-sits a stored paper without calling the AI, only for the student who sat it', async () => {
    const first = await svc.generateExam({ variant: 0 }, 7);
    mockCreate.mockClear();

    const again = await svc.generateExam({ paper_id: first.paper_id }, 7);

    expect(mockCreate).not.toHaveBeenCalled();
    expect(again.paper_id).toBe(first.paper_id);
    expect(again.session_id).not.toBe(first.session_id);
    expect(again.questions).toHaveLength(62);
    expect(repos.papers).toHaveLength(1);
    expect(repos.attempts).toHaveLength(2);
    await expect(
      svc.generateExam({ paper_id: first.paper_id }, 8),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lists the submitted sittings of a student, newest first, with their overall band', async () => {
    const a = await svc.generateExam({ variant: 0 }, 7);
    await svc.evaluateExam({ session_id: a.session_id, answers: [] }, 7);
    const b = await svc.generateExam({ paper_id: a.paper_id }, 7);
    await svc.evaluateExam(
      { session_id: b.session_id, answers: perfectAnswers(false) },
      7,
    );
    repos.attempts[1].submitted_at = new Date(Date.now() + 60_000);
    await svc.generateExam({ paper_id: a.paper_id }, 7); // unfinished: never listed

    const history = await svc.getHistory(7);

    expect(history.map((h) => h.attempt_id)).toEqual([2, 1]);
    expect(history[0]).toMatchObject({
      paper_id: a.paper_id,
      overall_band: 9,
      correct: 60,
      total: 60,
    });
    expect(history[1].overall_band).toBe(0);
    expect(await svc.getHistory(8)).toEqual([]);
  });
});

describe('mapLimit / buildFormat / toClientQuestions', () => {
  it('keeps the order of the results and never runs more than `limit` at once', async () => {
    let running = 0;
    let peak = 0;
    const out = await mapLimit([30, 5, 20, 1, 10, 2], 3, async (ms, i) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, ms));
      running--;
      return i * 2;
    });
    expect(out).toEqual([0, 2, 4, 6, 8, 10]);
    expect(peak).toBeLessThanOrEqual(3);
  });

  it('summarises sections with their counts and question types', () => {
    const q = (section: string, type: string) => ({
      id: 1,
      section,
      type,
      question: 'q',
      options: [],
      correct_answer: -1,
      explanation: '',
    });
    expect(
      buildFormat([
        q('Reading', 'a'),
        q('Reading', 'b'),
        q('Reading', 'a'),
        q('Writing', 'w'),
      ]),
    ).toEqual([
      { section: 'Reading', count: 3, types: ['a', 'b'] },
      { section: 'Writing', count: 1, types: ['w'] },
    ]);
  });

  it('removes the answer key fields', () => {
    const [q] = toClientQuestions([
      {
        id: 1,
        section: 'Reading',
        type: 't',
        question: 'q',
        options: ['a'],
        correct_answer: 0,
        accepted_answers: ['x'],
        explanation: 'e',
        instruction: 'i',
      },
    ]);
    expect(q).toEqual({
      id: 1,
      section: 'Reading',
      type: 't',
      question: 'q',
      options: ['a'],
      instruction: 'i',
    });
    expect(isOptionType('multiple-choice')).toBe(true);
  });
});
