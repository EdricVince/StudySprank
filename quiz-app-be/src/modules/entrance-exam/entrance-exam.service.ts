import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  AI_MODEL,
  AI_NOT_CONFIGURED,
  getAnthropicClient,
} from '../../core/ai/anthropic';
import type {
  ExamQuestion,
  ExamResult,
  ExamType,
  StartExamDto,
  SubmitExamDto,
} from './dto/exam.dto';

// 18 diverse themes per exam type to maximise variety across sessions
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

const TOEFL_THEMES = [
  'Biology & Evolution — natural selection, adaptation, speciation, fossil records',
  'Geology & Earth Sciences — plate tectonics, volcanoes, earthquakes, mineralogy',
  'Anthropology & Archaeology — ancient civilisations, human migration, cultural artefacts',
  'Architecture & Art History — ancient monuments, artistic movements, urban design traditions',
  'Environmental Science & Conservation — deforestation, ecosystem services, biodiversity loss',
  'Modern History & Society — social movements, political revolutions, industrial change',
  'Cognitive Science & Memory — working memory, learning theories, attention, neuroplasticity',
  'Ecology — Forest & Wetland Ecosystems — nutrient cycles, trophic levels, keystone species',
  'Astrophysics & Planetary Science — star formation, exoplanets, black holes, dark matter',
  'Behavioural Economics — decision biases, nudge theory, consumer choice, market anomalies',
  'Neuroscience & Brain Research — synaptic plasticity, brain mapping, neurodegenerative diseases',
  'Chemistry & Materials Science — polymers, nanotechnology, catalysis, sustainable materials',
  'Political Science & Governance — democracy, electoral systems, international relations',
  'Oceanography & Marine Science — ocean currents, salinity, deep-sea ecology, climate regulation',
  'Physics — Energy & Forces — thermodynamics, electromagnetic fields, quantum basics',
  'Literature & Narrative — narrative structure, symbolism, genre conventions, authorial intent',
  'Public Health & Epidemiology — disease outbreaks, vaccination, health policy, global pandemics',
  'Engineering & Sustainable Infrastructure — bridge design, water systems, renewable construction',
];

const TOEIC_THEMES = [
  'Hotel & Hospitality Management — reservations, events, guest services, catering workflows',
  'Technology & IT Services — software projects, cloud systems, help desk, product launches',
  'Healthcare Administration — medical offices, pharmacies, health insurance, patient scheduling',
  'Retail & Consumer Services — sales targets, customer complaints, store operations, inventory',
  'Finance & Banking Operations — accounts, investments, transactions, quarterly reporting',
  'Manufacturing & Supply Chain — production planning, logistics, quality control, vendors',
  'Travel & Transportation — airline operations, car rentals, corporate travel policies, delays',
  'Marketing & Advertising — campaigns, brand strategy, market research, digital ads',
  'Human Resources & Recruitment — job postings, interviews, onboarding, performance reviews',
  'Real Estate & Property Management — leasing, maintenance, commercial properties, contracts',
  'Food & Restaurant Industry — catering orders, kitchen operations, supplier negotiations',
  'Legal & Compliance Services — contracts, regulatory filings, workplace safety, audits',
  'Environmental Management & CSR — sustainability reports, waste reduction, green certifications',
  'Insurance & Risk Management — claims, policy renewals, corporate liability, risk assessment',
  'Education & Training Services — corporate workshops, e-learning platforms, course enrolments',
  'Media & Publishing — editorial deadlines, print runs, digital content, advertising revenue',
  'Construction & Project Management — timelines, contractors, permits, budget tracking',
  'Import & Export Operations — customs clearance, freight forwarding, trade compliance',
];

// ── Scoring helpers ────────────────────────────────────────────────────────────

function estimateIelts(pct: number): { band: string; level: string } {
  if (pct >= 90) return { band: '8.0–9.0', level: 'C2 — Expert' };
  if (pct >= 80) return { band: '7.0–7.5', level: 'C1 — Advanced' };
  if (pct >= 68) return { band: '6.0–6.5', level: 'B2 — Upper-Intermediate' };
  if (pct >= 55) return { band: '5.0–5.5', level: 'B1 — Intermediate' };
  if (pct >= 42) return { band: '4.0–4.5', level: 'A2 — Elementary' };
  if (pct >= 28) return { band: '3.0–3.5', level: 'A2 — Beginner' };
  return { band: '1.0–2.5', level: 'A1 — Starter' };
}

