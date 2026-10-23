import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AI_MODEL,
  AI_NOT_CONFIGURED,
  getAnthropicClient,
} from '../../core/ai/anthropic';
import { messageText } from '../../core/ai/ai-response';
import { ExamPaper } from './entities/exam-paper.entity';
import type { ExamSectionFormat } from './entities/exam-paper.entity';
import { ExamAttempt } from './entities/exam-attempt.entity';
import type { ExamQuestionRow } from './entities/exam-question.entity';
import type {
  ExamHistoryItem,
  ExamQuestion,
  ExamResult,
  ExamReviewItem,
  ExamType,
  ExamWritingResponse,
  StartExamDto,
  SubmitExamDto,
} from './dto/exam.dto';

/** Minutes allowed for the 20-question IELTS mini exam. */
const EXAM_TIME_LIMIT_MIN = 30;
/** Token budget for generating the exam (passages + questions + chart). */
const EXAM_MAX_TOKENS = 4800;
/** How many past sittings the history list returns. */
const HISTORY_LIMIT = 20;

// 18 diverse themes to maximise variety across sessions
const IELTS_THEMES = [
  'Healthcare & Medical Science — hospitals, public health, medical research, disease prevention',
  'Environment & Ecology — climate change, biodiversity, conservation, carbon emissions',
  'Technology & Society — AI, digital transformation, social media, cybersecurity',
  'Education & Academia — university life, teaching methods, learning styles, student welfare',
  'Urban Development & Architecture — smart cities, housing, infrastructure, urban planning',
  'Business & Economics — entrepreneurship, globalisation, corporate culture, trade',
  'Psychology & Human Behaviour — motivation, decision-making, mental health, cognition',
  'Food Science & Nutrition — diet, food production, agricultural technology, health impacts',
  'Space Exploration & Astronomy — telescopes, Mars missions, satellite technology, cosmology',
  'Marine Biology & Ocean Science — coral reefs, deep sea, ocean pollution, fisheries',
  'Renewable Energy & Clean Technology — solar, wind, hydrogen fuel, energy storage',
  'Ancient History & Archaeology — civilisations, artefacts, excavation, historical trade',
  'Linguistics & Language Learning — language acquisition, multilingualism, endangered languages',
  'Transport & Infrastructure — high-speed rail, aviation, electric vehicles, road design',
  'Genetics & Biotechnology — CRISPR, genome sequencing, bioethics, genetically modified organisms',
  'Media & Communication — journalism, broadcasting, digital news, misinformation',
  'Migration & Global Societies — immigration policy, cultural integration, diaspora communities',
  'Wildlife Conservation & Zoology — endangered species, rewilding, habitat loss, animal behaviour',
];

// ── Scoring helper ─────────────────────────────────────────────────────────────

function estimateIelts(pct: number): { band: string; level: string } {
  if (pct >= 90) return { band: '8.0–9.0', level: 'C2 — Expert' };
  if (pct >= 80) return { band: '7.0–7.5', level: 'C1 — Advanced' };
  if (pct >= 68) return { band: '6.0–6.5', level: 'B2 — Upper-Intermediate' };
  if (pct >= 55) return { band: '5.0–5.5', level: 'B1 — Intermediate' };
  if (pct >= 42) return { band: '4.0–4.5', level: 'A2 — Elementary' };
  if (pct >= 28) return { band: '3.0–3.5', level: 'A2 — Beginner' };
  return { band: '1.0–2.5', level: 'A1 — Starter' };
}

// ── Robust JSON-array parser ───────────────────────────────────────────────────
// Extracts and repairs a potentially truncated JSON array from AI output.

