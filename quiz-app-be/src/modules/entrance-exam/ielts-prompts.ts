import {
  GradedType,
  PartBlueprint,
  WRITING_CRITERIA,
  WRITING_MIN_WORDS,
  WRITING_TASK1,
  WRITING_TASK2,
} from './ielts-format';
import type { ChartSpec } from './ielts-parse';

/** The prompts sent to the model. Kept apart from the service so the wording can be read (and tested) on its own. */

export const EXAM_LANGUAGES = {
  en: 'English',
  vi: 'Vietnamese',
  zh: 'Chinese',
} as const;
export type ExamLanguage = keyof typeof EXAM_LANGUAGES;

/** Everyday settings for Listening Parts 1 and 2 (the social-context parts). */
export const LISTENING_SCENARIOS = [
  'booking a guided tour or a day trip',
  'enquiring about a language or evening course',
  'joining a sports centre or a library',
  'arranging accommodation or a short-term rental',
  'organising a school or community event',
  'reporting a problem to a travel or service company',
  'a welcome talk at a museum, park or visitor centre',
  'an announcement about facilities at a new shopping or leisure complex',
  'a talk about volunteering opportunities in the town',
  'a radio programme about a local festival',
];

const GROUP_SPEC: Record<GradedType, string> = {
  'form-completion':
    'FORM COMPLETION. Each question is ONE line of a form with a gap written as "______", e.g. "Name of the tour: ______ Gardens". The answer is a word, number, date or name said in the script (spelled or stated clearly), at most TWO WORDS AND/OR A NUMBER. "accepted_answers": every acceptable spelling (e.g. ["7.30", "7:30", "half past seven"]).',
  'note-completion':
    'NOTE COMPLETION. Each question is ONE line of a set of notes with a gap written as "______" (use short note-style wording). The answer is taken exactly from the script, at most TWO WORDS AND/OR A NUMBER. "accepted_answers": every acceptable spelling.',
  'sentence-completion':
    'SENTENCE COMPLETION. Each question is ONE sentence with a gap written as "______". The answer is taken exactly from the text, at most TWO WORDS. "accepted_answers": every acceptable spelling.',
  'summary-completion':
    'SUMMARY COMPLETION. Together the questions form ONE summary: each question is the next sentence of that summary, in order, with one gap written as "______". The answer is taken exactly from the text, at most TWO WORDS. "accepted_answers": every acceptable spelling.',
  'short-answer':
    'SHORT ANSWER. Each question is a direct question; the answer is at most THREE WORDS taken from the text. "accepted_answers": every acceptable spelling.',
  'multiple-choice':
    'MULTIPLE CHOICE (one answer). Each question has its own "options" (the letters A, B, C… are added by the app, do not write them) and "correct_answer" = the 0-based index of the right option. Wrong options must be plausible and mentioned or alluded to in the text.',
  matching:
    'MATCHING. ONE shared list of options (6 items, e.g. places, people or features) is repeated, identical, in the "options" of EVERY question of this group. Each question is one item to be matched ("Which feature belongs to the library?"), "correct_answer" = the 0-based index in the shared list. Some options are not used.',
  'matching-headings':
    'MATCHING HEADINGS. ONE shared list of 7 paragraph headings (5 right, 2 extra) is repeated, identical, in the "options" of EVERY question of this group. Each question is "Paragraph X" (the lettered paragraphs of the passage); "correct_answer" = the 0-based index of its heading in the shared list. Write headings WITHOUT roman numerals.',
  'true-false-not-given':
    'TRUE / FALSE / NOT GIVEN. Each question is ONE statement about the information in the passage, in the order it appears. "correct_answer" = 0 for TRUE, 1 for FALSE, 2 for NOT GIVEN; use all three answers. Do not write options.',
  'yes-no-not-given':
    'YES / NO / NOT GIVEN. Each question is ONE statement about the writer\'s views or claims, in the order they appear. "correct_answer" = 0 for YES, 1 for NO, 2 for NOT GIVEN; use all three answers. Do not write options.',
};

