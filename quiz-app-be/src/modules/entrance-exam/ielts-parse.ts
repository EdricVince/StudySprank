import type { ExamQuestion, ExamWritingFeedback } from './dto/exam.dto';
import {
  GradedType,
  PartBlueprint,
  WRITING_CRITERIA,
  WRITING_MIN_WORDS,
  WRITING_SECTION,
  WRITING_TASK1,
  WRITING_TASK2,
  isOptionType,
  isTextType,
} from './ielts-format';

/** Everything the model returns is untrusted: it is parsed and checked here before it is stored. */

type Dict = Record<string, unknown>;
const isDict = (v: unknown): v is Dict =>
  !!v && typeof v === 'object' && !Array.isArray(v);

const text = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

/** The JSON object in a model reply (fences and chatter around it are ignored). */
export function extractJsonObject(raw: string): Dict {
  const cleaned = raw
    .trim()
    .replace(/```json\n?|```/g, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object in the reply');
  const parsed: unknown = JSON.parse(cleaned.slice(start, end + 1));
  if (!isDict(parsed)) throw new Error('Expected a JSON object');
  return parsed;
}

// ── Questions ──────────────────────────────────────────────────────────────────

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x'];

/** The label that is part of the text ("A. ", "iii. ") is dropped: the screen numbers the options itself. */
export function cleanOption(option: unknown): string {
  const raw =
    typeof option === 'string' || typeof option === 'number'
      ? String(option)
      : '';
  return raw
    .replace(/^\s*(?:[A-H]|x|ix|viii|vii|vi|v|iv|iii|ii|i)[.)]\s+/i, '')
    .trim();
}

const TFNG = ['True', 'False', 'Not Given'];
const YNNG = ['Yes', 'No', 'Not Given'];

/** Index of the right option from what the model gave (a number, a letter, a numeral or the text). */
function answerIndex(value: unknown, options: string[]): number {
  if (Number.isInteger(value)) return value as number;
  const s = text(value);
  if (!s) return -1;
  const byText = options.findIndex((o) => o.toLowerCase() === s.toLowerCase());
  if (byText >= 0) return byText;
  if (/^[A-H]$/i.test(s)) return s.toUpperCase().charCodeAt(0) - 65;
  const roman = ROMAN.indexOf(s.toLowerCase().replace(/[.)]$/, ''));
  return roman;
}

const DEFAULT_INSTRUCTION: Record<GradedType, string> = {
  'form-completion':
    'Complete the form below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.',
  'note-completion':
    'Complete the notes below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.',
  'sentence-completion':
    'Complete the sentences below. Write NO MORE THAN TWO WORDS for each answer.',
  'summary-completion':
    'Complete the summary below. Write NO MORE THAN TWO WORDS for each answer.',
  'short-answer':
    'Answer the questions below. Write NO MORE THAN THREE WORDS for each answer.',
  'multiple-choice': 'Choose the correct letter.',
  matching: 'Match each item with the correct option from the list.',
  'matching-headings':
    'Choose the correct heading for each paragraph from the list of headings below.',
  'true-false-not-given':
    'Do the following statements agree with the information given in the passage? Choose TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, NOT GIVEN if there is no information on this.',
  'yes-no-not-given':
    'Do the following statements agree with the views of the writer? Choose YES if the statement agrees with the views of the writer, NO if the statement contradicts the views of the writer, NOT GIVEN if it is impossible to say what the writer thinks about this.',
};

interface CleanQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  accepted_answers: string[];
  instruction: string;
  explanation: string;
}

/** One question of the given type, or null when it cannot be used. */
function cleanQuestion(raw: unknown, type: GradedType): CleanQuestion | null {
  if (!isDict(raw)) return null;
  const question = text(raw.question);
  if (!question) return null;
  const instruction = text(raw.instruction).slice(0, 500);
  const explanation = text(raw.explanation).slice(0, 600);

  if (isTextType(type)) {
    const given: unknown[] = Array.isArray(raw.accepted_answers)
      ? raw.accepted_answers
      : raw.answer !== undefined
        ? [raw.answer]
        : [];
    const accepted = [
      ...new Set(given.map((a) => text(a)).filter((a) => a && a.length <= 80)),
    ].slice(0, 4);
    if (!accepted.length) return null;
    return {
      question,
      options: [],
      correct_answer: -1,
      accepted_answers: accepted,
      instruction,
      explanation,
    };
  }

  if (!isOptionType(type)) return null;
  let options: string[];
  if (type === 'true-false-not-given') options = TFNG;
  else if (type === 'yes-no-not-given') options = YNNG;
  else {
    options = (Array.isArray(raw.options) ? raw.options : [])
      .map(cleanOption)
      .filter(Boolean);
    const min = type === 'multiple-choice' ? 3 : 4;
    if (options.length < min || options.length > 10) return null;
  }
  const answer = answerIndex(raw.correct_answer, options);
  if (answer < 0 || answer >= options.length) return null;
  return {
    question,
    options,
    correct_answer: answer,
    accepted_answers: [],
    instruction,
    explanation,
  };
}

