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
  GetWritingPromptDto,
  SubmitWritingDto,
  CefrLevel,
  WritingType,
} from './dto/skills.dto';

import { messageText, parseJsonObject } from '../../core/ai/ai-response';
import type { AiJson } from '../../core/ai/ai-response';

/**
 * Pull the JSON object out of a model reply. Throws (→ 503 in the callers)
 * instead of silently returning `{}` when the reply has no usable object.
 */
export const extractJsonObject = parseJsonObject;

/** Shape the model is asked to return for an IELTS Task 1 chart. */
interface Task1ChartJson {
  title?: string;
  labels: string[];
  values: number[];
  unit?: string;
  task_prompt?: string;
  tips?: string[];
}

// SVG color palette (dark-theme friendly)
const CHART_COLORS = [
  '#6366f1',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
];

// Topic pool for Task 1 to prevent repetition
const TASK1_TOPICS = [
  'smartphone ownership across 5 countries',
  'household energy consumption by source',
  'university enrollment by subject area',
  'CO₂ emissions by transport type',
  'internet usage by age group',
  'annual tourism revenue by region',
  'water usage by industry sector',
  'average salary by profession',
  'vehicle sales by fuel type',
  'renewable energy production share',
  'literacy rates over three decades',
  'population growth in urban vs rural areas',
  'healthcare spending as % of GDP',
  'employment rates by education level',
  'daily screen time by device type',
  'food waste by category',
  'commute time by city',
  'student pass rates by subject',
];

// Topic pools for Task 2 / TOEIC / General
const TASK2_TOPICS = [
  'technology replacing human jobs',
  'social media impact on mental health',
  'climate change individual responsibility',
  'online education vs traditional classrooms',
  'gap year benefits and drawbacks',
  'public transport vs private car ownership',
  'genetic engineering ethics',
  'cultural globalisation losing local identity',
  'mandatory volunteering for students',
  'remote work changing cities',
  'free university education',
  'celebrity influence on youth',
  'space exploration funding priority',
  'nuclear energy revival',
  'shorter working week productivity',
];

const TOEIC_SCENARIOS = [
  'project deadline extension request',
  'new employee onboarding policy',
  'customer complaint response',
  'team meeting agenda',
  'office relocation announcement',
  'budget proposal summary',
  'quarterly performance review',
  'supplier partnership offer',
  'remote work policy update',
  'product launch announcement',
];

const GENERAL_TASKS = [
  'describe a memorable childhood place',
  'narrate an unexpected event that changed you',
  'write to a friend about moving abroad',
  'describe your ideal future city',
  'opinion on social media age limits',
  'letter to a local authority about a problem',
  'describe a person who inspired you',
  'narrate a time you overcame a fear',
  'opinion on space tourism',
  'describe your favourite season',
];

@Injectable()
export class WritingService {
  private readonly logger = new Logger(WritingService.name);
  constructor() {}

  private get client() {
    return getAnthropicClient();
  }

  async getPrompt(dto: GetWritingPromptDto) {
    const type = dto.type ?? 'general';
    const level = dto.level ?? this.defaultLevel(type);
    if (!this.client) throw new ServiceUnavailableException(AI_NOT_CONFIGURED);
    return this.generatePrompt(type, level);
  }

  async submitEssay(dto: SubmitWritingDto) {
    if (!this.client) throw new ServiceUnavailableException(AI_NOT_CONFIGURED);
    return this.evaluateEssay(dto);
  }

  private defaultLevel(type: WritingType): CefrLevel {
    const map: Record<WritingType, CefrLevel> = {
      ielts_task2: 'B2',
      ielts_task1: 'B1',
      toeic: 'B1',
      general: 'B1',
    };
    return map[type];
  }

