<template>
  <div class="p-6 lg:p-8">
    <button
      class="group mb-6 flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/8 px-3.5 py-1.5 text-sm font-semibold text-indigo-400 transition-all duration-200 hover:border-indigo-500/40 hover:bg-indigo-500/15 active:scale-95"
      @click="router.push('/classes')"
    >
      <svg class="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      {{ $t('classHub.student.title') }}
    </button>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
    </div>

    <template v-else-if="hub">
      <!-- Header -->
      <div class="animate-fade-in-down mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
        <div class="mb-2 flex flex-wrap items-center gap-3">
          <h1 class="text-foreground text-2xl font-bold tracking-tight lg:text-3xl">{{ hub.class.name }}</h1>
          <span v-if="hub.class.subject" class="bg-secondary text-muted-foreground rounded-full px-3 py-1 text-xs font-medium">{{ hub.class.subject }}</span>
        </div>
        <p v-if="hub.class.description" class="text-muted-foreground">{{ hub.class.description }}</p>
        <p class="text-muted-foreground mt-2 text-sm">
          {{ $t('classHub.student.taughtBy', { name: hub.teacher_name || '—' }) }}
          · {{ $t('classHub.student.classmates', { n: hub.class.student_count }) }}
        </p>
        </div>
        <button
          type="button"
          class="border-border text-muted-foreground hover:border-destructive/40 hover:text-destructive rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          :disabled="leaving"
          @click="leave"
        >
          {{ $t('classHub.student.leave') }}
        </button>
      </div>

      <p v-if="leaveError" class="text-destructive mb-4 text-sm" role="alert">{{ leaveError }}</p>

      <div class="space-y-6">
        <ClassItemList :items="testItems" :empty="$t('classHub.studentEmpty.tests')">
          <template #header><h2 class="text-foreground font-semibold">📝 {{ $t('classHub.tabs.tests') }}</h2></template>
        </ClassItemList>
        <ClassItemList :items="assignmentItems" :empty="$t('classHub.studentEmpty.assignments')">
          <template #header><h2 class="text-foreground font-semibold">📎 {{ $t('classHub.tabs.assignments') }}</h2></template>
          <template #actions="{ item }">
            <button
              type="button"
              class="bg-secondary text-secondary-foreground hover:bg-secondary/80 shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              @click="openAssignment(Number(item.key))"
            >{{ $t('classHub.student.open') }}</button>
          </template>
        </ClassItemList>
        <ClassItemList :items="deckItems" :empty="$t('classHub.studentEmpty.decks')">
          <template #header><h2 class="text-foreground font-semibold">🗂️ {{ $t('classHub.tabs.decks') }}</h2></template>
        </ClassItemList>
        <ClassItemList :items="vocabItems" :empty="$t('classHub.studentEmpty.vocab')">
          <template #header><h2 class="text-foreground font-semibold">🔤 {{ $t('classHub.tabs.vocab') }}</h2></template>
        </ClassItemList>
        <ClassItemList :items="lessonItems" :empty="$t('classHub.studentEmpty.lessons')">
          <template #header><h2 class="text-foreground font-semibold">📖 {{ $t('classHub.tabs.lessons') }}</h2></template>
        </ClassItemList>
      </div>
    </template>

    <div v-else class="flex flex-col items-center justify-center py-20 text-center">
      <p class="text-muted-foreground">{{ $t('classHub.student.notAvailable') }}</p>
    </div>

    <!-- Assignment viewer -->
    <Teleport to="body">
      <div v-if="viewing" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" @click.self="viewing = null">
        <div class="bg-card border-border max-h-full w-full max-w-2xl overflow-auto rounded-2xl border p-6 shadow-xl">
          <div class="mb-3 flex items-start justify-between gap-4">
            <h3 class="text-foreground text-lg font-semibold">{{ viewing.title }}</h3>
            <button type="button" class="text-muted-foreground hover:text-foreground" :aria-label="$t('classHub.student.close')" @click="viewing = null">✕</button>
          </div>
          <p v-if="viewing.description" class="text-foreground/90 whitespace-pre-wrap text-sm leading-relaxed">{{ viewing.description }}</p>
          <img
            v-if="viewing.attachment && viewing.attachment.startsWith('data:image/')"
            :src="viewing.attachment"
            :alt="viewing.attachment_name || viewing.title"
            class="mt-4 max-h-[60vh] w-full rounded-lg object-contain"
          />
          <!-- Only images are rendered; any other attachment is just named (never linked). -->
          <p v-else-if="viewing.attachment" class="text-muted-foreground mt-4 text-sm">
            {{ $t('classHub.student.assignmentFile') }}: {{ viewing.attachment_name || '' }}
          </p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ClassItemList from '@/components/class/ClassItemList.vue'
import type { ClassItem } from '@/components/class/ClassItemList.vue'
import { api } from '@/utils/api'
import type { ClassHub } from '@/types/class'
import type { AssignmentData } from '@/types/content'
import { errorText } from '@/utils/skills'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const classId = Number(route.params.id)
const hub = ref<ClassHub | null>(null)
const loading = ref(true)
const leaving = ref(false)
const leaveError = ref('')
const viewing = ref<AssignmentData | null>(null)

onMounted(async () => {
  try {
    hub.value = await api.getClassHub(classId)
  } catch {
    hub.value = null // not enrolled, or the class is gone
  } finally {
    loading.value = false
  }
})

/** Open a handout in a dialog (the list only carries light data; the file is fetched on demand). */
async function openAssignment(id: number) {
  try {
    viewing.value = await api.getAssignment(id)
  } catch {
    viewing.value = null
  }
}

async function leave() {
  if (leaving.value || !window.confirm(t('classHub.student.confirmLeave'))) return
  leaving.value = true
  leaveError.value = ''
  try {
    await api.leaveClass(classId)
    router.push('/classes')
  } catch (e) {
    leaveError.value = errorText(e, t('classHub.student.leaveFailed'))
  } finally {
    leaving.value = false
  }
}

// Students only receive published content; each row opens the matching study page.
const testItems = computed<ClassItem[]>(() =>
  (hub.value?.tests ?? []).map((x) => ({
    key: x.id, icon: '📝', title: x.title,
    meta: [t('classHub.questionsN', { n: x.question_count }), x.time_limit ? t('classHub.minutesN', { n: x.time_limit }) : ''].filter(Boolean).join(' · '),
    to: `/quizzes/test/${x.id}`,
  })),
)
const assignmentItems = computed<ClassItem[]>(() =>
  (hub.value?.assignments ?? []).map((x) => ({
    key: x.id, icon: '📎', title: x.title, meta: x.attachment_name || x.description || '',
  })),
)
const deckItems = computed<ClassItem[]>(() =>
  (hub.value?.decks ?? []).map((x) => ({
    key: x.id, icon: '🗂️', title: x.title, meta: `${t('classHub.cardsN', { n: x.card_count })} · ${x.category}`,
    to: `/flashcards/${x.id}/study`,
  })),
)
const vocabItems = computed<ClassItem[]>(() =>
  (hub.value?.vocab_sets ?? []).map((x) => ({
    key: x.id, icon: '🔤', title: x.name, meta: `${t('classHub.wordsN', { n: x.word_count })} · ${x.language} · ${x.level}`,
    to: `/flashcards/vocab-set/${x.id}/study`,
  })),
)
const lessonItems = computed<ClassItem[]>(() =>
  (hub.value?.lessons ?? []).map((x) => ({
    key: x.id, icon: '📖', title: x.title, meta: `${x.category} · ${x.difficulty}`,
    to: `/courses/${x.id}`,
  })),
)
</script>