/** The prompt for one Listening part or Reading passage. */
export function partPrompt(part: PartBlueprint, topic: string): string {
  const listening = part.skill === 'Listening';
  const groups = part.groups
    .map((g, i) => `  ${i + 1}. ${g.count} × ${g.type}: ${GROUP_SPEC[g.type]}`)
    .join('\n');
  const total = part.groups.reduce((n, g) => n + g.count, 0);
  const textKey = listening ? '"transcript"' : '"passage"';

  return `You are a senior IELTS Academic exam writer at Cambridge Assessment. Write ${part.section} of a full IELTS Academic ${part.skill} test, in the exact official format.

TOPIC: ${topic}

${listening ? 'SCRIPT' : 'PASSAGE'}: write ${part.brief}.
- ${part.words[0]}–${part.words[1]} words, British English, natural ${listening ? 'spoken' : 'written'} style, level ${part.section.endsWith('4') || part.section.endsWith('3') ? 'B2–C1' : 'B1–B2'}.
${
  listening
    ? '- Put every turn on its own line as "Speaker name: words". For a single speaker write plain text with no label.\n- Spell out numbers, dates, prices and postcodes the way they are said. The answers must be audible in the script, in the order of the questions.'
    : '- Divide the passage into paragraphs labelled A, B, C… (a capital letter on its own line before each paragraph).\n- The questions follow the order of the passage (except matching headings).'
}

QUESTIONS: exactly ${total}, in this order and of these types:
${groups}

Every question object: {"type": "<one of the types above>", "instruction": "<the official rubric for the group, e.g. 'Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.'>", "question": "...", "options": [...], "correct_answer": <index or -1>, "accepted_answers": [...], "explanation": "<one sentence quoting or pointing to where the answer is>"}
For typed-answer questions use "options": [] and "correct_answer": -1. For option questions use "accepted_answers": [].
${listening ? 'Multiple-choice questions have 3 options.' : 'Multiple-choice questions have 4 options.'}

Return ONLY one JSON object, no markdown:
{"${listening ? 'transcript' : 'passage'}": "...", "questions": [ ... ]}
The ${textKey} text is a single string (use \\n for line breaks).`;
}

const CHART_SPEC: Record<ChartSpec['type'], string> = {
  'bar-grouped':
    '{"type":"bar-grouped","title":"<title in the IELTS style>","yLabel":"<unit, e.g. Percentage (%)>","categories":["<5 categories, e.g. years or countries>"],"series":[{"name":"<legend>","values":[<5 numbers>]},{"name":"<legend>","values":[<5 numbers>]}],"note":"<optional source line>"}  (2–3 series, realistic values)',
  line: '{"type":"line","title":"<title in the IELTS style>","yLabel":"<unit>","categories":["<6 time points, e.g. years>"],"series":[{"name":"<legend>","values":[<6 numbers>]},{"name":"<legend>","values":[<6 numbers>]}],"note":"<optional source line>"}  (2–3 series showing trends that cross or diverge)',
  pie: '{"type":"pie","title":"<title in the IELTS style>","slices":[{"label":"<category>","value":<share>}, … 5 slices],"note":"<optional source line>"}  (values are percentages that add up to 100)',
  table:
    '{"type":"table","title":"<title in the IELTS style>","headers":["<first column heading>","<col 2>","<col 3>","<col 4>"],"rows":[["<row label>","<value>","<value>","<value>"], … 5 rows],"note":"<optional source line>"}  (all cells are short strings, numbers with their unit)',
  process:
    '{"type":"process","title":"<how X is made / works>","steps":[{"label":"<2–5 words>","detail":"<optional, max 12 words>"}, … 6–8 steps]}  (a man-made or natural process with a clear order)',
};

/** The prompt for the Writing tasks: Task 1 data (rendered by the app) and the Task 2 essay topic. */
export function writingPrompt(
  chartType: ChartSpec['type'],
  topic1: string,
  topic2: string,
): string {
  return `You are a senior IELTS Academic exam writer. Write the two Writing tasks of an IELTS Academic test.

TASK 1: a ${chartType === 'process' ? 'process diagram' : 'data description'} task. The app draws the visual from the data you give, so the data must be complete and consistent. Topic area: ${topic1}.
"chart" must have exactly this shape:
${CHART_SPEC[chartType]}
"sentence" = the one sentence of the rubric that introduces the visual, in the official wording, e.g. "The graph below shows the percentage of households with internet access in four countries between 2000 and 2020." (it must match the data).

TASK 2: an essay question in the official wording. Topic area: ${topic2}. Use one of the standard formats: opinion (agree/disagree), discussion of both views plus own opinion, advantages and disadvantages, problem and solution, or two-part question. Write 2–4 sentences (the statement, then the instruction).

Return ONLY one JSON object, no markdown:
{"task1": {"chart": {...}, "sentence": "..."}, "task2": {"prompt": "..."}}`;
}