/**
 * The questions of one Listening part / Reading passage, exactly as the blueprint asks (same
 * types, same counts, in the same order). Throws when the reply cannot fill the blueprint, so the
 * caller can ask the model again instead of storing a short or off-format part.
 */
export function normalizePart(
  raw: unknown,
  part: PartBlueprint,
): ExamQuestion[] {
  if (!isDict(raw)) throw new Error('The reply is not an object');
  const body = text(raw.passage) || text(raw.transcript) || text(raw.text);
  if (words(body) < Math.round(part.words[0] * 0.6)) {
    throw new Error(
      `${part.section}: the text is too short (${words(body)} words)`,
    );
  }
  // A reply that forgets "type" is still usable: the questions come in blueprint order.
  const order = part.groups.flatMap((g) =>
    Array<GradedType>(g.count).fill(g.type),
  );
  const items: unknown[] = (
    Array.isArray(raw.questions) ? raw.questions : []
  ).map((q: unknown, i) =>
    isDict(q) && !text(q.type) && order[i] ? { ...q, type: order[i] } : q,
  );

  const out: ExamQuestion[] = [];
  for (const group of part.groups) {
    const ofType = items.filter(
      (q) => isDict(q) && text(q.type) === group.type,
    );
    const clean = ofType
      .map((q) => cleanQuestion(q, group.type))
      .filter((q): q is CleanQuestion => q !== null)
      .slice(0, group.count);
    if (clean.length < group.count) {
      throw new Error(
        `${part.section}: ${clean.length}/${group.count} usable "${group.type}" questions`,
      );
    }
    // A run of questions shares one instruction (and, for matching, one list of options).
    const instruction =
      clean.find((q) => q.instruction)?.instruction ||
      DEFAULT_INSTRUCTION[group.type];
    const sharedOptions =
      group.type === 'matching' || group.type === 'matching-headings'
        ? clean[0].options
        : null;
    for (const q of clean) {
      const options = sharedOptions ?? q.options;
      if (sharedOptions && q.correct_answer >= options.length) {
        throw new Error(
          `${part.section}: a matching answer is outside the shared list`,
        );
      }
      out.push({
        id: out.length + 1,
        section: part.section,
        type: group.type,
        passage: out.length === 0 ? body : null,
        question: q.question,
        options,
        correct_answer: q.correct_answer,
        accepted_answers: q.accepted_answers,
        instruction,
        explanation: q.explanation,
      });
    }
  }
  return out;
}

// ── Writing Task 1 charts ───────────────────────────────────────────────────────

export const CHART_COLORS = [
  '#6366f1',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
];

export interface ChartSeries {
  name: string;
  color: string;
  values: number[];
}
export interface ChartSlice {
  label: string;
  value: number;
  color: string;
}

/** What the front end draws for Writing Task 1 (it is data, not a picture: the app renders it). */
export type ChartSpec =
  | {
      type: 'bar-grouped' | 'line';
      title: string;
      yLabel: string;
      yMax: number;
      categories: string[];
      series: ChartSeries[];
      note?: string;
    }
  | { type: 'pie'; title: string; slices: ChartSlice[]; note?: string }
  | {
      type: 'table';
      title: string;
      headers: string[];
      rows: string[][];
      note?: string;
    }
  | {
      type: 'process';
      title: string;
      steps: { label: string; detail?: string }[];
      note?: string;
    };

export const CHART_TYPES = [
  'bar-grouped',
  'line',
  'pie',
  'table',
  'process',
] as const;

