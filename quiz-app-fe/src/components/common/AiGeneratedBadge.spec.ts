import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import AiGeneratedBadge from './AiGeneratedBadge.vue'
import en from '@/i18n/locales/en'
import vi from '@/i18n/locales/vi'
import zh from '@/i18n/locales/zh'

const mountIn = (locale: string, messages: Record<string, any> = { en, vi, zh }) =>
  mount(AiGeneratedBadge, { global: { plugins: [createI18n({ legacy: false, locale, fallbackLocale: 'en', messages })] } })

describe('AiGeneratedBadge', () => {
  it('renders the English disclosure', () => {
    expect(mountIn('en').text()).toBe('AI-generated — may contain errors; not a final grade')
  })

  it('is translated for vi and zh', () => {
    expect(mountIn('vi').text()).toBe('Do AI tạo — có thể có sai sót; không phải điểm chính thức')
    expect(mountIn('zh').text()).toBe('AI 生成 — 可能有误；并非最终成绩')
  })

  it('falls back to English text when the host i18n has no ai keys, and is announced as a note', () => {
    const w = mountIn('en', { en: {} })
    expect(w.text()).toBe('AI-generated — may contain errors; not a final grade')
    expect(w.attributes('role')).toBe('note')
  })
})
