/**
 * The shape of the IELTS Academic mock test and how it is scored.
 *
 * Everything that decides "how many questions, of which kind, in how many minutes" lives here, so
 * changing the exam (e.g. 40 questions per skill like the real test) is a change to these tables.
 */

/** Questions answered by choosing one of the options. */
export const OPTION_TYPES = [
  'multiple-choice',
  'true-false-not-given',
  'yes-no-not-given',
  'matching',
  'matching-headings',
] as const;

/** Questions answered by typing a word, a number or a short phrase. */
export const TEXT_TYPES = [
  'form-completion',
  'note-completion',
  'sentence-completion',
  'summary-completion',
  'short-answer',
] as const;

export type OptionType = (typeof OPTION_TYPES)[number];
export type TextType = (typeof TEXT_TYPES)[number];
export type GradedType = OptionType | TextType;

export const isOptionType = (type: string): type is OptionType =>
  (OPTION_TYPES as readonly string[]).includes(type);
export const isTextType = (type: string): type is TextType =>
  (TEXT_TYPES as readonly string[]).includes(type);

export const WRITING_SECTION = 'Writing';
export const WRITING_TASK1 = 'writing-task1';
export const WRITING_TASK2 = 'writing-task2';

/** One run of questions of the same type inside a part (they share one instruction). */
export interface QuestionGroup {
  type: GradedType;
  count: number;
}

/** A Listening part or a Reading passage. */
export interface PartBlueprint {
  section: string;
  skill: 'Listening' | 'Reading';
  /** True for academic content (themed); false for an everyday, social setting. */
  academic: boolean;
  /** What the model has to write: the audio script or the passage. */
  brief: string;
  /** Length of the script / passage in words (min, max). */
  words: [number, number];
  groups: QuestionGroup[];
}

const sum = (groups: QuestionGroup[]) =>
  groups.reduce((total, g) => total + g.count, 0);

/** Four parts, as in the real test: two social, two academic (30 questions here, 40 in the real one). */
export const LISTENING_PARTS: PartBlueprint[] = [
  {
    section: 'Listening Part 1',
    skill: 'Listening',
    academic: false,
    brief:
      'a conversation between TWO speakers in an everyday social context (for example making a booking, an enquiry or a registration); two named speakers, natural turns, with names, numbers, dates and prices spelled out the way they are in speech',
    words: [330, 400],
    groups: [
      { type: 'form-completion', count: 5 },
      { type: 'note-completion', count: 3 },
    ],
  },
  {
    section: 'Listening Part 2',
    skill: 'Listening',
    academic: false,
    brief:
      'a monologue in an everyday social context (for example a guide welcoming visitors, a talk about local facilities, a radio announcement); ONE speaker, describing places, arrangements or options',
    words: [340, 420],
    groups: [
      { type: 'multiple-choice', count: 4 },
      { type: 'matching', count: 3 },
    ],
  },
  {
    section: 'Listening Part 3',
    skill: 'Listening',
    academic: true,
    brief:
      'a discussion between a tutor and TWO or THREE students about an academic assignment or project; named speakers, differing opinions, agreement and disagreement',
    words: [420, 500],
    groups: [
      { type: 'multiple-choice', count: 4 },
      { type: 'sentence-completion', count: 4 },
    ],
  },
  {
    section: 'Listening Part 4',
    skill: 'Listening',
    academic: true,
    brief:
      'an academic lecture by ONE speaker to university students, with clear signposting (firstly, however, in conclusion) and no interruptions',
    words: [440, 520],
    groups: [
      { type: 'note-completion', count: 4 },
      { type: 'summary-completion', count: 3 },
    ],
  },
];

/** Three passages of rising difficulty (30 questions here, 40 in the real test). */
export const READING_PASSAGES: PartBlueprint[] = [
  {
    section: 'Reading Passage 1',
    skill: 'Reading',
    academic: true,
    brief:
      'a descriptive, factual magazine-style article (the easiest passage of the paper) written in lettered paragraphs',
    words: [520, 620],
    groups: [
      { type: 'true-false-not-given', count: 5 },
      { type: 'sentence-completion', count: 5 },
    ],
  },
  {
    section: 'Reading Passage 2',
    skill: 'Reading',
    academic: true,
    brief:
      'an analytical article in FIVE lettered paragraphs (A–E), each with a clear main idea so that paragraph headings can be matched to them',
    words: [560, 660],
    groups: [
      { type: 'matching-headings', count: 5 },
      { type: 'multiple-choice', count: 5 },
    ],
  },
  {
    section: 'Reading Passage 3',
    skill: 'Reading',
    academic: true,
    brief:
      'a demanding argumentative text (the hardest passage): the writer gives and weighs opinions, with abstract vocabulary and implied meaning',
    words: [600, 700],
    groups: [
      { type: 'yes-no-not-given', count: 4 },
      { type: 'multiple-choice', count: 3 },
      { type: 'summary-completion', count: 3 },
    ],
  },
];

export const ALL_PARTS: PartBlueprint[] = [
  ...LISTENING_PARTS,
  ...READING_PASSAGES,
];

/** Minutes allowed per skill (as in the real test). */
export const SKILL_MINUTES = {
  Listening: 30,
  Reading: 60,
  Writing: 60,
} as const;
export const EXAM_TIME_LIMIT_MIN =
  SKILL_MINUTES.Listening + SKILL_MINUTES.Reading + SKILL_MINUTES.Writing;

