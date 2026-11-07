import {
  ALL_PARTS,
  EXAM_TIME_LIMIT_MIN,
  LISTENING_PARTS,
  READING_PASSAGES,
  bandFromRaw,
  examFormatSummary,
  isTextAnswerCorrect,
  levelOfBand,
  normalizeAnswerText,
  overallBand,
  partQuestionCount,
  questionsOf,
  roundHalf,
  writingBand,
} from './ielts-format';
import {
  cleanOption,
  extractJsonObject,
  niceCeil,
  normalizeChart,
  normalizeMarking,
  normalizePart,
  normalizeWritingTasks,
  writingQuestions,
} from './ielts-parse';

const WORDS = (n: number) => Array(n).fill('word').join(' ');

describe('IELTS blueprint', () => {
  it('has the four Listening parts and three Reading passages, 30 questions each', () => {
    expect(LISTENING_PARTS).toHaveLength(4);
    expect(READING_PASSAGES).toHaveLength(3);
    expect(questionsOf('Listening')).toBe(30);
    expect(questionsOf('Reading')).toBe(30);
    expect(ALL_PARTS.map(partQuestionCount)).toEqual([8, 7, 8, 7, 10, 10, 10]);
    expect(EXAM_TIME_LIMIT_MIN).toBe(150);
  });

  it('describes itself for the screens (no hard-coded numbers there)', () => {
    expect(examFormatSummary()).toEqual({
      listening: { parts: 4, questions: 30, minutes: 30 },
      reading: { passages: 3, questions: 30, minutes: 60 },
      writing: { tasks: 2, minutes: 60 },
      total_questions: 60,
      total_minutes: 150,
    });
  });
});

describe('bands', () => {
  it('converts a raw score with the official table (scaled to 40 questions)', () => {
    expect(bandFromRaw('Listening', 40, 40)).toBe(9);
    expect(bandFromRaw('Listening', 30, 40)).toBe(7);
    expect(bandFromRaw('Reading', 30, 40)).toBe(7);
    expect(bandFromRaw('Reading', 23, 40)).toBe(6);
    expect(bandFromRaw('Listening', 30, 30)).toBe(9); // 30/30 is 40/40
    expect(bandFromRaw('Listening', 15, 30)).toBe(5.5); // 15/30 is 20/40
    expect(bandFromRaw('Listening', 12, 30)).toBe(5); // 12/30 is 16/40
    expect(bandFromRaw('Reading', 0, 30)).toBe(0);
    expect(bandFromRaw('Reading', 0, 0)).toBe(0);
  });

  it('rounds to the nearest half band', () => {
    expect(roundHalf(6.25)).toBe(6.5);
    expect(roundHalf(6.24)).toBe(6);
    expect(roundHalf(6.75)).toBe(7);
  });

  it('averages the skills that were sat; null when none', () => {
    expect(overallBand([7, 6.5, 6])).toBe(6.5);
    expect(overallBand([7, 6.5, null])).toBe(7); // 6.75 → 7
    expect(overallBand([null, undefined])).toBeNull();
  });

  it('weights Writing Task 2 twice as much as Task 1', () => {
    expect(writingBand({ task1: 6, task2: 7 })).toBe(6.5); // 6.67 → 6.5
    expect(writingBand({ task1: 7, task2: 6 })).toBe(6.5); // 6.33 → 6.5
    expect(writingBand({ task2: 7 })).toBe(7);
    expect(writingBand({})).toBeNull();
  });

  it('maps a band to a level', () => {
    expect(levelOfBand(9)).toMatch(/^C2/);
    expect(levelOfBand(7)).toMatch(/^C1/);
    expect(levelOfBand(5.5)).toMatch(/^B2/);
    expect(levelOfBand(4)).toMatch(/^B1/);
    expect(levelOfBand(3)).toMatch(/^A2/);
    expect(levelOfBand(0)).toMatch(/^A1/);
  });
});

describe('typed answers', () => {
  it('ignores case, stops and extra spaces but not spelling', () => {
    expect(normalizeAnswerText('  The  Blue, Room. ')).toBe('the blue room');
    expect(isTextAnswerCorrect('BLUE room!', ['blue room'])).toBe(true);
    expect(isTextAnswerCorrect('blue roam', ['blue room'])).toBe(false);
    expect(isTextAnswerCorrect('7.30', ['7:30', '7.30'])).toBe(true);
    expect(isTextAnswerCorrect('', ['x'])).toBe(false);
    expect(isTextAnswerCorrect(undefined, ['x'])).toBe(false);
    expect(isTextAnswerCorrect('x', undefined)).toBe(false);
  });
});

describe('extractJsonObject / cleanOption', () => {
  it('finds the object inside fences and chatter', () => {
    expect(extractJsonObject('Here:\n```json\n{"a":1}\n```\nDone')).toEqual({
      a: 1,
    });
    expect(() => extractJsonObject('no json')).toThrow();
    expect(() => extractJsonObject('{"a":')).toThrow();
  });

  it('drops the letter / numeral the model put in front of an option', () => {
    expect(cleanOption('A. a bridge')).toBe('a bridge');
    expect(cleanOption('iii) Rising costs')).toBe('Rising costs');
    expect(cleanOption('Aluminium')).toBe('Aluminium');
  });
});

