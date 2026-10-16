import { describe, it, expect, vi } from 'vitest'
import { createI18n } from 'vue-i18n'
import en from './locales/en'
import vi_ from './locales/vi'
import zh from './locales/zh'

/** Every leaf key path of a nested message object, e.g. "auth.register.email". */
function keysOf(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keysOf(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
  )
}

describe('i18n locale files', () => {
  it.each([['en', en], ['vi', vi_], ['zh', zh]] as const)(
    '%s: every message compiles (special chars like @ { } | are escaped)',
    (locale, messages) => {
      const errors: string[] = []
      const spy = vi.spyOn(console, 'error').mockImplementation((...args) => { errors.push(String(args[0])) })
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const i18n = createI18n({ legacy: false, locale, messages: { [locale]: messages } })
      for (const key of keysOf(messages as Record<string, unknown>)) {
        // provide every common named param so interpolations resolve
        i18n.global.t(key, { n: 1, count: 1, name: 'x', date: 'x', done: 1, total: 1 })
      }
      spy.mockRestore()
      warn.mockRestore()
      expect(errors.filter((e) => /compil|lexical|linked/i.test(e))).toEqual([])
    },
  )

  it('renders the register email placeholder with a literal @', () => {
    const i18n = createI18n({ legacy: false, locale: 'en', messages: { en } })
    expect(i18n.global.t('auth.register.emailPlaceholder')).toBe('name@example.com')
  })
})