/** A round number just above the biggest value, for the top of the y axis. */
export function niceCeil(value: number): number {
  if (value <= 0) return 10;
  const target = value * 1.05;
  const magnitude = 10 ** Math.floor(Math.log10(target));
  for (const step of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (step * magnitude >= target) return step * magnitude;
  }
  return 10 * magnitude;
}

const finite = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

function strings(
  v: unknown,
  min: number,
  max: number,
  maxLen: number,
): string[] {
  const list = (Array.isArray(v) ? v : []).map(
    (s) => text(s) || (finite(s) ? String(s) : ''),
  );
  if (
    list.length < min ||
    list.length > max ||
    list.some((s) => !s || s.length > maxLen)
  ) {
    throw new Error(`Expected ${min}–${max} short texts`);
  }
  return list;
}

/** A chart the model proposed, checked and cleaned (colours are ours, the axis is computed). */
export function normalizeChart(raw: unknown): ChartSpec {
  if (!isDict(raw)) throw new Error('The chart is not an object');
  const type = text(raw.type);
  const title = text(raw.title);
  if (!title || title.length > 180) throw new Error('The chart needs a title');
  const note = text(raw.note).slice(0, 160) || undefined;

  if (type === 'bar-grouped' || type === 'line') {
    const categories = strings(raw.categories, 3, 8, 30);
    const rawSeries = Array.isArray(raw.series) ? raw.series : [];
    if (rawSeries.length < 1 || rawSeries.length > 4)
      throw new Error('1–4 series expected');
    const series = rawSeries.map((s, i): ChartSeries => {
      if (!isDict(s)) throw new Error('A series is not an object');
      const values = Array.isArray(s.values) ? s.values : [];
      if (
        values.length !== categories.length ||
        !values.every((v) => finite(v) && v >= 0)
      ) {
        throw new Error(
          'Every series needs one non-negative number per category',
        );
      }
      return {
        name: text(s.name) || `Series ${i + 1}`,
        color: CHART_COLORS[i % CHART_COLORS.length],
        values: values as number[],
      };
    });
    const top = Math.max(...series.flatMap((s) => s.values));
    return {
      type,
      title,
      yLabel: text(raw.yLabel).slice(0, 60),
      yMax: niceCeil(top),
      categories,
      series,
      note,
    };
  }

  if (type === 'pie') {
    const rawSlices = Array.isArray(raw.slices) ? raw.slices : [];
    if (rawSlices.length < 3 || rawSlices.length > 7)
      throw new Error('3–7 slices expected');
    const slices = rawSlices.map((s) => {
      if (!isDict(s) || !finite(s.value) || s.value <= 0 || !text(s.label)) {
        throw new Error('A slice needs a label and a positive value');
      }
      return { label: text(s.label).slice(0, 40), value: s.value };
    });
    // Shown as percentages: scale to 100 (the model's numbers are usually already shares).
    const total = slices.reduce((t, s) => t + s.value, 0);
    const scaled = slices.map((s) => Math.round((s.value / total) * 1000) / 10);
    const drift =
      Math.round((100 - scaled.reduce((a, b) => a + b, 0)) * 10) / 10;
    scaled[scaled.indexOf(Math.max(...scaled))] += drift;
    return {
      type,
      title,
      slices: slices.map((s, i) => ({
        label: s.label,
        value: Math.round(scaled[i] * 10) / 10,
        color: CHART_COLORS[i % CHART_COLORS.length],
      })),
      note,
    };
  }

  if (type === 'table') {
    const headers = strings(raw.headers, 2, 6, 40);
    const rawRows = Array.isArray(raw.rows) ? raw.rows : [];
    if (rawRows.length < 3 || rawRows.length > 8)
      throw new Error('3–8 rows expected');
    const rows = rawRows.map((r) =>
      strings(r, headers.length, headers.length, 40),
    );
    return { type, title, headers, rows, note };
  }

  if (type === 'process') {
    const rawSteps = Array.isArray(raw.steps) ? raw.steps : [];
    if (rawSteps.length < 5 || rawSteps.length > 9)
      throw new Error('5–9 steps expected');
    const steps = rawSteps.map((s) => {
      const label = isDict(s) ? text(s.label) : text(s);
      if (!label || label.length > 70)
        throw new Error('A step needs a short label');
      const detail = isDict(s) ? text(s.detail).slice(0, 140) : '';
      return detail ? { label, detail } : { label };
    });
    return { type, title, steps, note };
  }

  throw new Error(`Unsupported chart type "${type}"`);
}