  private pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private async generatePrompt(type: WritingType, level: CefrLevel) {
    // Task 1 gets its own chart-focused path
    if (type === 'ielts_task1') return this.generateTask1WithChart(level);

    const topicHint =
      type === 'ielts_task2'
        ? this.pick(TASK2_TOPICS)
        : type === 'toeic'
          ? this.pick(TOEIC_SCENARIOS)
          : this.pick(GENERAL_TASKS);

    const specs = {
      ielts_task2: {
        desc: 'IELTS Academic Writing Task 2',
        time: 40,
        words: '250 words minimum',
        instr: `Write about "${topicHint}". Choose ONE type: Opinion, Discussion, Problem-Solution, or Advantages-Disadvantages. Level: ${level}.`,
      },
      toeic: {
        desc: 'TOEIC Writing Task',
        time: 30,
        words: '100-200 words',
        instr: `Scenario: "${topicHint}". Either (1) write an email based on 3 bullet points, or (2) express an opinion on a workplace issue.`,
      },
      general: {
        desc: 'General English Writing',
        time: 25,
        words: '150-250 words',
        instr: `Task about "${topicHint}". Level ${level}. Types: descriptive, narrative, opinion, or letter.`,
      },
    };
    const spec = specs[type];

    const prompt = `You are an expert ${spec.desc} examiner. Generate a unique task.
${spec.instr}

Return ONLY valid JSON (no markdown):
{
  "id": "w_${Date.now()}",
  "type": "${type}",
  "level": "${level}",
  "title": "Concise title (5-8 words)",
  "prompt": "Full official task instruction (2-4 sentences, exam-authentic).",
  "context": "Background or scenario for the student.",
  "time_limit_seconds": ${spec.time * 60},
  "word_target": "${spec.words}",
  "band_criteria": ${type === 'ielts_task2' ? '["Task Achievement","Coherence & Cohesion","Lexical Resource","Grammatical Range & Accuracy"]' : '["Task Achievement","Organization","Vocabulary & Grammar","Tone & Register"]'},
  "tips": ["Specific tip 1", "Specific tip 2", "Specific tip 3"]
}`;

    try {
      const msg = await this.client!.messages.create({
        model: AI_MODEL,
        max_tokens: 700,
        messages: [{ role: 'user', content: prompt }],
      });
      return parseJsonObject<AiJson>(messageText(msg), 'prompt');
    } catch (e) {
      this.logger.error('Writing prompt generation failed', e);
      throw new ServiceUnavailableException(
        'AI writing prompt generation failed. Please try again.',
      );
    }
  }

  // ── IELTS Task 1: ask Claude for chart data, generate SVG server-side ────────

  private async generateTask1WithChart(level: CefrLevel) {
    const chartType = this.pick<'bar' | 'line' | 'pie'>(['bar', 'line', 'pie']);
    const topic = this.pick(TASK1_TOPICS);

    const prompt = `Generate IELTS Academic Writing Task 1 ${chartType} chart data about "${topic}".
Return ONLY valid JSON (no markdown):
{
  "title": "Clear chart title including context (year, country, unit)",
  "task_prompt": "Official IELTS instruction (2-3 sentences): summarise information, select key features, make comparisons where relevant. Write at least 150 words.",
  "labels": ["Label1","Label2","Label3","Label4","Label5"],
  "values": [72, 45, 88, 31, 61],
  "unit": "%",
  "tips": ["IELTS Task 1 structure tip","Language tip for comparing data","Common mistake to avoid"]
}
Rules: 4-7 data points. Values realistic and clearly varied. Labels max 12 chars. Unit appropriate to topic.`;

    try {
      const msg = await this.client!.messages.create({
        model: AI_MODEL,
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
      });
      const data = parseJsonObject<Task1ChartJson>(messageText(msg));
      if (!Array.isArray(data.labels) || !Array.isArray(data.values))
        throw new Error('Chart data missing labels/values');
      const unit = data.unit ?? '';

      // Build SVG deterministically from chart data (zero extra tokens)
      const chartSvg = this.buildChartSvg({
        type: chartType,
        title: data.title ?? topic,
        labels: data.labels,
        values: data.values,
        unit,
      });

      // Human-readable data summary for context field
      const contextDesc = data.labels
        .map((l, i) => `${l}: ${data.values[i]}${unit}`)
        .join(' · ');

      return {
        id: `w_${Date.now()}`,
        type: 'ielts_task1',
        level,
        title: data.title ?? topic,
        prompt:
          data.task_prompt ??
          'Summarise the information in the chart and make comparisons where relevant.',
        context: contextDesc,
        chart_type: chartType,
        chart_svg: chartSvg,
        time_limit_seconds: 20 * 60,
        word_target: '150 words minimum',
        band_criteria: [
          'Task Achievement',
          'Coherence & Cohesion',
          'Lexical Resource',
          'Grammatical Range & Accuracy',
        ],
        tips: data.tips ?? [],
      };
    } catch (e) {
      this.logger.error('Task 1 chart generation failed', e);
      throw new ServiceUnavailableException(
        'AI chart generation failed. Please try again.',
      );
    }
  }

  // ── SVG Chart Builder (no AI tokens used) ────────────────────────────────────

