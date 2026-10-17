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
  GenerateScheduleDto,
  ExtendScheduleDto,
  MonthPlan,
  StudyPlan,
} from './dto/schedule.dto';

const MONTHS_BY_LEVEL: Record<string, Record<string, number>> = {
  beginner: { IELTS: 12, TOEIC: 10, TOEFL: 12, General: 8 },
  A1: { IELTS: 10, TOEIC: 8, TOEFL: 10, General: 6 },
  A2: { IELTS: 8, TOEIC: 6, TOEFL: 8, General: 5 },
  B1: { IELTS: 5, TOEIC: 4, TOEFL: 5, General: 3 },
  B2: { IELTS: 3, TOEIC: 2, TOEFL: 4, General: 2 },
  C1: { IELTS: 2, TOEIC: 1, TOEFL: 2, General: 1 },
  C2: { IELTS: 1, TOEIC: 1, TOEFL: 1, General: 1 },
};

function getMonthsNeeded(
  level: string,
  exam: string,
  targetBand?: string,
  weeklyHours = 10,
): number {
  const base = MONTHS_BY_LEVEL[level]?.[exam] ?? 6;
  let months = base;
  if (targetBand) {
    const n = parseFloat(targetBand);
    if (exam === 'IELTS') {
      if (n >= 8.0) months = Math.ceil(months * 1.4);
      else if (n >= 7.0) months = Math.ceil(months * 1.2);
      else if (n <= 5.0) months = Math.ceil(months * 0.85);
    } else if (exam === 'TOEIC') {
      if (n >= 900) months = Math.ceil(months * 1.3);
      else if (n >= 800) months = Math.ceil(months * 1.1);
      else if (n <= 500) months = Math.ceil(months * 0.8);
    }
  }
  const hoursMultiplier = 10 / Math.max(weeklyHours, 2);
  months = Math.round(months * hoursMultiplier);
  return Math.min(Math.max(months, 1), 36);
}

function getTier(level: string, exam: string, targetBand?: string): 1 | 2 | 3 {
  if (level === 'C1' || level === 'C2') return 3;
  if (exam === 'IELTS' && targetBand && parseFloat(targetBand) >= 7.0) return 3;
  if (exam === 'TOEIC' && targetBand && parseFloat(targetBand) >= 800) return 3;
  if (level === 'B1' || level === 'B2') return 2;
  if (exam === 'IELTS' && targetBand && parseFloat(targetBand) >= 5.0) return 2;
  if (exam === 'TOEIC' && targetBand && parseFloat(targetBand) >= 500) return 2;
  return 1;
}

/** Attempt to recover a truncated JSON response by closing open structures */
function tryParseJson(raw: string): unknown {
  const cleaned = raw
    .trim()
    .replace(/```json\n?|```/g, '')
    .trim();
  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    /* truncated output — repair below */
  }
  let text = cleaned;
  // Remove last incomplete object (open brace with no closing)
  text = text.replace(/,?\s*\{[^{}]*$/, '');
  // Remove last incomplete key or value
  text = text.replace(/,\s*"[^"]*"\s*:?\s*$/, '');
  // Remove trailing comma
  text = text.replace(/,\s*$/, '');
  // Close unclosed brackets
  const opens =
    (text.match(/\{/g) ?? []).length - (text.match(/\}/g) ?? []).length;
  const arrOpens =
    (text.match(/\[/g) ?? []).length - (text.match(/\]/g) ?? []).length;
  for (let i = 0; i < arrOpens; i++) text += ']';
  for (let i = 0; i < opens; i++) text += '}';
  return JSON.parse(text) as unknown;
}

@Injectable()
export class ScheduleService {
  private readonly logger = new Logger(ScheduleService.name);
  constructor() {}

  private get client() {
    return getAnthropicClient();
  }

  async generatePlan(dto: GenerateScheduleDto): Promise<StudyPlan> {
    if (!this.client) throw new ServiceUnavailableException(AI_NOT_CONFIGURED);

    const monthsNeeded = getMonthsNeeded(
      dto.current_level,
      dto.target_exam,
      dto.target_band,
      dto.weekly_hours,
    );
    const tier = getTier(dto.current_level, dto.target_exam, dto.target_band);
    const monthlyHours = dto.weekly_hours * 4;

    // Generate only 1 month upfront to keep JSON small and generation fast.
    // Additional months are loaded on demand via extendPlan.
    const previewMonths = Math.min(monthsNeeded, 1);
    const prompt = this.buildPrompt(
      dto,
      monthsNeeded,
      monthlyHours,
      previewMonths,
      tier,
    );

    try {
      const res = await this.client.messages.create({
        model: AI_MODEL,
        max_tokens: 2800,
        messages: [{ role: 'user', content: prompt }],
      });
      const raw = (res.content[0] as { text: string }).text;
      return tryParseJson(raw) as StudyPlan;
    } catch (e) {
      this.logger.error('Schedule AI failed', e);
      throw new ServiceUnavailableException(
        'AI schedule generation failed. Please try again.',
      );
    }
  }

