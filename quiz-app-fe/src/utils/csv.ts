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