describe('normalizePart', () => {
  const part = LISTENING_PARTS[1]; // multiple-choice ×4 + matching ×3
  const mc = (i: number) => ({
    type: 'multiple-choice',
    question: `Q${i}`,
    options: ['A. one', 'B. two', 'C. three'],
    correct_answer: 'B',
  });
  const match = (i: number) => ({
    type: 'matching',
    question: `M${i}`,
    options: ['p', 'q', 'r', 's', 't', 'u'],
    correct_answer: i,
  });
  const reply = (qs: unknown[], text = WORDS(400)) => ({
    transcript: text,
    questions: qs,
  });

  it('returns the questions in blueprint order with the script on the first one', () => {
    const out = normalizePart(
      reply([...[0, 1, 2, 3].map(mc), ...[0, 1, 2].map(match)]),
      part,
    );
    expect(out).toHaveLength(7);
    expect(out.map((q) => q.type)).toEqual([
      ...Array(4).fill('multiple-choice'),
      ...Array(3).fill('matching'),
    ]);
    expect(out[0].passage).toBeTruthy();
    expect(out[1].passage).toBeNull();
    expect(out[0].options).toEqual(['one', 'two', 'three']);
    expect(out[0].correct_answer).toBe(1);
    expect(out[0].instruction).toBeTruthy(); // default rubric when the model gave none
    expect(out[4].options).toHaveLength(6);
    expect(out.every((q) => q.section === 'Listening Part 2')).toBe(true);
  });

  it('refuses a part with too few usable questions of a type', () => {
    expect(() =>
      normalizePart(
        reply([...[0, 1, 2].map(mc), ...[0, 1, 2].map(match)]),
        part,
      ),
    ).toThrow(/3\/4/);
    expect(() =>
      normalizePart(
        reply([
          ...[0, 1, 2].map(mc),
          { ...mc(9), correct_answer: 7 },
          ...[0, 1, 2].map(match),
        ]),
        part,
      ),
    ).toThrow(/3\/4/);
  });

  it('refuses a script that is far too short', () => {
    expect(() =>
      normalizePart(
        reply([...[0, 1, 2, 3].map(mc), ...[0, 1, 2].map(match)], 'short'),
        part,
      ),
    ).toThrow(/too short/);
  });

  it('assigns the types in order when the model forgot them', () => {
    const untyped = [...[0, 1, 2, 3].map(mc), ...[0, 1, 2].map(match)].map(
      ({ type: _t, ...q }) => q,
    );
    expect(normalizePart(reply(untyped), part)).toHaveLength(7);
  });

  it('uses canonical options for True/False/Not Given and Yes/No/Not Given', () => {
    const tfng = READING_PASSAGES[0]; // true-false-not-given ×5 + sentence-completion ×5
    const out = normalizePart(
      {
        passage: WORDS(500),
        questions: [
          ...[0, 1, 2, 0, 1].map((a, i) => ({
            type: 'true-false-not-given',
            question: `S${i}`,
            correct_answer: a,
          })),
          ...[0, 1, 2, 3, 4].map((i) => ({
            type: 'sentence-completion',
            question: `G${i} ______`,
            accepted_answers: [`w${i}`, ' '],
          })),
        ],
      },
      tfng,
    );
    expect(out[0].options).toEqual(['True', 'False', 'Not Given']);
    expect(out[2].correct_answer).toBe(2);
    expect(out[5]).toMatchObject({
      options: [],
      correct_answer: -1,
      accepted_answers: ['w0'],
    });
  });

  it('accepts the answer as a word for T/F/NG and rejects typed questions without answers', () => {
    const tfng = READING_PASSAGES[0];
    const base = (n: number, make: (i: number) => object) =>
      Array.from({ length: n }, (_, i) => make(i));
    const good = [
      ...base(5, (i) => ({
        type: 'true-false-not-given',
        question: `S${i}`,
        correct_answer: 'NOT GIVEN',
      })),
      ...base(5, (i) => ({
        type: 'sentence-completion',
        question: `G${i}`,
        answer: `w${i}`,
      })),
    ];
    const out = normalizePart({ passage: WORDS(500), questions: good }, tfng);
    expect(out[0].correct_answer).toBe(2);
    expect(out[5].accepted_answers).toEqual(['w0']);
    const bad = good.map((q, i) => (i === 7 ? { ...q, answer: '' } : q));
    expect(() =>
      normalizePart({ passage: WORDS(500), questions: bad }, tfng),
    ).toThrow(/4\/5/);
  });
});