function tryParseJsonArray(raw: string): unknown[] {
  const asArray = (text: string): unknown[] => {
    const v: unknown = JSON.parse(text);
    if (!Array.isArray(v)) throw new Error('Expected a JSON array');
    return v as unknown[];
  };
  const cleaned = raw
    .trim()
    .replace(/```json\n?|```/g, '')
    .trim();

  // 1. Happy path
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      return asArray(match[0]);
    } catch {
      /* fall through to repair */
    }

    let text = match[0];
    // Remove last incomplete object (no closing brace before end of array)
    text = text.replace(/,?\s*\{[^{}]*$/, '');
    // Remove trailing dangling comma
    text = text.replace(/,\s*$/, '');
    // Count and close unclosed brackets
    const objOpen =
      (text.match(/\{/g) ?? []).length - (text.match(/\}/g) ?? []).length;
    const arrOpen =
      (text.match(/\[/g) ?? []).length - (text.match(/\]/g) ?? []).length;
    for (let i = 0; i < objOpen; i++) text += '}';
    for (let i = 0; i < arrOpen; i++) text += ']';
    try {
      return asArray(text);
    } catch {
      /* fall through */
    }
  }

  // 2. Last resort — parse the whole cleaned string
  return asArray(cleaned);
}

/** Shape of one question as produced by the model (everything is untrusted). */
interface RawQuestion {
  section?: unknown;
  type?: unknown;
  passage?: unknown;
  question?: unknown;
  options?: unknown;
  correct_answer?: unknown;
  explanation?: unknown;
}

function nonEmpty(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

/** Writing Task 1 comes back as a nested chart object — store it as a JSON string. */
function passageText(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() ? value : null;
  if (value && typeof value === 'object') return JSON.stringify(value);
  return null;
}

/**
 * Turn the model's raw array into clean questions: drops entries without question
 * text, numbers them 1..n, and makes sure the answer key points at a real option.
 */
export function normalizeQuestions(raw: unknown[]): ExamQuestion[] {
  const out: ExamQuestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const q = item as RawQuestion;
    if (typeof q.question !== 'string' || !q.question.trim()) continue;

    const section = nonEmpty(q.section, 'Reading');
    const isWriting = section === 'Writing';
    const options =
      !isWriting && Array.isArray(q.options)
        ? q.options.map((o) => String(o))
        : [];
    const answer = Number.isInteger(q.correct_answer)
      ? (q.correct_answer as number)
      : -1;

    out.push({
      id: out.length + 1,
      section,
      type: nonEmpty(q.type, 'multiple-choice'),
      passage: passageText(q.passage),
      question: q.question,
      options,
      correct_answer: answer >= 0 && answer < options.length ? answer : -1,
      explanation: typeof q.explanation === 'string' ? q.explanation : '',
    });
  }
  return out;
}

/** Exam format: each section with its question count and question types. */
export function buildFormat(questions: ExamQuestion[]): ExamSectionFormat[] {
  const sections = new Map<string, ExamSectionFormat>();
  for (const q of questions) {
    let entry = sections.get(q.section);
    if (!entry) {
      entry = { section: q.section, count: 0, types: [] };
      sections.set(q.section, entry);
    }
    entry.count++;
    if (!entry.types.includes(q.type)) entry.types.push(q.type);
  }
  return [...sections.values()];
}

/** Stored rows → questions in paper order (ids are the 1-based positions). */
function rowsToQuestions(rows: ExamQuestionRow[]): ExamQuestion[] {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((r) => ({
      id: r.position + 1,
      section: r.section,
      type: r.type,
      passage: r.passage,
      question: r.question,
      options: r.options,
      correct_answer: r.correct_answer,
      explanation: r.explanation,
    }));
}

/** Questions as sent to the student before submission: no correct answer, no explanation. */
export type ClientExamQuestion = Omit<
  ExamQuestion,
  'correct_answer' | 'explanation'
>;

export function toClientQuestions(
  questions: ExamQuestion[],
): ClientExamQuestion[] {
  return questions.map(
    ({ correct_answer: _answer, explanation: _explanation, ...rest }) => rest,
  );
}

export interface GeneratedExam {
  questions: ClientExamQuestion[];
  time_limit: number;
  exam_type: ExamType;
  variant: number;
  /** Id of the exam attempt — send it back on submit. */
  session_id: string;
  paper_id: number;
  theme: string;
}

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable()
export class EntranceExamService {
  private readonly logger = new Logger(EntranceExamService.name);

  constructor(
    @InjectRepository(ExamPaper) private papers: Repository<ExamPaper>,
    @InjectRepository(ExamAttempt) private attempts: Repository<ExamAttempt>,
  ) {}

  private get client() {
    return getAnthropicClient();
  }

