// Flashcard CSV import/export: Term, Definition, Example, Image, Audio.
// Works with files saved by Excel / Google Sheets ("CSV UTF-8"): BOM, ; or tab
// separators (locale dependent), quoted cells with commas, quotes and line breaks.

export interface CsvCard {
  term: string
  definition: string
  example?: string
  image?: string
  audio?: string
}

const HEADER = ['Term', 'Definition', 'Example', 'Image', 'Audio']

/** Only CSV is supported — Excel files must be saved as CSV first. */
export function isCsvFile(file: File): boolean {
  return /\.csv$/i.test(file.name) || file.type === 'text/csv'
}

function detectDelimiter(firstLine: string): string {
  const counts = [',', ';', '\t'].map((d) => [d, firstLine.split(d).length] as const)
  return counts.reduce((best, cur) => (cur[1] > best[1] ? cur : best))[0]
}

/** Split CSV text into rows of cells (RFC 4180 quoting). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, '')
  const delim = detectDelimiter(src.split(/\r?\n/, 1)[0] ?? '')
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++ }
      else if (ch === '"') inQuotes = false
      else cell += ch
    } else if (ch === '"') inQuotes = true
    else if (ch === delim) { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += ch
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim()))
}

/** Cards from a CSV file; a header row (Term/Thuật ngữ/术语…) and rows without a term are skipped. */
export function parseCardsCsv(text: string): CsvCard[] {
  const rows = parseCsv(text)
  if (rows.length && /^(term|word|thuật ngữ|từ|术语|单词)$/i.test(rows[0]![0]!.trim())) rows.shift()
  return rows
    .map((r) => r.map((c) => c.trim()))
    .filter((r) => r[0])
    .map(([term, definition = '', example, image, audio]) => ({
      term: term!, definition,
      example: example || undefined, image: image || undefined, audio: audio || undefined,
    }))
}

/** CSV text (with a BOM so Excel opens Vietnamese/Chinese text correctly). */
export function cardsToCsv(cards: CsvCard[]): string {
  const quote = (v = '') => `"${v.replace(/"/g, '""')}"`
  const lines = [HEADER, ...cards.map((c) => [c.term, c.definition, c.example, c.image, c.audio])]
  return '\uFEFF' + lines.map((l) => l.map(quote).join(',')).join('\r\n')
}

// ── Test questions: Question, Option A, Option B, Option C, Option D, Correct, Points ──

export interface CsvQuestion {
  question: string
  options: string[]
  /** Index into `options` (blank option columns are dropped). */
  correct: number
  points: number
}

const OPTION_COLUMNS = 4
const QUESTION_HEADER = /^(question|câu hỏi|问题|题目)$/i

/** Position of the correct answer among the non-empty options: a letter (A–D), a number (1–4) or the option's text. */
function resolveCorrect(cell: string, options: string[]): number {
  const filled = options.map((text, column) => ({ text, column })).filter((o) => o.text)
  const byColumn = (column: number) => filled.findIndex((o) => o.column === column)
  const value = cell.trim()
  if (/^[a-d]$/i.test(value)) return byColumn(value.toUpperCase().charCodeAt(0) - 65)
  if (/^[1-4]$/.test(value)) return byColumn(Number(value) - 1)
  return filled.findIndex((o) => o.text.toLowerCase() === value.toLowerCase())
}

/**
 * Multiple-choice questions from a CSV file. A header row is skipped; rows without a question,
 * with fewer than two options or with an unknown correct answer are counted in `skipped`.
 */
export function parseQuestionsCsv(text: string): { questions: CsvQuestion[]; skipped: number } {
  const rows = parseCsv(text)
  if (rows.length && QUESTION_HEADER.test(rows[0]![0]!.trim())) rows.shift()
  const questions: CsvQuestion[] = []
  let skipped = 0
  for (const raw of rows) {
    const [question = '', ...rest] = raw.map((c) => c.trim())
    const options = Array.from({ length: OPTION_COLUMNS }, (_, i) => rest[i] ?? '')
    const correct = resolveCorrect(rest[OPTION_COLUMNS] ?? '', options)
    const filled = options.filter(Boolean)
    if (!question || filled.length < 2 || correct < 0) { skipped++; continue }
    questions.push({
      question,
      options: filled,
      correct,
      points: Math.max(1, parseInt(rest[OPTION_COLUMNS + 1] ?? '', 10) || 1),
    })
  }
  return { questions, skipped }
}

/** A small example file teachers can fill in (with a BOM so Excel keeps the text intact). */
export function questionsCsvTemplate(): string {
  const rows = [
    ['Question', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct', 'Points'],
    ['What is the past tense of "go"?', 'goed', 'went', 'gone', 'going', 'B', '1'],
    ['Which word is a noun?', 'quickly', 'happy', 'table', 'run', 'C', '1'],
  ]
  return '﻿' + rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\r\n')
}