export const WRITING_MIN_WORDS = { task1: 150, task2: 250 } as const;
/** The four public Writing band descriptors (for Task 2, task_achievement is "Task Response"). */
export const WRITING_CRITERIA = [
  'task_achievement',
  'coherence_cohesion',
  'lexical_resource',
  'grammatical_range',
] as const;
/** How much of the Writing band each task weighs (Task 2 counts twice as much). */
export const WRITING_WEIGHTS = { task1: 1, task2: 2 } as const;

export const partQuestionCount = (part: PartBlueprint) => sum(part.groups);
export const questionsOf = (skill: 'Listening' | 'Reading') =>
  ALL_PARTS.filter((p) => p.skill === skill).reduce(
    (total, p) => total + partQuestionCount(p),
    0,
  );

/** What the front end shows about the exam before it starts (no hard-coded numbers there). */
export function examFormatSummary() {
  const listening = LISTENING_PARTS;
  const reading = READING_PASSAGES;
  return {
    listening: {
      parts: listening.length,
      questions: questionsOf('Listening'),
      minutes: SKILL_MINUTES.Listening,
    },
    reading: {
      passages: reading.length,
      questions: questionsOf('Reading'),
      minutes: SKILL_MINUTES.Reading,
    },
    writing: { tasks: 2, minutes: SKILL_MINUTES.Writing },
    total_questions: questionsOf('Listening') + questionsOf('Reading'),
    total_minutes: EXAM_TIME_LIMIT_MIN,
  };
}

// ── Scoring ────────────────────────────────────────────────────────────────────

/** [raw score out of 40 at least, band] — the published conversion tables, best band first. */
const LISTENING_BANDS: [number, number][] = [
  [39, 9],
  [37, 8.5],
  [35, 8],
  [32, 7.5],
  [30, 7],
  [26, 6.5],
  [23, 6],
  [18, 5.5],
  [16, 5],
  [13, 4.5],
  [10, 4],
  [8, 3.5],
  [6, 3],
  [4, 2.5],
  [3, 2],
  [2, 1.5],
  [1, 1],
];
const READING_BANDS: [number, number][] = [
  [39, 9],
  [37, 8.5],
  [35, 8],
  [33, 7.5],
  [30, 7],
  [27, 6.5],
  [23, 6],
  [19, 5.5],
  [15, 5],
  [13, 4.5],
  [10, 4],
  [8, 3.5],
  [6, 3],
  [4, 2.5],
  [3, 2],
  [2, 1.5],
  [1, 1],
];

/** Round to the nearest half band (…25 goes up to …5, …75 to the next whole band). */
export const roundHalf = (value: number) => Math.round(value * 2) / 2;

/**
 * The band for a Listening / Reading score. The tables are for 40 questions, so a shorter paper is
 * scaled up to 40 first (28/30 counts as 37/40).
 */
export function bandFromRaw(
  skill: 'Listening' | 'Reading',
  correct: number,
  total: number,
): number {
  if (total <= 0) return 0;
  const raw40 = Math.round((correct / total) * 40);
  const table = skill === 'Listening' ? LISTENING_BANDS : READING_BANDS;
  return table.find(([min]) => raw40 >= min)?.[1] ?? 0;
}

/** Overall band: the mean of the skills that were sat, to the nearest half band; null if none. */
export function overallBand(
  bands: (number | null | undefined)[],
): number | null {
  const sat = bands.filter((b): b is number => typeof b === 'number');
  if (!sat.length) return null;
  return roundHalf(sat.reduce((a, b) => a + b, 0) / sat.length);
}

/** The CEFR level an overall band corresponds to. */
export function levelOfBand(band: number): string {
  if (band >= 8) return 'C2 — Expert';
  if (band >= 7) return 'C1 — Advanced';
  if (band >= 5.5) return 'B2 — Upper-Intermediate';
  if (band >= 4) return 'B1 — Intermediate';
  if (band >= 3) return 'A2 — Elementary';
  return 'A1 — Starter';
}

/** Writing band from the bands of the tasks that were written, weighted (Task 2 counts double). */
export function writingBand(tasks: {
  task1?: number | null;
  task2?: number | null;
}): number | null {
  const parts: [number, number][] = [];
  if (typeof tasks.task1 === 'number')
    parts.push([tasks.task1, WRITING_WEIGHTS.task1]);
  if (typeof tasks.task2 === 'number')
    parts.push([tasks.task2, WRITING_WEIGHTS.task2]);
  if (!parts.length) return null;
  const weight = parts.reduce((total, [, w]) => total + w, 0);
  return roundHalf(
    parts.reduce((total, [band, w]) => total + band * w, 0) / weight,
  );
}

// ── Typed answers ──────────────────────────────────────────────────────────────

/** Lower-case, no punctuation, single spaces: spelling must still be exact, case and stops are not. */
export function normalizeAnswerText(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A typed answer is right when it equals any accepted answer (after normalising both). */
export function isTextAnswerCorrect(
  written: string | undefined | null,
  accepted: string[] | undefined | null,
): boolean {
  const answer = normalizeAnswerText(written ?? '');
  if (!answer) return false;
  return (accepted ?? []).some((a) => normalizeAnswerText(a) === answer);
}
