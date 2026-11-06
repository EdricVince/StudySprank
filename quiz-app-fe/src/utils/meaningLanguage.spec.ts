import { describe, it, expect } from 'vitest'
import { resolveMeaningLang } from './meaningLanguage'

describe('resolveMeaningLang', () => {
  it('uses the app language when it differs from the language being learned', () => {
    expect(resolveMeaningLang('vi', 'en')).toBe('vi')
    expect(resolveMeaningLang('zh', 'en')).toBe('zh')
    expect(resolveMeaningLang('en', 'zh')).toBe('en')
  })

  it('never answers English words with English: an English interface learning English gets Vietnamese', () => {
    expect(resolveMeaningLang('en', 'en')).toBe('vi')
  })

  it('falls back to another language for the other same-language pairs', () => {
    expect(resolveMeaningLang('vi', 'vi')).toBe('en')
    expect(resolveMeaningLang('zh', 'zh')).toBe('vi')
  })

  it('treats an unknown interface language like a clash with the learning language', () => {
    expect(resolveMeaningLang('fr', 'en')).toBe('vi')
  })
})
