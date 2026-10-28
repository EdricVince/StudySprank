import type { DeckCardData } from '@/types/content'

// A teacher types one card per line: "term | definition" or "term | definition | example".
// A tab, " - ", " – ", " — " or ":" also separate term and definition.
const SEPARATORS = ['|', '\t', ' - ', ' – ', ' — ', ':']

/** Parse the textarea into cards; lines without a definition are skipped. */
export function parseCardLines(text: string): DeckCardData[] {
  const cards: DeckCardData[] = []
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    let cut = -1
    let sepLen = 0
    for (const sep of SEPARATORS) {
      const at = line.indexOf(sep)
      if (at > 0 && (cut === -1 || at < cut)) { cut = at; sepLen = sep.length }
    }
    if (cut === -1) continue
    const term = line.slice(0, cut).trim()
    let definition = line.slice(cut + sepLen).trim()
    let example = ''
    // "term | definition | example": a second pipe starts the example sentence.
    if (line.startsWith(`${line.slice(0, cut)}|`)) {
      const at = definition.indexOf('|')
      if (at > 0) {
        example = definition.slice(at + 1).trim()
        definition = definition.slice(0, at).trim()
      }
    }
    if (term && definition) cards.push(example ? { term, definition, example } : { term, definition })
  }
  return cards
}

/** The inverse, used when a teacher edits an existing deck or the AI fills the box. */
export function cardsToLines(cards: DeckCardData[]): string {
  return cards
    .map((c) => (c.example ? `${c.term} | ${c.definition} | ${c.example}` : `${c.term} | ${c.definition}`))
    .join('\n')
}
