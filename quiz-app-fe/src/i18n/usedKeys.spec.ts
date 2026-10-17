import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import en from './locales/en'

const SRC = join(__dirname, '..')

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return name === 'locales' ? [] : files(p)
    return /\.(vue|ts)$/.test(name) && !name.endsWith('.spec.ts') ? [p] : []
  })
}

function has(obj: unknown, key: string): boolean {
  return key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj) !== undefined
}

describe('i18n keys used in the code', () => {
  it('every static key passed to t() / $t() / keypath exists in en.ts', () => {
    const missing: string[] = []
    // Only literal keys: t('a.b.c'), $t("a.b"), keypath="a.b". Template-literal keys are skipped.
    const re = /(?:\$t|\bt|\bte)\(\s*['"]([a-zA-Z][\w-]*(?:\.[\w-]+)+)['"]|keypath="([a-zA-Z][\w-]*(?:\.[\w-]+)+)"/g
    for (const f of files(SRC)) {
      const src = readFileSync(f, 'utf8')
      for (const m of src.matchAll(re)) {
        const key = m[1] ?? m[2]!
        if (!has(en, key)) missing.push(`${f.slice(SRC.length + 1)}: ${key}`)
      }
    }
    expect(missing).toEqual([])
  })
})