/** The prompt that marks the Writing tasks like an examiner (public band descriptors). */
export function writingMarkingPrompt(
  tasks: { task: string; question: string; text: string; words: number }[],
  language: ExamLanguage,
): string {
  const body = tasks
    .map(
      (t, i) =>
        `### ${i + 1}. ${t.task === WRITING_TASK1 ? 'Task 1' : 'Task 2'} (${t.words} words; minimum ${t.task === WRITING_TASK1 ? WRITING_MIN_WORDS.task1 : WRITING_MIN_WORDS.task2})
QUESTION:
${t.question}

STUDENT ANSWER:
${t.text}`,
    )
    .join('\n\n');
  return `You are a certified IELTS Writing examiner. Mark each answer with the official public band descriptors on the four criteria: ${WRITING_CRITERIA.join(', ')} (for Task 2, task_achievement means Task Response). Be strict and realistic: a band 7+ needs a clear position, full development and a wide, accurate range. An answer under the minimum word count, off-topic or memorised must lose marks on task_achievement.

${body}

Bands are 0–9 in steps of 0.5. Write every "comment", "strengths" and "improvements" in ${EXAM_LANGUAGES[language]} (keep quoted student phrases as written). Each comment is one specific sentence; give 2 strengths and 3 concrete improvements per task.

Return ONLY one JSON object, no markdown:
{"tasks":[{"task":"writing-task1","criteria":{"task_achievement":{"band":0,"comment":""},"coherence_cohesion":{"band":0,"comment":""},"lexical_resource":{"band":0,"comment":""},"grammatical_range":{"band":0,"comment":""}},"strengths":[""],"improvements":[""]}]}
Include one entry per answer above, with "task" = "${WRITING_TASK1}" or "${WRITING_TASK2}".`;
}

/** The prompt for the study advice shown with the result. */
export function recommendationsPrompt(input: {
  overall: number;
  level: string;
  skills: { skill: string; band: number | null }[];
  weak: string[];
  language: ExamLanguage;
}): string {
  const skills = input.skills
    .map((s) => `${s.skill}: ${s.band ?? 'not taken'}`)
    .join(', ');
  return `You are an expert IELTS Academic coach. A student just finished a full mock test.

Overall band: ${input.overall} (${input.level}). Skills: ${skills}.
Weak parts: ${input.weak.length ? input.weak.join(', ') : 'none identified'}.

Give exactly 4 concise, actionable study recommendations in ${EXAM_LANGUAGES[input.language]}, 1–2 sentences each, starting with the weakest skill.
Return ONLY a JSON array of strings, no markdown.`;
}

const FALLBACK: Record<
  ExamLanguage,
  (overall: number, weak: string[]) => string[]
> = {
  en: (overall, weak) => [
    `Your overall band is ${overall.toFixed(1)}.`,
    overall >= 6.5
      ? 'Good result! Keep practising full papers under time to reach a higher band.'
      : `Practise more, especially: ${weak.join(', ') || 'all four skills'}.`,
    'Use the AI study planner to build a personal schedule.',
  ],
  vi: (overall, weak) => [
    `Band tổng của bạn là ${overall.toFixed(1)}.`,
    overall >= 6.5
      ? 'Kết quả tốt! Hãy tiếp tục luyện đề đủ thời gian để đạt band cao hơn.'
      : `Hãy luyện thêm, đặc biệt các phần: ${weak.join(', ') || 'cả bốn kỹ năng'}.`,
    'Dùng AI Study Planner để lên lịch học cá nhân hóa.',
  ],
  zh: (overall, weak) => [
    `你的总分是 ${overall.toFixed(1)}。`,
    overall >= 6.5
      ? '成绩不错！继续限时做完整试卷，争取更高的分数。'
      : `请多加练习，尤其是：${weak.join('、') || '四项技能'}。`,
    '使用 AI 学习计划功能制定个人学习计划。',
  ],
};

/** Advice used when the AI is unavailable. */
export const fallbackRecommendations = (
  language: ExamLanguage,
  overall: number,
  weak: string[],
): string[] => FALLBACK[language](overall, weak);