/** The noun the Task 1 statement uses for the chart ("The bar chart below…"). */
export function chartNoun(chart: ChartSpec): string {
  switch (chart.type) {
    case 'bar-grouped':
      return 'bar chart';
    case 'line':
      return 'line graph';
    case 'pie':
      return 'pie chart';
    case 'table':
      return 'table';
    case 'process':
      return 'diagram';
  }
}

// ── Writing ────────────────────────────────────────────────────────────────────

export interface WritingTasks {
  chart: ChartSpec;
  /** One sentence saying what the chart shows ("The graph below shows…"). */
  sentence: string;
  /** The essay topic and its question(s). */
  prompt: string;
}

export function normalizeWritingTasks(raw: unknown): WritingTasks {
  if (!isDict(raw) || !isDict(raw.task1) || !isDict(raw.task2)) {
    throw new Error('Both writing tasks are required');
  }
  const chart = normalizeChart(raw.task1.chart);
  const sentence = text(raw.task1.sentence);
  if (sentence.length < 20 || sentence.length > 300) {
    throw new Error('Task 1 needs a sentence describing the chart');
  }
  const prompt = text(raw.task2.prompt);
  if (prompt.length < 40 || prompt.length > 700) {
    throw new Error('Task 2 needs an essay prompt');
  }
  return { chart, sentence, prompt };
}

/** The two Writing questions as they are shown to the student, in the standard IELTS wording. */
export function writingQuestions(
  tasks: WritingTasks,
  firstId: number,
): ExamQuestion[] {
  const task1 = [
    'You should spend about 20 minutes on this task.',
    tasks.sentence,
    'Summarise the information by selecting and reporting the main features, and make comparisons where relevant.',
    `Write at least ${WRITING_MIN_WORDS.task1} words.`,
  ].join('\n\n');
  const task2 = [
    'You should spend about 40 minutes on this task.',
    'Write about the following topic:',
    tasks.prompt,
    'Give reasons for your answer and include any relevant examples from your own knowledge or experience.',
    `Write at least ${WRITING_MIN_WORDS.task2} words.`,
  ].join('\n\n');
  const base = {
    section: WRITING_SECTION,
    options: [],
    correct_answer: -1,
    explanation: '',
  };
  return [
    {
      ...base,
      id: firstId,
      type: WRITING_TASK1,
      passage: JSON.stringify(tasks.chart),
      question: task1,
    },
    {
      ...base,
      id: firstId + 1,
      type: WRITING_TASK2,
      passage: null,
      question: task2,
    },
  ];
}

// ── Writing marking ────────────────────────────────────────────────────────────

const strList = (v: unknown, max: number): string[] =>
  (Array.isArray(v) ? v : [])
    .map((s) => text(s).slice(0, 300))
    .filter(Boolean)
    .slice(0, max);

/**
 * The examiner's marks from the model: one entry per answer that was marked, with the four
 * criteria on the 0–9 scale (halves) and the task band as their mean to the nearest half band.
 * Throws when an answer has no usable marks, so the caller can leave the Writing band empty
 * instead of inventing one.
 */
export function normalizeMarking(
  raw: unknown,
  wanted: { task: string; words: number }[],
): ExamWritingFeedback[] {
  const entries: unknown[] =
    isDict(raw) && Array.isArray(raw.tasks) ? raw.tasks : [];
  return wanted.map(({ task, words: count }) => {
    const entry = entries.find((e) => isDict(e) && text(e.task) === task);
    if (!isDict(entry) || !isDict(entry.criteria)) {
      throw new Error(`No marks for ${task}`);
    }
    const criteria = WRITING_CRITERIA.map((key) => {
      const c = (entry.criteria as Dict)[key];
      const band = isDict(c) ? c.band : undefined;
      if (!finite(band) || band < 0 || band > 9) {
        throw new Error(`Bad band for ${task}/${key}`);
      }
      return {
        key: key as string,
        band: Math.round(band * 2) / 2,
        comment: isDict(c) ? text(c.comment).slice(0, 400) : '',
      };
    });
    const mean = criteria.reduce((t, c) => t + c.band, 0) / criteria.length;
    return {
      task,
      band: Math.round(mean * 2) / 2,
      words: count,
      criteria,
      strengths: strList(entry.strengths, 3),
      improvements: strList(entry.improvements, 4),
    };
  });
}
