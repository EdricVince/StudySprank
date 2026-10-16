<template>
  <div
    class="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-600 dark:text-amber-400"
    role="note"
    data-test="ai-generated-badge"
  >
    <Sparkles class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    <span><strong class="font-semibold">{{ label }}</strong> — {{ notice }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Sparkles } from '@/components/icons'

/**
 * Disclosure shown next to any AI-produced score or feedback (FR-AI5):
 * "AI-generated — may contain errors; not a final grade".
 * Falls back to English if the host i18n instance lacks the keys.
 */
const { t, te } = useI18n()
const label = computed(() => (te('ai.generated.label') ? t('ai.generated.label') : 'AI-generated'))
const notice = computed(() =>
  te('ai.generated.notice') ? t('ai.generated.notice') : 'may contain errors; not a final grade',
)
</script>
