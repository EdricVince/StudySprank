// Vitest global setup: every mounted component gets the real English i18n, so
// specs can assert on the actual UI text without wiring vue-i18n themselves.
// A spec that passes its own i18n plugin still wins (installed last).
import { config } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import en from '@/i18n/locales/en'

config.global.plugins = [createI18n({ legacy: false, locale: 'en', fallbackLocale: 'en', messages: { en } })]
