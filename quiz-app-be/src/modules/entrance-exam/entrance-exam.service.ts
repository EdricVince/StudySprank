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
  ExamSkillScore,
  ExamType,
  ExamWritingFeedback,
  ExamWritingResponse,
  StartExamDto,
  SubmitExamDto,
} from './dto/exam.dto';
import {
  EXAM_TIME_LIMIT_MIN,
  LISTENING_PARTS,
  PartBlueprint,
  READING_PASSAGES,
  SKILL_MINUTES,
  WRITING_SECTION,
  WRITING_TASK1,
  bandFromRaw,
  isTextAnswerCorrect,
  levelOfBand,
  overallBand,
  roundHalf,
  writingBand,
} from './ielts-format';
import {
  CHART_TYPES,
  extractJsonObject,
  normalizeMarking,
  normalizePart,
  normalizeWritingTasks,
  writingQuestions,
} from './ielts-parse';
import {
  ExamLanguage,
  LISTENING_SCENARIOS,
  fallbackRecommendations,
  partPrompt,
  recommendationsPrompt,
  writingMarkingPrompt,
  writingPrompt,
} from './ielts-prompts';
import { skillOf } from './skill-of';

/** Token budget for one Listening part / Reading passage (script + questions). */
const PART_MAX_TOKENS = 7000;
/** Token budget for the Writing tasks (chart data + essay topic). */
const WRITING_MAX_TOKENS = 2500;
/** Token budget for marking the Writing answers. */
const MARKING_MAX_TOKENS = 3500;
/** How many parts are written by the AI at the same time. */
const GENERATION_CONCURRENCY = 4;
/** Tries per part before the whole exam is given up. */
const PART_ATTEMPTS = 2;
/** How many past sittings the history list returns. */
const HISTORY_LIMIT = 20;
/** A Writing answer shorter than this is not sent to the examiner: it has no assessable language. */
const MIN_ASSESSABLE_WORDS = 20;

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

/** Steps between the themes of the parts of one paper (coprime with 18, so they never repeat). */
const THEME_STRIDE = 5;

const themeName = (theme: string) => theme.split(' — ')[0];

/** Run `fn` over `items` with at most `limit` calls in flight, keeping the order of the results. */
export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
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
      instruction: r.instruction ?? undefined,
      question: r.question,
      options: r.options,
      correct_answer: r.correct_answer,
      accepted_answers: r.accepted_answers ?? [],
      explanation: r.explanation,
    }));
}

/** Questions as sent to the student before submission: no answer key, no explanation. */
export type ClientExamQuestion = Omit<
  ExamQuestion,
  'correct_answer' | 'explanation' | 'accepted_answers'
>;

export function toClientQuestions(
  questions: ExamQuestion[],
): ClientExamQuestion[] {
  return questions.map(
    ({
      correct_answer: _answer,
      explanation: _explanation,
      accepted_answers: _accepted,
      ...rest
    }) => rest,
  );
}

/** Typed-answer questions have no options (the screen shows a text box for them). */
const isTyped = (q: ExamQuestion) => q.options.length === 0;

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

export interface GeneratedExam {
  questions: ClientExamQuestion[];
  /** Total minutes (Listening + Reading + Writing). */
  time_limit: number;
  skill_minutes: typeof SKILL_MINUTES;
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
      skill_minutes: SKILL_MINUTES,
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