describe('charts', () => {
  it('rounds the top of the axis just above the biggest value', () => {
    expect(niceCeil(95)).toBe(100);
    expect(niceCeil(40)).toBe(50);
    expect(niceCeil(101)).toBe(120);
    expect(niceCeil(0)).toBe(10);
  });

  const bars = {
    type: 'bar-grouped',
    title: 'T',
    yLabel: 'Percent',
    categories: ['a', 'b', 'c', 'd'],
    series: [
      { name: 's1', color: 'red', values: [1, 2, 3, 4] },
      { name: 's2', values: [4, 3, 2, 1] },
    ],
  };

  it('keeps the data, assigns the colours and the axis itself', () => {
    const chart = normalizeChart(bars);
    expect(chart).toMatchObject({ type: 'bar-grouped', yMax: 5 });
    if (chart.type !== 'bar-grouped') throw new Error('type');
    expect(chart.series[0].color).not.toBe('red');
    expect(chart.series[0].color).not.toBe(chart.series[1].color);
  });

  it('rejects data that cannot be drawn', () => {
    expect(() =>
      normalizeChart({ ...bars, series: [{ name: 's', values: [1, 2] }] }),
    ).toThrow();
    expect(() =>
      normalizeChart({
        ...bars,
        series: [{ name: 's', values: [1, -2, 3, 4] }],
      }),
    ).toThrow();
    expect(() => normalizeChart({ ...bars, title: '' })).toThrow();
    expect(() => normalizeChart({ type: 'map', title: 'x' })).toThrow(
      /Unsupported/,
    );
    expect(() => normalizeChart(null)).toThrow();
  });

  it('scales pie slices to exactly 100', () => {
    const chart = normalizeChart({
      type: 'pie',
      title: 'Shares',
      slices: [
        { label: 'a', value: 33 },
        { label: 'b', value: 33 },
        { label: 'c', value: 33 },
      ],
    });
    if (chart.type !== 'pie') throw new Error('type');
    expect(
      Math.round(chart.slices.reduce((t, s) => t + s.value, 0) * 10) / 10,
    ).toBe(100);
  });

  it('checks tables and processes', () => {
    const table = normalizeChart({
      type: 'table',
      title: 'Costs',
      headers: ['Item', '2010', '2020'],
      rows: [
        ['a', '1', '2'],
        ['b', '3', '4'],
        ['c', '5', '6'],
      ],
    });
    expect(table.type).toBe('table');
    expect(() =>
      normalizeChart({
        type: 'table',
        title: 'x',
        headers: ['a', 'b'],
        rows: [['1'], ['2'], ['3']],
      }),
    ).toThrow();
    const steps = Array.from({ length: 6 }, (_, i) => ({ label: `Step ${i}` }));
    expect(normalizeChart({ type: 'process', title: 'How', steps }).type).toBe(
      'process',
    );
    expect(() =>
      normalizeChart({
        type: 'process',
        title: 'How',
        steps: steps.slice(0, 3),
      }),
    ).toThrow();
  });

  it('builds the two Writing questions in the standard wording, the chart on Task 1', () => {
    const tasks = normalizeWritingTasks({
      task1: {
        chart: bars,
        sentence: 'The chart below shows two series over four years.',
      },
      task2: {
        prompt:
          'Some people think that homework should be banned. To what extent do you agree or disagree?',
      },
    });
    const [t1, t2] = writingQuestions(tasks, 61);
    expect([t1.id, t2.id]).toEqual([61, 62]);
    expect(t1.type).toBe('writing-task1');
    expect(t1.question).toContain('about 20 minutes');
    expect(t1.question).toContain('at least 150 words');
    expect(JSON.parse(t1.passage as string).type).toBe('bar-grouped');
    expect(t2.question).toContain('about 40 minutes');
    expect(t2.question).toContain('at least 250 words');
    expect(() =>
      normalizeWritingTasks({
        task1: { chart: bars, sentence: 'x' },
        task2: { prompt: 'y' },
      }),
    ).toThrow();
  });
});

describe('normalizeMarking', () => {
  const entry = (task: string, bands: number[]) => ({
    task,
    criteria: Object.fromEntries(
      [
        'task_achievement',
        'coherence_cohesion',
        'lexical_resource',
        'grammatical_range',
      ].map((k, i) => [k, { band: bands[i], comment: `c-${k}` }]),
    ),
    strengths: ['a', 'b'],
    improvements: ['x', 'y', 'z'],
  });

  it('takes the mean of the four criteria to the nearest half band', () => {
    const out = normalizeMarking(
      { tasks: [entry('writing-task2', [6, 6, 6.5, 7])] },
      [{ task: 'writing-task2', words: 260 }],
    );
    expect(out[0]).toMatchObject({
      task: 'writing-task2',
      band: 6.5,
      words: 260,
    }); // 6.375 → 6.5
    expect(out[0].criteria).toHaveLength(4);
    expect(out[0].strengths).toEqual(['a', 'b']);
  });

  it('throws when a band is missing or out of range', () => {
    const wanted = [{ task: 'writing-task1', words: 100 }];
    expect(() => normalizeMarking({ tasks: [] }, wanted)).toThrow();
    expect(() =>
      normalizeMarking(
        { tasks: [entry('writing-task1', [6, 6, 6, 12])] },
        wanted,
      ),
    ).toThrow();
  });
});