  private buildChartSvg(cfg: {
    type: 'bar' | 'line' | 'pie';
    title: string;
    labels: string[];
    values: number[];
    unit: string;
  }): string {
    const { type, title, labels, values, unit } = cfg;
    if (!labels.length || !values.length) return '';

    const W = 480,
      H = 300;
    const P = { top: 46, right: 22, bottom: 66, left: 54 };
    const cW = W - P.left - P.right;
    const cH = H - P.top - P.bottom;
    const maxV = Math.max(...values);
    const scale = cH / (maxV * 1.18);

    const shortTitle = title.length > 58 ? title.slice(0, 57) + '…' : title;

    const gridLines = () =>
      Array.from({ length: 5 }, (_, i) => {
        const v = Math.round(((maxV * 1.18) / 5) * (i + 1));
        const y = H - P.bottom - v * scale;
        return (
          `<line x1="${P.left}" y1="${y}" x2="${W - P.right}" y2="${y}" stroke="#1e293b" stroke-width="0.8"/>` +
          `<text x="${P.left - 5}" y="${y + 4}" text-anchor="end" font-size="9.5" fill="#64748b">${v}${unit}</text>`
        );
      }).join('') +
      `<text x="${P.left - 5}" y="${H - P.bottom + 4}" text-anchor="end" font-size="9.5" fill="#64748b">0</text>` +
      `<line x1="${P.left}" y1="${H - P.bottom}" x2="${W - P.right}" y2="${H - P.bottom}" stroke="#334155" stroke-width="0.8"/>`;

    const axes = () =>
      `<line x1="${P.left}" y1="${P.top - 4}" x2="${P.left}" y2="${H - P.bottom}" stroke="#334155" stroke-width="1"/>`;

    const xLbl = (label: string, xPos: number) => {
      const s = label.length > 11 ? label.slice(0, 10) + '…' : label;
      return `<text x="${xPos}" y="${H - P.bottom + 14}" text-anchor="middle" font-size="9.5" fill="#64748b">${s}</text>`;
    };

    let body = '';

    if (type === 'bar') {
      const bW = (cW / labels.length) * 0.58;
      const gap = cW / labels.length;
      body =
        gridLines() +
        axes() +
        values
          .map((v, i) => {
            const x = P.left + gap * i + (gap - bW) / 2;
            const bH = Math.max(v * scale, 2);
            const y = H - P.bottom - bH;
            const col = CHART_COLORS[i % CHART_COLORS.length];
            return (
              `<rect x="${x}" y="${y}" width="${bW}" height="${bH}" fill="${col}" rx="3" opacity="0.85"/>` +
              `<text x="${x + bW / 2}" y="${y - 4}" text-anchor="middle" font-size="9.5" fill="#e2e8f0" font-weight="600">${v}${unit}</text>` +
              xLbl(labels[i], P.left + gap * i + gap / 2)
            );
          })
          .join('');
    }

    if (type === 'line') {
      const xStep = cW / Math.max(labels.length - 1, 1);
      const pts = values
        .map((v, i) => `${P.left + i * xStep},${H - P.bottom - v * scale}`)
        .join(' ');
      body =
        gridLines() +
        axes() +
        `<polyline points="${pts}" fill="none" stroke="${CHART_COLORS[0]}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` +
        values
          .map((v, i) => {
            const cx = P.left + i * xStep;
            const cy = H - P.bottom - v * scale;
            return (
              `<circle cx="${cx}" cy="${cy}" r="4.5" fill="${CHART_COLORS[0]}" stroke="#0f172a" stroke-width="2"/>` +
              `<text x="${cx}" y="${cy - 10}" text-anchor="middle" font-size="9.5" fill="#e2e8f0">${v}${unit}</text>` +
              xLbl(labels[i], cx)
            );
          })
          .join('');
    }

    if (type === 'pie') {
      const total = values.reduce((a, b) => a + b, 0);
      const cx = 185,
        cy = H / 2 + 6,
        r = 92;
      let angle = -Math.PI / 2;
      const slices = values
        .map((v, i) => {
          const sweep = (v / total) * 2 * Math.PI;
          const x1 = cx + r * Math.cos(angle),
            y1 = cy + r * Math.sin(angle);
          const a2 = angle + sweep;
          const x2 = cx + r * Math.cos(a2),
            y2 = cy + r * Math.sin(a2);
          const large = sweep > Math.PI ? 1 : 0;
          const mid = angle + sweep / 2;
          const lx = cx + r * 0.65 * Math.cos(mid);
          const ly = cy + r * 0.65 * Math.sin(mid);
          const pct = Math.round((v / total) * 100);
          const col = CHART_COLORS[i % CHART_COLORS.length];
          angle = a2;
          return (
            `<path d="M${cx},${cy}L${x1},${y1}A${r},${r},0,${large},1,${x2},${y2}Z" fill="${col}" stroke="#0f172a" stroke-width="1.5" opacity="0.9"/>` +
            (pct > 4
              ? `<text x="${lx}" y="${ly + 4}" text-anchor="middle" font-size="10" fill="white" font-weight="700">${pct}%</text>`
              : '')
          );
        })
        .join('');
      const legend = labels
        .map((l, i) => {
          const s = l.length > 15 ? l.slice(0, 14) + '…' : l;
          return (
            `<rect x="296" y="${36 + i * 22}" width="11" height="11" fill="${CHART_COLORS[i % CHART_COLORS.length]}" rx="2"/>` +
            `<text x="313" y="${47 + i * 22}" font-size="9.5" fill="#94a3b8">${s}: ${values[i]}${unit}</text>`
          );
        })
        .join('');
      body = slices + legend;
    }

    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" style="font-family:ui-sans-serif,system-ui,sans-serif;background:#0f172a;border-radius:10px">` +
      `<text x="${W / 2}" y="26" text-anchor="middle" font-size="12" font-weight="700" fill="#e2e8f0">${shortTitle}</text>` +
      body +
      `</svg>`
    );
  }

  // ── Essay Evaluation ─────────────────────────────────────────────────────────

  private async evaluateEssay(dto: SubmitWritingDto) {
    const wordCount = dto.essay.trim().split(/\s+/).filter(Boolean).length;
    const level = dto.level ?? this.defaultLevel(dto.type);
    const min = Math.floor(dto.time_taken_seconds / 60);
    const sec = dto.time_taken_seconds % 60;

    const examinerStyle: Record<WritingType, string> = {
      ielts_task1:
        'IELTS Academic Writing Task 1 examiner. Grade using the official 9-band scale.',
      ielts_task2:
        'IELTS Academic Writing Task 2 examiner. Grade using the official 9-band scale.',
      toeic:
        'TOEIC Writing examiner. Convert criterion scores to 9-band equivalent for overall_band.',
      general:
        'English writing teacher. Convert 0-10 grade to 9-band equivalent for overall_band.',
    };

    const criteriaKeys: Record<WritingType, string[]> = {
      ielts_task1: [
        'task_achievement',
        'coherence_cohesion',
        'lexical_resource',
        'grammatical_accuracy',
      ],
      ielts_task2: [
        'task_achievement',
        'coherence_cohesion',
        'lexical_resource',
        'grammatical_accuracy',
      ],
      toeic: [
        'task_achievement',
        'organization',
        'vocabulary_usage',
        'grammatical_accuracy',
      ],
      general: [
        'task_achievement',
        'coherence_cohesion',
        'lexical_resource',
        'grammatical_accuracy',
      ],
    };

    const prompt = `You are a strict but fair ${examinerStyle[dto.type]}
Level: ${level} | Words: ${wordCount} | Time: ${min}m ${sec}s

TASK: ${dto.prompt}

ESSAY: ${dto.essay}

Reference ACTUAL phrases from the essay. Return ONLY valid JSON:
{
  "overall_band": 6.5,
  "scores": {${criteriaKeys[dto.type].map((k) => `"${k}": 6.5`).join(', ')}},
  "word_count": ${wordCount},
  "time_taken_seconds": ${dto.time_taken_seconds},
  "strengths": ["Specific strength with quote from essay", "Another strength"],
  "improvements": ["Specific actionable improvement", "Another improvement", "Third improvement"],
  "grammar_errors": [{"original": "exact phrase from essay", "corrected": "corrected version", "explanation": "why wrong"}],
  "vocabulary_feedback": {
    "good_words": ["strong word from essay", "another"],
    "suggestions": [{"replace": "basic word from essay", "with": "stronger alternative"}]
  },
  "corrected_paragraph": "Rewritten weakest paragraph with fixes applied.",
  "summary": "2-sentence overall assessment with band score and top improvement."
}
grammar_errors: up to 6 real errors (exact quotes). vocabulary suggestions: up to 4.`;

    try {
      const msg = await this.client!.messages.create({
        model: AI_MODEL,
        max_tokens: 1800,
        messages: [{ role: 'user', content: prompt }],
      });
      // An evaluation without a band would render as an empty result page.
      return parseJsonObject<AiJson>(messageText(msg), 'overall_band');
    } catch (e) {
      this.logger.error('Essay evaluation failed', e);
      throw new ServiceUnavailableException(
        'AI essay evaluation failed. Please try again.',
      );
    }
  }
}
