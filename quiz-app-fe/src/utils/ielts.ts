import type { ExamQuestionView } from '@/types/content'

/** Helpers for the IELTS mock test screens (taking the test and reading the result). */

export type ExamSkill = 'Listening' | 'Reading' | 'Writing'
export const EXAM_SKILLS: ExamSkill[] = ['Listening', 'Reading', 'Writing']

/** "Listening Part 3" → "Listening"; "Reading" (older papers) → "Reading". */
export function skillOfSection(section: string): ExamSkill | null {
  return EXAM_SKILLS.find((s) => section.toLowerCase().startsWith(s.toLowerCase())) ?? null
}

/** "Listening Part 3" → 3, "Reading Passage 2" → 2, "Reading" → 1. */
export function partNumber(section: string): number {
  const n = /(\d+)\s*$/.exec(section)
  return n ? Number(n[1]) : 1
}

export interface ExamPart {
  section: string
  skill: ExamSkill
  number: number
  /** The audio script or reading passage (stored on the first question of the part). */
  text: string | null
  questions: ExamQuestionView[]
}

/** The questions of the paper grouped by part, in paper order. */
export function partsOf(questions: ExamQuestionView[]): ExamPart[] {
  const parts: ExamPart[] = []
  for (const q of questions) {
    const skill = skillOfSection(q.section)
    if (!skill) continue
    let part = parts[parts.length - 1]
    if (!part || part.section !== q.section) {
      part = { section: q.section, skill, number: partNumber(q.section), text: null, questions: [] }
      parts.push(part)
    }
    if (q.passage && !part.text && skill !== 'Writing') part.text = q.passage
    part.questions.push(q)
  }
  return parts
}

/** Listening / Reading questions are typed when the paper gives them no options. */
export const isTyped = (q: { options: string[]; section: string }) =>
  q.options.length === 0 && skillOfSection(q.section) !== 'Writing'

export interface QuestionRun {
  type: string
  instruction: string
  /** Number shown on the first question of the run (numbering restarts for each skill). */
  from: number
  to: number
  questions: ExamQuestionView[]
}

/** Consecutive questions of one type share a rubric ("Questions 1–5: Complete the form…"). */
export function runsOf(questions: ExamQuestionView[], numberOf: (id: number) => number): QuestionRun[] {
  const runs: QuestionRun[] = []
  for (const q of questions) {
    const last = runs[runs.length - 1]
    if (last && last.type === q.type && (q.instruction ?? '') === last.instruction) {
      last.questions.push(q)
      last.to = numberOf(q.id)
    } else {
      runs.push({
        type: q.type,
        instruction: q.instruction ?? '',
        from: numberOf(q.id),
        to: numberOf(q.id),
        questions: [q],
      })
    }
  }
  return runs
}

const ROMAN = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x']
/** A, B, C… for most questions; i, ii, iii… for the list of headings. */
export function optionLabel(type: string, index: number): string {
  return type === 'matching-headings' ? (ROMAN[index] ?? String(index + 1)) : String.fromCharCode(65 + index)
}

/** Types whose options are one list shared by every question of the run. */
export const hasSharedOptions = (type: string) => type === 'matching' || type === 'matching-headings'

/** Words in a text (what the Writing counter shows). */
export const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0)

export const WRITING_MIN_WORDS = { 'writing-task1': 150, 'writing-task2': 250 } as const

/** The band as text with one decimal ("6.5"). */
export const bandText = (band: number | null | undefined) =>
  typeof band === 'number' ? band.toFixed(1) : '—'

/**
 * The overall band of a past sitting. Sittings from before numeric bands only have a range such
 * as "6.0–6.5": the middle of the range (rounded to a half band) is used for them.
 */
export function overallBandOf(item: { overall_band?: number | null; estimated_band?: string | null }): number | null {
  if (typeof item.overall_band === 'number') return item.overall_band
  const range = /^(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)$/.exec(item.estimated_band ?? '')
  if (range) return Math.round(Number(range[1]) + Number(range[2])) / 2
  const single = Number.parseFloat(item.estimated_band ?? '')
  return Number.isFinite(single) ? single : null
}

/** [minimum band, key] — first match wins (labels under exam.bands.*, levels under exam.cefr.*). */
const BAND_LABELS: [number, string][] = [[8.5, 'expert'], [7.5, 'veryGood'], [6.5, 'good'], [5.5, 'competent'], [4.5, 'modest'], [3.5, 'limited'], [0, 'beginner']]
const BAND_CEFR: [number, string][] = [[8, 'C2'], [7, 'C1'], [5.5, 'B2'], [4, 'B1'], [3, 'A2'], [0, 'A1']]
const pick = (table: [number, string][], band: number) => table.find(([min]) => band >= min)![1]
export const bandLabelKey = (band: number) => pick(BAND_LABELS, band)
export const cefrKey = (band: number) => pick(BAND_CEFR, band)