  /** One call to the model that must return a JSON object; `parse` turns it into the result. */
  private async askForObject<T>(
    prompt: string,
    maxTokens: number,
    parse: (raw: Record<string, unknown>) => T,
  ): Promise<T> {
    const client = this.client;
    if (!client) throw new ServiceUnavailableException(AI_NOT_CONFIGURED);
    let lastError: unknown;
    for (let attempt = 1; attempt <= PART_ATTEMPTS; attempt++) {
      try {
        const res = await client.messages.create({
          model: AI_MODEL,
          max_tokens: maxTokens,
          messages: [{ role: 'user', content: prompt }],
        });
        return parse(extractJsonObject(messageText(res)));
      } catch (e) {
        lastError = e;
        this.logger.warn(
          `AI exam call failed (try ${attempt}/${PART_ATTEMPTS}): ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }
    throw lastError;
  }

  /**
   * The whole paper: every Listening part and Reading passage and the two Writing tasks are
   * written by the AI (one call each, a few at a time) and checked against the IELTS blueprint.
   * If any part cannot be filled the exam is not created (a half exam is never stored).
   */
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
    // Distinct themes for the academic parts: Listening 3, Listening 4, Reading 1–3, Writing 1–2.
    const themeAt = (slot: number) =>
      IELTS_THEMES[(variant + slot * THEME_STRIDE) % IELTS_THEMES.length];
    const scenarioAt = (slot: number) =>
      LISTENING_SCENARIOS[(variant + slot) % LISTENING_SCENARIOS.length];

    const topicOf = (part: PartBlueprint): string => {
      switch (part.section) {
        case 'Listening Part 1':
          return scenarioAt(0);
        case 'Listening Part 2':
          return scenarioAt(3);
        case 'Listening Part 3':
          return `an academic assignment connected with: ${themeAt(0)}`;
        case 'Listening Part 4':
          return themeAt(1);
        case 'Reading Passage 1':
          return themeAt(2);
        case 'Reading Passage 2':
          return themeAt(3);
        default:
          return themeAt(4);
      }
    };
    const chartType = CHART_TYPES[variant % CHART_TYPES.length];

    let parts: ExamQuestion[][];
    let writing: ExamQuestion[];
    try {
      const blueprints = [...LISTENING_PARTS, ...READING_PASSAGES];
      const jobs: (() => Promise<ExamQuestion[]>)[] = [
        ...blueprints.map(
          (part) => () =>
            this.askForObject(
              partPrompt(part, topicOf(part)),
              PART_MAX_TOKENS,
              (raw) => normalizePart(raw, part),
            ),
        ),
        () =>
          this.askForObject(
            writingPrompt(chartType, themeAt(5), themeAt(6)),
            WRITING_MAX_TOKENS,
            (raw) => writingQuestions(normalizeWritingTasks(raw), 0),
          ),
      ];
      const done = await mapLimit(jobs, GENERATION_CONCURRENCY, (job) => job());
      writing = done.pop() as ExamQuestion[];
      parts = done;
    } catch (e) {
      this.logger.error('AI exam generation failed', e);
      throw new ServiceUnavailableException(
        'AI exam generation failed. Please try again.',
      );
    }

    // One flat list in the order of the paper; ids are the 1-based positions.
    const questions = [...parts.flat(), ...writing].map((q, i) => ({
      ...q,
      id: i + 1,
    }));
    const theme = [themeAt(2), themeAt(3), themeAt(4)]
      .map(themeName)
      .join(' · ');

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
          instruction: q.instruction ?? null,
          question: q.question,
          options: q.options,
          correct_answer: q.correct_answer,
          accepted_answers: q.accepted_answers ?? [],
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

    const language: ExamLanguage = dto.language ?? 'en';
    const questions = rowsToQuestions(attempt.paper.questions ?? []);
    const selectedMap = new Map<number, number>();
    const writtenMap = new Map<number, string>();
    for (const a of dto.answers) {
      if (a.selected !== undefined) selectedMap.set(a.question_id, a.selected);
      if (a.written?.trim()) writtenMap.set(a.question_id, a.written);
    }

    const breakdown = new Map<string, { correct: number; total: number }>();
    const perSkill: Record<
      'Listening' | 'Reading',
      { correct: number; total: number }
    > = {
      Listening: { correct: 0, total: 0 },
      Reading: { correct: 0, total: 0 },
    };
    const review: ExamReviewItem[] = [];
    const writingAnswers: (ExamWritingResponse & { words: number })[] = [];
    let correct = 0;
    let scoredTotal = 0;

    for (const q of questions) {
      if (q.section === WRITING_SECTION) {
        const text = writtenMap.get(q.id);
        if (text) {
          writingAnswers.push({
            task: q.type,
            question: q.question,
            text,
            words: wordCount(text),
          });
        }
        continue;
      }
      const typed = isTyped(q);
      const selected = selectedMap.get(q.id);
      const written = writtenMap.get(q.id);
      const isCorrect = typed
        ? isTextAnswerCorrect(written, q.accepted_answers)
        : selected !== undefined &&
          q.correct_answer >= 0 &&
          selected === q.correct_answer;

      const section = breakdown.get(q.section) ?? { correct: 0, total: 0 };
      section.total++;
      if (isCorrect) section.correct++;
      breakdown.set(q.section, section);
      const skill = skillOf(q.section);
      if (skill === 'Listening' || skill === 'Reading') {
        perSkill[skill].total++;
        if (isCorrect) perSkill[skill].correct++;
      }
      scoredTotal++;
      if (isCorrect) correct++;

      review.push({
        question_id: q.id,
        section: q.section,
        type: q.type,
        question: q.question,
        options: q.options,
        selected: typed ? null : (selected ?? null),
        written: typed ? (written?.trim() ?? null) : null,
        is_correct: isCorrect,
        correct_answer: q.correct_answer,
        accepted_answers: q.accepted_answers ?? [],
        explanation: q.explanation ?? '',
      });
    }

    const writing_feedback = await this.markWriting(writingAnswers, language);
    const task = (name: string) =>
      writing_feedback.find((f) => f.task === name)?.band ?? null;
    const writing_band = writingBand({
      task1: task(WRITING_TASK1),
      task2: task('writing-task2'),
    });

    const skills: ExamSkillScore[] = (['Listening', 'Reading'] as const)
      .filter((s) => perSkill[s].total > 0)
      .map((s) => ({
        skill: s,
        correct: perSkill[s].correct,
        total: perSkill[s].total,
        band: bandFromRaw(s, perSkill[s].correct, perSkill[s].total),
      }));
    if (writingAnswers.length > 0) {
      skills.push({
        skill: 'Writing',
        correct: null,
        total: null,
        band: writing_band,
      });
    }
    const overall = overallBand(skills.map((s) => s.band)) ?? 0;
    const level = levelOfBand(overall);

    const pct = scoredTotal > 0 ? Math.round((correct / scoredTotal) * 100) : 0;
    const weak_areas = [...breakdown.entries()]
      .filter(([, v]) => v.total > 0 && v.correct / v.total < 0.6)
      .map(([k]) => k);
    const recommendations = await this.generateRecommendations(
      overall,
      level,
      skills.map((s) => ({ skill: s.skill, band: s.band })),
      weak_areas,
      language,
    );

    const result: ExamResult = {
      total: scoredTotal,
      correct,
      score_percent: pct,
      estimated_band: overall.toFixed(1),
      estimated_score: `${pct}%`,
      level,
      overall_band: overall,
      skills,
      breakdown: [...breakdown.entries()].map(([section, v]) => ({
        section,
        ...v,
      })),
      recommendations,
      weak_areas,
      // Answer key is revealed only after submission.
      review,
      writing_responses: writingAnswers.map(({ words: _w, ...r }) => r),
      writing_feedback,
    };

    attempt.status = 'submitted';
    attempt.answers = dto.answers;
    attempt.result = result;
    attempt.score_percent = pct;
    attempt.estimated_band = result.estimated_band;
    attempt.overall_band = overall;
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
      overall_band: a.overall_band ?? null,
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

  /**
   * Mark the Writing answers like an examiner. An answer with almost no text is band 1 without
   * asking the AI; if the AI cannot mark the rest the Writing band stays empty (it is never guessed).
   */
  private async markWriting(
    answers: (ExamWritingResponse & { words: number })[],
    language: ExamLanguage,
  ): Promise<ExamWritingFeedback[]> {
    if (!answers.length) return [];
    const empty = (a: {
      task: string;
      words: number;
    }): ExamWritingFeedback => ({
      task: a.task,
      band: 1,
      words: a.words,
      criteria: [],
      strengths: [],
      improvements: [],
    });
    const short = answers.filter((a) => a.words < MIN_ASSESSABLE_WORDS);
    const real = answers.filter((a) => a.words >= MIN_ASSESSABLE_WORDS);
    let marked: ExamWritingFeedback[] = [];
    if (real.length && this.client) {
      try {
        marked = await this.askForObject(
          writingMarkingPrompt(real, language),
          MARKING_MAX_TOKENS,
          (raw) => normalizeMarking(raw, real),
        );
      } catch (e) {
        this.logger.error('AI writing marking failed', e);
      }
    }
    return [...short.map(empty), ...marked].sort(
      (a, b) =>
        answers.findIndex((x) => x.task === a.task) -
        answers.findIndex((x) => x.task === b.task),
    );
  }

  private async generateRecommendations(
    overall: number,
    level: string,
    skills: { skill: string; band: number | null }[],
    weak: string[],
    language: ExamLanguage,
  ): Promise<string[]> {
    const fallback = fallbackRecommendations(
      language,
      roundHalf(overall),
      weak,
    );
    const client = this.client;
    if (!client) return fallback;
    try {
      const res = await client.messages.create({
        model: AI_MODEL,
        max_tokens: 800,
        messages: [
          {
            role: 'user',
            content: recommendationsPrompt({
              overall,
              level,
              skills,
              weak,
              language,
            }),
          },
        ],
      });
      const json = messageText(res)
        .trim()
        .replace(/```json\n?|```/g, '')
        .trim();
      const match = json.match(/\[[\s\S]*\]/);
      const parsed: unknown = match ? JSON.parse(match[0]) : [];
      const list = Array.isArray(parsed)
        ? parsed.filter((r): r is string => typeof r === 'string' && !!r.trim())
        : [];
      return list.length ? list.slice(0, 5) : fallback;
    } catch (e) {
      this.logger.error('AI recommendations failed', e);
      return fallback;
    }
  }
}