  /**
   * Start an exam. The generated paper (and its questions) is saved in the DB, and a
   * new attempt is opened for the student. With `paper_id` a stored paper is re-sat.
   */
  async generateExam(
    dto: StartExamDto,
    userId: number,
  ): Promise<GeneratedExam> {
    const paper =
      dto.paper_id !== undefined
        ? await this.loadOwnPaper(dto.paper_id, userId)
        : await this.createPaper(dto, userId);

    const attempt = await this.attempts.save(
      this.attempts.create({
        paper_id: paper.id,
        user_id: userId,
        status: 'in_progress',
        answers: [],
      }),
    );

    // The answer key stays server-side until the exam is submitted.
    return {
      questions: toClientQuestions(rowsToQuestions(paper.questions ?? [])),
      time_limit: paper.time_limit,
      exam_type: 'ielts',
      variant: paper.variant,
      session_id: String(attempt.id),
      paper_id: paper.id,
      theme: paper.theme,
    };
  }

  /** A stored paper the student has sat before (re-takes only). */
  private async loadOwnPaper(
    paperId: number,
    userId: number,
  ): Promise<ExamPaper> {
    const sat = await this.attempts.findOne({
      where: { paper_id: paperId, user_id: userId },
    });
    const paper = sat
      ? await this.papers.findOne({
          where: { id: paperId },
          relations: { questions: true },
        })
      : null;
    if (!paper) throw new NotFoundException('Exam paper not found');
    return paper;
  }

  private async createPaper(
    dto: StartExamDto,
    userId: number,
  ): Promise<ExamPaper> {
    if (!this.client) {
      throw new ServiceUnavailableException(AI_NOT_CONFIGURED);
    }

    const variant =
      dto.variant !== undefined
        ? dto.variant % IELTS_THEMES.length
        : Math.floor(Math.random() * IELTS_THEMES.length);
    const theme = IELTS_THEMES[variant];

    let questions: ExamQuestion[];
    try {
      const res = await this.client.messages.create({
        model: AI_MODEL,
        max_tokens: EXAM_MAX_TOKENS,
        messages: [{ role: 'user', content: this.buildIeltsPrompt(theme) }],
      });
      questions = normalizeQuestions(tryParseJsonArray(messageText(res)));
      if (!questions.length) throw new Error('No usable questions returned');
    } catch (e) {
      this.logger.error('AI exam generation failed', e);
      throw new ServiceUnavailableException(
        'AI exam generation failed. Please try again.',
      );
    }

    return this.papers.save(
      this.papers.create({
        exam_type: 'ielts',
        theme,
        variant,
        time_limit: EXAM_TIME_LIMIT_MIN,
        format: buildFormat(questions),
        created_by: userId,
        questions: questions.map((q, position) => ({
          position,
          section: q.section,
          type: q.type,
          passage: q.passage ?? null,
          question: q.question,
          options: q.options,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
        })),
      }),
    );
  }

