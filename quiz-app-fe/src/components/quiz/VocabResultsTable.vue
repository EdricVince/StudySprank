<template>
  <div v-if="entries.length > 0" class="mx-auto mt-6 max-w-2xl pb-8">
    <h3 class="text-foreground mb-4 text-lg font-semibold">{{ $t('quizPlay.vocab.title') }}</h3>
    <div class="bg-card border-border overflow-hidden rounded-2xl border">
      <table class="w-full text-sm">
        <thead class="bg-secondary">
          <tr>
            <th class="text-foreground px-4 py-3 text-left font-medium">{{ $t('quizPlay.vocab.word') }}</th>
            <th class="text-foreground px-4 py-3 text-left font-medium">{{ $t('quizPlay.vocab.meaning') }}</th>
            <th class="text-foreground px-4 py-3 text-center font-medium">{{ $t('quizPlay.vocab.result') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(entry, i) in entries" :key="i" class="border-border border-t">
            <td class="text-foreground px-4 py-3 font-medium">{{ entry.termDisplay }}</td>
            <td class="text-muted-foreground px-4 py-3">{{ entry.meaningDisplay }}</td>
            <td class="px-4 py-3 text-center">
              <span v-if="entry.isCorrect" class="text-primary font-bold">✓</span>
              <span v-else class="text-destructive font-bold">✗</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
interface VocabEntry {
  termDisplay: string
  meaningDisplay: string
  isCorrect: boolean
}

defineProps<{ entries: VocabEntry[] }>()
</script>