function estimateToefl(pct: number): { band: string; level: string } {
  const score = Math.round((pct / 100) * 120);
  if (score >= 100) return { band: `${score}/120`, level: 'C2 — Expert' };
  if (score >= 80) return { band: `${score}/120`, level: 'C1 — Advanced' };
  if (score >= 60)
    return { band: `${score}/120`, level: 'B2 — Upper-Intermediate' };
  if (score >= 42) return { band: `${score}/120`, level: 'B1 — Intermediate' };
  if (score >= 24) return { band: `${score}/120`, level: 'A2 — Elementary' };
  return { band: `${score}/120`, level: 'A1 — Beginner' };
}

function estimateToeic(pct: number): { band: string; level: string } {
  const score = Math.round((pct / 100) * 990);
  if (score >= 860) return { band: `${score}/990`, level: 'C1 — Advanced' };
  if (score >= 730)
    return { band: `${score}/990`, level: 'B2 — Upper-Intermediate' };
  if (score >= 550) return { band: `${score}/990`, level: 'B1 — Intermediate' };
  if (score >= 350) return { band: `${score}/990`, level: 'A2 — Elementary' };
  return { band: `${score}/990`, level: 'A1 — Beginner' };
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

// ── Service ────────────────────────────────────────────────────────────────────

@Injectable()
export class EntranceExamService {
  private readonly logger = new Logger(EntranceExamService.name);
  private readonly sessionCache = new Map<string, ExamQuestion[]>();

  constructor() {}

  private get client() {
    return getAnthropicClient();
  }

  private newSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  async generateExam(dto: StartExamDto): Promise<{
    questions: ClientExamQuestion[];
    time_limit: number;
    exam_type: ExamType;
    variant: number;
    session_id: string;
  }> {
    if (!this.client) {
      throw new ServiceUnavailableException(AI_NOT_CONFIGURED);
    }

    const themes =
      dto.exam_type === 'ielts'
        ? IELTS_THEMES
        : dto.exam_type === 'toefl'
          ? TOEFL_THEMES
          : TOEIC_THEMES;
    const variant =
      dto.variant !== undefined
        ? dto.variant % themes.length
        : Math.floor(Math.random() * themes.length);
    const theme = themes[variant];
    const timeLimit = dto.exam_type === 'toefl' ? 35 : 25;

    // Token budget per exam type (shorter passages → fewer tokens → faster + more reliable)
    const maxTokens =
      dto.exam_type === 'toefl'
        ? 5500
        : dto.exam_type === 'ielts'
          ? 4800
          : 4000;

    const prompt =
      dto.exam_type === 'ielts'
        ? this.buildIeltsPrompt(theme)
        : dto.exam_type === 'toefl'
          ? this.buildToeflPrompt(theme)
          : this.buildToeicPrompt(theme);

    // Shape as produced by the model (passage may come back as a nested object).
    let questions: Array<Omit<ExamQuestion, 'passage'> & { passage?: unknown }>;
    try {
      const res = await this.client.messages.create({
        model: AI_MODEL,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      });
      const raw = (res.content[0] as { text: string }).text.trim();
      questions = tryParseJsonArray(raw) as typeof questions;
    } catch (e) {
      this.logger.error('AI exam generation failed', e);
      throw new ServiceUnavailableException(
        'AI exam generation failed. Please try again.',
      );
    }

    // Post-process: Writing Task 1 passage may be a nested chart object — stringify it
    for (const q of questions) {
      if (q.passage && typeof q.passage === 'object') {
        q.passage = JSON.stringify(q.passage);
      }
    }

    const session_id = this.newSessionId();
    this.sessionCache.set(session_id, questions as ExamQuestion[]);
    // unref: the expiry timer must not keep the process (or a test run) alive
    setTimeout(
      () => this.sessionCache.delete(session_id),
      2 * 60 * 60 * 1000,
    ).unref?.();

    // The answer key stays server-side (session cache) until the exam is submitted.
    return {
      questions: toClientQuestions(questions as ExamQuestion[]),
      time_limit: timeLimit,
      exam_type: dto.exam_type,
      variant,
      session_id,
    };
  }

  async evaluateExam(dto: SubmitExamDto): Promise<ExamResult> {
    const questions = this.sessionCache.get(dto.session_id);
    if (!questions) {
      return {
        total: 0,
        correct: 0,
        score_percent: 0,
        estimated_band: 'N/A',
        estimated_score: 'N/A',
        level: 'Session expired',
        breakdown: [],
        recommendations: ['Please start a new exam session.'],
        weak_areas: [],
      };
    }
    this.sessionCache.delete(dto.session_id);

    const { answers, exam_type } = dto;
    const answerMap = new Map(answers.map((a) => [a.question_id, a.selected]));
    const breakdown: Record<string, { correct: number; total: number }> = {};
    let correct = 0;
    let scoredTotal = 0;

    for (const q of questions) {
      if (q.section === 'Writing') continue;
      if (!breakdown[q.section])
        breakdown[q.section] = { correct: 0, total: 0 };
      breakdown[q.section].total++;
      scoredTotal++;
      const selected = answerMap.get(q.id);
      if (selected !== undefined && selected === q.correct_answer) {
        correct++;
        breakdown[q.section].correct++;
      }
    }

    const pct = scoredTotal > 0 ? Math.round((correct / scoredTotal) * 100) : 0;
    const est =
      exam_type === 'ielts'
        ? estimateIelts(pct)
        : exam_type === 'toefl'
          ? estimateToefl(pct)
          : estimateToeic(pct);
    const weak_areas = Object.entries(breakdown)
      .filter(([, v]) => v.total > 0 && v.correct / v.total < 0.6)
      .map(([k]) => k);

    const recommendations = await this.generateRecommendations(
      exam_type,
      pct,
      correct,
      scoredTotal,
      est.band,
      est.level,
      weak_areas,
    );

    return {
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
      review: questions
        .filter((q) => q.section !== 'Writing')
        .map((q) => ({
          question_id: q.id,
          correct_answer: q.correct_answer,
          explanation: q.explanation,
        })),
    };
  }

  private async generateRecommendations(
    examType: ExamType,
    pct: number,
    correct: number,
    total: number,
    band: string,
    level: string,
    weakSections: string[],
  ): Promise<string[]> {
    if (!this.client) {
      const examName =
        examType === 'ielts'
          ? 'IELTS'
          : examType === 'toefl'
            ? 'TOEFL'
            : 'TOEIC';
      return [
        `Bạn đạt ${pct}% (${correct}/${total} câu đúng) — tương đương ${band}.`,
        pct >= 70
          ? `Kết quả tốt! Tiếp tục luyện tập để cải thiện ${examName}.`
          : `Hãy ôn luyện thêm — đặc biệt các phần: ${weakSections.join(', ') || 'tất cả kỹ năng'}.`,
        'Dùng tính năng AI Schedule để lên lịch học cá nhân hóa.',
      ];
    }
    const examName =
      examType === 'ielts'
        ? 'IELTS Academic'
        : examType === 'toefl'
          ? 'TOEFL iBT'
          : 'TOEIC';
    const prompt = `You are an expert ${examName} coach. A student just completed a mini practice exam.

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
      const text = (res.content[0] as { text: string }).text.trim();
      const json = text.replace(/```json\n?|```/g, '').trim();
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

  // ── TOEIC prompt ─────────────────────────────────────────────────────────────

  private buildToeicPrompt(theme: string): string {
    return `You are an official TOEIC exam designer. Generate exactly 20 TOEIC mini-test questions following the real ETS TOEIC format.

EXAM THEME: ${theme}
All content must authentically relate to this business/workplace theme.

SECTION DISTRIBUTION:
- Listening Part 1: ids 1–2   (Photographs)
- Listening Part 2: ids 3–5   (Question-Response)
- Listening Part 3: ids 6–8   (Short Conversations — 1 dialogue × 3 q)
- Listening Part 4: ids 9–10  (Short Talks — 1 monologue × 2 q)
- Reading Part 5:   ids 11–15 (Incomplete Sentences)
- Reading Part 6:   ids 16–18 (Text Completion — 1 passage × 3 blanks)
- Reading Part 7:   ids 19–20 (Reading Comprehension — 1 article × 2 q)

═══ LISTENING PART 1 — Photographs (Q1–2) ══════
Describe a realistic workplace scene in 25–35 words as "passage". 4 options: one correct, three wrong.

═══ LISTENING PART 2 — Question-Response (Q3–5) ═
"passage" = the short question heard (10–20 words). EXACTLY 3 options: A, B, C. One correct.

═══ LISTENING PART 3 — Conversations (Q6–8) ═════
ONE business dialogue (70–90 words). Set "passage" on Q6. Q7–Q8: passage = null.
3 questions: main purpose, specific detail, speaker's next action. 4 options each.

═══ LISTENING PART 4 — Short Talks (Q9–10) ══════
ONE monologue announcement/voicemail (60–80 words). Set "passage" on Q9. Q10: passage = null.
2 questions: main topic, specific detail. 4 options each.

═══ READING PART 5 — Incomplete Sentences (Q11–15)
5 independent business sentences with one blank. passage = null.
Cover: verb form, preposition, conjunction, word form, article. 4 options each.

═══ READING PART 6 — Text Completion (Q16–18) ═══
ONE business email/memo (150–180 words) with exactly 3 blanks [BLANK_1] [BLANK_2] [BLANK_3]. Set "passage" on Q16. Q17–Q18: passage = null. 4 options each.

═══ READING PART 7 — Comprehension (Q19–20) ══════
ONE business article/notice (150–180 words). Set "passage" on Q19. Q20: passage = null.
Q19: main idea. Q20: specific detail. 4 options each.

═══ OUTPUT FORMAT ═══════════════════════════════
Return ONLY a valid JSON array, no markdown:
[{"id":1,"section":"Listening Part 1","type":"photograph","passage":"...","question":"...","options":["A.","B.","C.","D."],"correct_answer":0,"explanation":"..."}]

CRITICAL:
- Section names: "Listening Part 1","Listening Part 2","Listening Part 3","Listening Part 4","Reading Part 5","Reading Part 6","Reading Part 7"
- Listening Part 2: EXACTLY 3 options (A,B,C)
- All others: exactly 4 options
- passage = null for questions not carrying a passage`;
  }

  // ── TOEFL prompt ─────────────────────────────────────────────────────────────

  private buildToeflPrompt(theme: string): string {
    return `You are an official TOEFL iBT exam designer. Generate exactly 20 TOEFL iBT mini-test questions.

EXAM THEME: ${theme}
All content must authentically relate to this academic theme.

SECTION DISTRIBUTION:
- Reading Passage 1:        ids 1–5   (5 MCQ)
- Reading Passage 2:        ids 6–10  (5 MCQ)
- Listening — Lecture:      ids 11–14 (4 MCQ)
- Listening — Discussion:   ids 15–18 (4 MCQ)
- Writing:                  ids 19–20 (2 free-response tasks)

═══ READING PASSAGE 1 (Q1–5) ════════════════════
Write ONE academic passage (240–270 words) on a topic within the theme. Set "passage" on Q1. Q2–Q5: passage = null.
Question types: main idea, vocabulary in context, factual detail, inference, purpose. 4 options (A–D). B2–C1 difficulty.

═══ READING PASSAGE 2 (Q6–10) ═══════════════════
Write a DIFFERENT academic passage (240–270 words) on another aspect of the theme. Set "passage" on Q6. Q7–Q10: passage = null.
Same question type mix. 4 options (A–D).

═══ LISTENING — LECTURE (Q11–14) ═════════════════
Write a professor's lecture transcript (140–170 words) within the theme. Set "passage" on Q11. Q12–Q14: passage = null.
Questions: main idea, specific detail, speaker's attitude, inferred meaning. 4 options each.

═══ LISTENING — DISCUSSION (Q15–18) ══════════════
Write a classroom discussion (110–140 words) between professor and 2 students within the theme. Set "passage" on Q15. Q16–Q18: passage = null.
Questions: student's opinion, professor's point, implied meaning, purpose. 4 options each.

═══ WRITING (Q19–20) — FREE RESPONSE ═════════════
Q19: Integrated Writing — passage = a 50-word reading passage about a claim related to the theme.
question = "Integrated Writing Task (minimum 150 words): Summarize the points made in the lecture and explain how they relate to the reading passage."
options = []. correct_answer = -1. explanation = "".

Q20: Academic Discussion — passage = null.
question = "Academic Discussion Task (minimum 100 words): Professor: <discussion question about the theme>\n\nStudent A: <short response>\n\nStudent B: <different short response>\n\nWrite your own contribution to this discussion."
options = []. correct_answer = -1. explanation = "".

═══ OUTPUT FORMAT ════════════════════════════════
Return ONLY a valid JSON array, no markdown:
[{"id":1,"section":"Reading Passage 1","type":"main-idea","passage":"...","question":"...","options":["A.","B.","C.","D."],"correct_answer":0,"explanation":"..."}]

RULES:
- Section names: "Reading Passage 1","Reading Passage 2","Listening — Lecture","Listening — Discussion","Writing"
- Q19 type = "integrated-writing", Q20 type = "academic-discussion"
- Writing tasks: options=[], correct_answer=-1, explanation=""
- All other questions: exactly 4 options (A–D). B2–C1 difficulty.`;
  }
}