  /** Grade an attempt on the server and store the result in the DB. */
  async evaluateExam(dto: SubmitExamDto, userId: number): Promise<ExamResult> {
    const attempt = await this.attempts.findOne({
      where: { id: Number(dto.session_id), user_id: userId },
      relations: { paper: { questions: true } },
    });
    if (!attempt?.paper) throw new NotFoundException('Exam session not found');
    // Submitting twice (retry after a dropped response) returns the saved result.
    if (attempt.status === 'submitted' && attempt.result) return attempt.result;

    const questions = rowsToQuestions(attempt.paper.questions ?? []);
    const answerMap = new Map<number, number>();
    const writtenMap = new Map<number, string>();
    for (const a of dto.answers) {
      if (a.selected !== undefined) answerMap.set(a.question_id, a.selected);
      if (a.written?.trim()) writtenMap.set(a.question_id, a.written);
    }

    const breakdown: Record<string, { correct: number; total: number }> = {};
    const review: ExamReviewItem[] = [];
    const writing: ExamWritingResponse[] = [];
    let correct = 0;
    let scoredTotal = 0;

    for (const q of questions) {
      if (q.section === 'Writing') {
        const text = writtenMap.get(q.id);
        if (text) writing.push({ task: q.type, question: q.question, text });
        continue;
      }
      if (!breakdown[q.section]) {
        breakdown[q.section] = { correct: 0, total: 0 };
      }
      breakdown[q.section].total++;
      scoredTotal++;
      const selected = answerMap.get(q.id);
      if (
        selected !== undefined &&
        q.correct_answer >= 0 &&
        selected === q.correct_answer
      ) {
        correct++;
        breakdown[q.section].correct++;
      }
      review.push({
        question_id: q.id,
        section: q.section,
        question: q.question,
        options: q.options,
        selected: selected ?? null,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
      });
    }

    const pct = scoredTotal > 0 ? Math.round((correct / scoredTotal) * 100) : 0;
    const est = estimateIelts(pct);
    const weak_areas = Object.entries(breakdown)
      .filter(([, v]) => v.total > 0 && v.correct / v.total < 0.6)
      .map(([k]) => k);

    const recommendations = await this.generateRecommendations(
      pct,
      correct,
      scoredTotal,
      est.band,
      est.level,
      weak_areas,
    );

    const result: ExamResult = {
      total: scoredTotal,
      correct,
      score_percent: pct,
      estimated_band: est.band,
      estimated_score: `${pct}%`,
      level: est.level,
      breakdown: Object.entries(breakdown).map(([section, v]) => ({
        section,
        ...v,
      })),
      recommendations,
      weak_areas,
      // Answer key is revealed only after submission.
      review,
      writing_responses: writing,
    };

    attempt.status = 'submitted';
    attempt.answers = dto.answers;
    attempt.result = result;
    attempt.score_percent = pct;
    attempt.estimated_band = est.band;
    attempt.submitted_at = new Date();
    await this.attempts.save(attempt);
    return result;
  }

  /** The student's most recent submitted sittings, newest first. */
  async getHistory(userId: number): Promise<ExamHistoryItem[]> {
    const rows = await this.attempts.find({
      where: { user_id: userId, status: 'submitted' },
      relations: { paper: true },
      order: { submitted_at: 'DESC' },
      take: HISTORY_LIMIT,
    });
    return rows.map((a) => ({
      attempt_id: a.id,
      paper_id: a.paper_id,
      theme: a.paper?.theme ?? '',
      score_percent: a.score_percent,
      estimated_band: a.estimated_band,
      level: a.result?.level ?? null,
      correct: a.result?.correct ?? null,
      total: a.result?.total ?? null,
      submitted_at: a.submitted_at,
    }));
  }

  /** The stored result of one of the student's submitted sittings. */
  async getAttemptResult(
    attemptId: number,
    userId: number,
  ): Promise<ExamResult> {
    const attempt = await this.attempts.findOne({
      where: { id: attemptId, user_id: userId, status: 'submitted' },
    });
    if (!attempt?.result) throw new NotFoundException('Exam result not found');
    return attempt.result;
  }

  private async generateRecommendations(
    pct: number,
    correct: number,
    total: number,
    band: string,
    level: string,
    weakSections: string[],
  ): Promise<string[]> {
    if (!this.client) {
      return [
        `Bạn đạt ${pct}% (${correct}/${total} câu đúng) — tương đương ${band}.`,
        pct >= 70
          ? 'Kết quả tốt! Tiếp tục luyện tập để cải thiện IELTS.'
          : `Hãy ôn luyện thêm — đặc biệt các phần: ${weakSections.join(', ') || 'tất cả kỹ năng'}.`,
        'Dùng tính năng AI Schedule để lên lịch học cá nhân hóa.',
      ];
    }
    const prompt = `You are an expert IELTS Academic coach. A student just completed a mini practice exam.

Results:
- Score: ${pct}% (${correct}/${total} correct)
- Estimated band/score: ${band}
- CEFR Level: ${level}
- Weak sections: ${weakSections.length > 0 ? weakSections.join(', ') : 'none identified'}

Give exactly 4 concise, actionable study recommendations in Vietnamese. Each 1–2 sentences.
Return ONLY a JSON array of strings, no markdown:
["recommendation 1", "recommendation 2", "recommendation 3", "recommendation 4"]`;

    try {
      const res = await this.client.messages.create({
        model: AI_MODEL,
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      });
      const json = messageText(res)
        .trim()
        .replace(/```json\n?|```/g, '')
        .trim();
      const match = json.match(/\[[\s\S]*\]/);
      const parsed: unknown = match ? JSON.parse(match[0]) : [];
      return Array.isArray(parsed)
        ? parsed.filter((r): r is string => typeof r === 'string')
        : [];
    } catch (e) {
      this.logger.error('AI recommendations failed', e);
      return [];
    }
  }