  async extendPlan(dto: ExtendScheduleDto): Promise<MonthPlan> {
    if (!this.client) throw new ServiceUnavailableException(AI_NOT_CONFIGURED);

    const monthlyHours = dto.weekly_hours * 4;
    const targetStr = dto.target_band
      ? `${dto.target_exam} ${dto.target_band}`
      : dto.target_exam;
    const tier = getTier(dto.current_level, dto.target_exam, dto.target_band);
    const prevThemes = dto.existing_themes
      .map((t, i) => `Month ${i + 1}: ${t}`)
      .join('\n');

    const tierGuide =
      tier === 1
        ? 'TIER 1: Mon=Vocabulary, Tue=Grammar, Wed=Reading, Thu=Listening, Fri=Writing, Sat=Speaking, Sun=Rest.'
        : tier === 2
          ? 'TIER 2: One main skill per day with increasing difficulty.'
          : 'TIER 3: High-level strategy and exam refinement.';

    const prompt = `You are an expert ${dto.target_exam} tutor extending a study plan.
STUDENT: ${dto.current_level} → ${targetStr} | ${dto.weekly_hours}h/week${dto.focus_areas?.length ? ' | Priority: ' + dto.focus_areas.join(', ') : ''}

EXISTING THEMES (do NOT repeat):
${prevThemes}

Generate Month ${dto.next_month_number} — more advanced than previous. ${tierGuide}

Return ONLY valid JSON for one MonthPlan:
{
  "month": ${dto.next_month_number},
  "theme": "Theme Name",
  "objective": "Specific objective",
  "total_hours": ${monthlyHours},
  "week_summaries": [
    {
      "week_in_month": 1,
      "focus": "Week focus",
      "daily_schedule": [
        {"day":"Mon","skill":"Vocabulary","topic":"Specific topic","is_rest":false},
        {"day":"Tue","skill":"Grammar","topic":"Specific topic","is_rest":false},
        {"day":"Wed","skill":"Reading","topic":"Specific topic","is_rest":false},
        {"day":"Thu","skill":"Listening","topic":"Specific topic","is_rest":false},
        {"day":"Fri","skill":"Writing","topic":"Specific topic","is_rest":false},
        {"day":"Sat","skill":"Speaking","topic":"Specific topic","is_rest":false},
        {"day":"Sun","skill":"Rest","topic":"Rest & consolidation","is_rest":true}
      ]
    }
  ]
}
Rules: Exactly 4 week_summaries. Each week exactly 7 days (Mon-Sun). Sunday always is_rest: true. Topics specific and actionable.`;

    try {
      const res = await this.client.messages.create({
        model: AI_MODEL,
        max_tokens: 2500,
        messages: [{ role: 'user', content: prompt }],
      });
      const raw = (res.content[0] as { text: string }).text;
      return tryParseJson(raw) as MonthPlan;
    } catch (e) {
      this.logger.error('Schedule extend AI failed', e);
      throw new ServiceUnavailableException(
        'AI month generation failed. Please try again.',
      );
    }
  }

  private buildPrompt(
    dto: GenerateScheduleDto,
    monthsNeeded: number,
    monthlyHours: number,
    previewMonths: number,
    tier: 1 | 2 | 3,
  ): string {
    const targetStr = dto.target_band
      ? `${dto.target_exam} ${dto.target_band}`
      : dto.target_exam;
    const tierGuide =
      tier === 1
        ? `TIER 1 — BEGINNER: Each day ONE skill only. Mon=Vocabulary, Tue=Grammar, Wed=Reading, Thu=Listening, Fri=Writing, Sat=Speaking, Sun=Rest. Simple accessible topics.`
        : tier === 2
          ? `TIER 2 — INTERMEDIATE: One main skill per day. Moderate-to-advanced topics. Clear weekly progression.`
          : `TIER 3 — ADVANCED: High-level objectives. Exam strategy and refinement focus.`;

    return `You are an expert ${dto.target_exam} tutor. Create a personalized study plan.
STUDENT: ${dto.current_level} → ${targetStr} | ${dto.weekly_hours}h/week (≈${monthlyHours}h/month) | Total: ${monthsNeeded} months${dto.focus_areas?.length ? ' | Priority: ' + dto.focus_areas.join(', ') : ''}

${tierGuide}

Generate first ${previewMonths} month(s). Keep topics SHORT (under 50 chars each).

Return ONLY valid JSON:
{
  "level": "${dto.current_level}",
  "target": "${targetStr}",
  "months_needed": ${monthsNeeded},
  "monthly_plan": [
    {
      "month": 1,
      "theme": "Foundation & Core Vocabulary",
      "objective": "Build 100+ key words and establish daily habit",
      "total_hours": ${monthlyHours},
      "week_summaries": [
        {
          "week_in_month": 1,
          "focus": "Overview & basics",
          "daily_schedule": [
            {"day":"Mon","skill":"Vocabulary","topic":"Academic Word List Set 1","is_rest":false},
            {"day":"Tue","skill":"Grammar","topic":"Present Simple & Continuous","is_rest":false},
            {"day":"Wed","skill":"Reading","topic":"Exam format overview + passage","is_rest":false},
            {"day":"Thu","skill":"Listening","topic":"Section 1: form filling","is_rest":false},
            {"day":"Fri","skill":"Writing","topic":"Task 1: bar chart template","is_rest":false},
            {"day":"Sat","skill":"Speaking","topic":"Part 1: personal questions","is_rest":false},
            {"day":"Sun","skill":"Rest","topic":"Rest & consolidation","is_rest":true}
          ]
        }
      ]
    }
  ],
  "tips": ["tip1","tip2","tip3"],
  "resources": [{"name":"name","type":"book|website|app","description":"desc"}]
}
Rules: Each month exactly 4 week_summaries. Each week exactly 7 days. Sunday always is_rest:true. Difficulty increases each month.`;
  }
}