  // ── IELTS prompt ─────────────────────────────────────────────────────────────

  private buildIeltsPrompt(theme: string): string {
    return `You are an official IELTS exam designer. Generate exactly 20 IELTS Academic mini-test questions.

EXAM THEME: ${theme}
All content must authentically relate to this theme.

SECTION DISTRIBUTION:
- Listening Part 1: ids 1–4   (social context dialogue)
- Listening Part 2: ids 5–7   (public monologue / announcement)
- Reading:          ids 8–18  (academic passage — 11 questions)
- Writing:          ids 19–20 (2 free-response tasks)

═══ LISTENING PART 1 (Q1–4) ═══════════════════
Write ONE dialogue transcript (100–120 words) between two people in a social/everyday context within the theme. British English. Set "passage" on Q1 ONLY. Q2–Q4: passage = null.
Question types (mix): Note Completion, Multiple Choice, True/False/Not Given.
Questions test specific details: names, numbers, times, locations.

═══ LISTENING PART 2 (Q5–7) ═══════════════════
Write ONE monologue (80–100 words): a public announcement or broadcast within the theme. DIFFERENT topic from Part 1. Set "passage" on Q5. Q6–Q7: passage = null.
Question types: MCQ (4 options) testing main idea, specific detail, or purpose.

═══ READING (Q8–18) ════════════════════════════
Write ONE academic passage (280–320 words) on a scientific or social topic within the theme. Set "passage" on Q8. Q9–Q18: passage = null.
Q8–Q12: Note/Summary Completion — 4 plausible options, ONE is an exact word from the passage.
Q13–Q18: True / False / Not Given — exactly 3 options: ["A. True", "B. False", "C. Not Given"]

═══ WRITING (Q19–20) ══════════════════════════
Q19: Writing Task 1 — passage MUST be a chart data OBJECT (not a string, not text):
{"type":"bar-grouped","title":"<descriptive title showing comparison>","yLabel":"<measurement unit>","yMax":<ceiling rounded to nearest 25>,"categories":["<A>","<B>","<C>","<D>","<E>"],"series":[{"name":"<legend 1>","color":"#6366f1","values":[<n>,<n>,<n>,<n>,<n>]},{"name":"<legend 2>","color":"#8b5cf6","values":[<n>,<n>,<n>,<n>,<n>]}],"note":"Source: <plausible source>, <year>"}
Use 5 categories, 2 series, realistic numbers related to the theme. yMax just above the highest value.
question = "Writing Task 1 (minimum 150 words): The bar chart shows <brief topic>. Summarise the information by selecting and reporting the main features, and make comparisons where relevant."
options = []. correct_answer = -1. explanation = "".

Q20: Writing Task 2 — passage = null. question = "Writing Task 2 (minimum 250 words): <Opinion or discussion essay prompt related to the theme>." options = []. correct_answer = -1. explanation = "".

═══ OUTPUT FORMAT ══════════════════════════════
Return ONLY a valid JSON array, no markdown:
[
  {
    "id": 1,
    "section": "Listening Part 1",
    "type": "note-completion",
    "passage": "transcript text OR chart object OR null",
    "question": "question text",
    "options": ["A. option","B. option","C. option","D. option"],
    "correct_answer": 0,
    "explanation": "brief explanation"
  }
]

RULES:
- Section names MUST be exactly: "Listening Part 1", "Listening Part 2", "Reading", "Writing"
- Q19 type = "writing-task1", Q20 type = "writing-task2"
- T/F/NG questions: options = ["A. True","B. False","C. Not Given"] (exactly 3)
- Writing tasks: options = [], correct_answer = -1, explanation = ""
- All other questions: exactly 4 options
- Q19 passage = chart JSON OBJECT (nested, not a string)
- IELTS difficulty B1–C1`;
  }
}
