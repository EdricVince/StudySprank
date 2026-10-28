<template>
  <div class="p-6 lg:p-8">
    <!-- Back -->
    <button
      class="group mb-6 flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/8 px-3.5 py-1.5 text-sm font-semibold text-indigo-400 transition-all duration-200 hover:border-indigo-500/40 hover:bg-indigo-500/15 active:scale-95"
      @click="router.push('/teacher/classes')"
    >
      <svg class="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      {{ $t('teacher.nav.classes') }}
    </button>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
    </div>

    <template v-else-if="hub">
      <!-- Header -->
      <div class="animate-fade-in-down mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div class="min-w-0">
          <div class="mb-2 flex flex-wrap items-center gap-3">
            <h1 class="text-foreground text-2xl font-bold tracking-tight lg:text-3xl">{{ hub.class.name }}</h1>
            <span
              class="rounded-full px-3 py-1 text-xs font-medium"
              :class="hub.class.is_active ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'"
            >{{ hub.class.is_active ? $t('teacher.classDetail.active') : $t('teacher.classDetail.inactive') }}</span>
            <span v-if="hub.class.subject" class="bg-secondary text-muted-foreground rounded-full px-3 py-1 text-xs font-medium">{{ hub.class.subject }}</span>
          </div>
          <p class="text-muted-foreground">{{ hub.class.description || $t('teacher.classDetail.noDescription') }}</p>
        </div>

        <!-- Class code -->
        <div class="bg-card border-border rounded-xl border p-4 text-center lg:min-w-40">
          <p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">{{ $t('teacher.classDetail.joinCode') }}</p>
          <p class="text-foreground font-mono text-2xl font-bold tracking-widest">{{ hub.class.class_code }}</p>
          <button class="text-primary hover:text-primary/80 mt-2 flex w-full items-center justify-center gap-1 text-sm" @click="copyCode">
            <Copy class="h-4 w-4" />
            {{ $t('teacher.classDetail.copyCode') }}
          </button>
        </div>
      </div>

      <!-- Overview cards: one per kind of content, click to open its tab -->
      <div class="animate-fade-in-up delay-100 mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <button
          v-for="tab in tabs.filter((x) => x.key !== 'activity')"
          :key="tab.key"
          type="button"
          class="bg-card border-border rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
          :class="active === tab.key ? 'ring-primary/40 ring-2' : ''"
          @click="active = tab.key"
        >
          <div class="mb-2 text-xl">{{ tab.icon }}</div>
          <p class="text-foreground text-2xl font-bold tabular-nums">{{ tab.count }}</p>
          <p class="text-muted-foreground text-xs">{{ tab.label }}</p>
        </button>
      </div>

      <!-- Tabs -->
      <div class="border-border mb-5 flex gap-1 overflow-x-auto border-b">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition-colors"
          :class="active === tab.key ? 'border-primary text-primary' : 'text-muted-foreground hover:text-foreground border-transparent'"
          @click="active = tab.key"
        >{{ tab.icon }} {{ tab.label }}</button>
      </div>

      <!-- Students (with progress) -->
      <div v-if="active === 'students'" class="bg-card border-border overflow-hidden rounded-2xl border">
        <div v-if="hub.students?.length" class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-muted/40 text-muted-foreground text-left text-xs uppercase tracking-wide">
              <tr>
                <th class="px-4 py-3 font-semibold">{{ $t('classHub.students.student') }}</th>
                <th class="px-4 py-3 font-semibold">{{ $t('classHub.students.level') }}</th>
                <th class="px-4 py-3 font-semibold">{{ $t('classHub.students.xp') }}</th>
                <th class="px-4 py-3 font-semibold">{{ $t('classHub.students.streak') }}</th>
                <th class="px-4 py-3 font-semibold">{{ $t('classHub.students.tests') }}</th>
                <th class="px-4 py-3 font-semibold">{{ $t('classHub.students.avg') }}</th>
                <th class="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-border divide-y">
              <tr v-for="s in hub.students" :key="s.id">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <div class="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium">{{ getInitials(s.name) }}</div>
                    <div class="min-w-0">
                      <p class="text-foreground truncate font-medium">{{ s.name }}</p>
                      <p class="text-muted-foreground truncate text-xs">{{ s.email }} · {{ $t('teacher.classDetail.joinedOn', { date: formatDate(s.joined_at) }) }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 tabular-nums">{{ s.level }}</td>
                <td class="px-4 py-3 tabular-nums">{{ s.xp.toLocaleString() }}</td>
                <td class="px-4 py-3 tabular-nums">{{ s.streak_count }} 🔥</td>
                <td class="px-4 py-3 tabular-nums">{{ s.tests_taken }}</td>
                <td class="px-4 py-3 tabular-nums">{{ s.tests_taken ? s.avg_score + '%' : '—' }}</td>
                <td class="px-4 py-3 text-right">
                  <button
                    class="hover:bg-destructive/10 rounded-lg p-2 transition-colors"
                    :aria-label="$t('classHub.students.remove')"
                    @click="handleRemoveStudent(s)"
                  >
                    <UserMinus class="text-destructive h-4 w-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="p-10 text-center">
          <Users class="text-muted-foreground mx-auto mb-3 h-10 w-10" />
          <p class="text-muted-foreground text-sm">{{ $t('teacher.classDetail.noStudents') }}</p>
          <p class="text-muted-foreground mt-1 text-xs">{{ $t('teacher.classDetail.noStudentsShare', { code: hub.class.class_code }) }}</p>
        </div>
      </div>

      <!-- Tests -->
      <ClassItemList v-else-if="active === 'tests'" :items="testItems" :empty="$t('classHub.empty.tests')">
        <template #header>
          <h2 class="text-foreground font-semibold">{{ $t('classHub.tabs.tests') }}</h2>
          <button :class="addBtn" @click="router.push({ path: '/teacher/tests/new', query: { class_id: classId } })">+ {{ $t('classHub.add.test') }}</button>
        </template>
      </ClassItemList>

      <!-- Assignments -->
      <ClassItemList v-else-if="active === 'assignments'" :items="assignmentItems" :empty="$t('classHub.empty.assignments')">
        <template #header>
          <h2 class="text-foreground font-semibold">{{ $t('classHub.tabs.assignments') }}</h2>
          <button :class="addBtn" @click="router.push({ path: '/teacher/tests', query: { class_id: classId, new: 'assignment' } })">+ {{ $t('classHub.add.assignment') }}</button>
        </template>
      </ClassItemList>

      <!-- Lessons -->
      <ClassItemList v-else-if="active === 'lessons'" :items="lessonItems" :empty="$t('classHub.empty.lessons')">
        <template #header>
          <h2 class="text-foreground font-semibold">{{ $t('classHub.tabs.lessons') }}</h2>
          <button :class="addBtn" @click="router.push({ path: '/teacher/lessons', query: { class_id: classId, new: '1' } })">+ {{ $t('classHub.add.lesson') }}</button>
        </template>
      </ClassItemList>

      <!-- Vocabulary sets -->
      <ClassItemList v-else-if="active === 'vocab'" :items="vocabItems" :empty="$t('classHub.empty.vocab')">
        <template #header>
          <h2 class="text-foreground font-semibold">{{ $t('classHub.tabs.vocab') }}</h2>
          <button :class="addBtn" @click="router.push({ path: '/teacher/vocabulary', query: { class_id: classId, new: '1' } })">+ {{ $t('classHub.add.vocab') }}</button>
        </template>
      </ClassItemList>

      <!-- Flashcard decks (created right here) -->
      <ClassItemList v-else-if="active === 'decks'" :items="deckItems" :empty="$t('classHub.empty.decks')">
        <template #header>
          <h2 class="text-foreground font-semibold">{{ $t('classHub.tabs.decks') }}</h2>
          <button :class="addBtn" @click="openDeck(null)">+ {{ $t('classHub.add.deck') }}</button>
        </template>
        <template #actions="{ item }">
          <button class="text-muted-foreground hover:text-foreground rounded-lg px-2 py-1 text-sm" @click="openDeck(Number(item.key))">{{ $t('common.edit') }}</button>
          <button class="text-destructive hover:bg-destructive/10 rounded-lg px-2 py-1 text-sm" @click="removeDeck(Number(item.key))">{{ $t('common.delete') }}</button>
        </template>
      </ClassItemList>

      <!-- Activity (stored in activity_logs) -->
      <ClassItemList v-else-if="active === 'activity'" :items="activityItems" :empty="$t('classHub.empty.activity')">
        <template #header>
          <h2 class="text-foreground font-semibold">{{ $t('classHub.tabs.activity') }}</h2>
          <span class="text-muted-foreground text-xs">{{ $t('classHub.activityHint') }}</span>
        </template>
      </ClassItemList>

      <ClassDeckModal :show="showDeck" :class-id="classId" :deck="editingDeck" @close="showDeck = false" @saved="reload" />
    </template>

    <!-- Class not found -->
    <div v-else class="flex flex-col items-center justify-center py-20 text-center">
      <p class="text-muted-foreground">{{ $t('teacher.classDetail.classNotFound') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Copy, UserMinus, Users } from '@/components/icons'
import ClassItemList from '@/components/class/ClassItemList.vue'
import type { ClassItem } from '@/components/class/ClassItemList.vue'
import ClassDeckModal from '@/components/class/ClassDeckModal.vue'
import { useToast } from '@/composables/useToast'
import { api } from '@/utils/api'
import type { ClassHub, ClassHubStudent } from '@/types/class'
import type { ActivityItem, FlashcardDeckData } from '@/types/content'

type TabKey = 'students' | 'tests' | 'assignments' | 'lessons' | 'vocab' | 'decks' | 'activity'

const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n()
const toast = useToast()

const classId = Number(route.params.id)
const loading = ref(true)
const hub = ref<ClassHub | null>(null)
const activity = ref<ActivityItem[]>([])
const active = ref<TabKey>('students')
const showDeck = ref(false)
const editingDeck = ref<FlashcardDeckData | null>(null)

const addBtn =
  'bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-3 py-2 text-sm font-medium transition-colors'

async function reload() {
  try {
    hub.value = await api.getClassHub(classId)
    // The activity feed is secondary: a failure must not hide the class.
    activity.value = await api.getClassActivity(classId).catch(() => [] as ActivityItem[])
  } catch {
    hub.value = null
    toast.error(t('teacher.classDetail.toast.loadFailed'))
  } finally {
    loading.value = false
  }
}
onMounted(reload)

const tabs = computed(() => {
  const h = hub.value
  return [
    { key: 'students' as const, icon: '👥', label: t('classHub.tabs.students'), count: h?.students?.length ?? 0 },
    { key: 'tests' as const, icon: '📝', label: t('classHub.tabs.tests'), count: h?.tests.length ?? 0 },
    { key: 'assignments' as const, icon: '📎', label: t('classHub.tabs.assignments'), count: h?.assignments.length ?? 0 },
    { key: 'lessons' as const, icon: '📖', label: t('classHub.tabs.lessons'), count: h?.lessons.length ?? 0 },
    { key: 'vocab' as const, icon: '🔤', label: t('classHub.tabs.vocab'), count: h?.vocab_sets.length ?? 0 },
    { key: 'decks' as const, icon: '🗂️', label: t('classHub.tabs.decks'), count: h?.decks.length ?? 0 },
    { key: 'activity' as const, icon: '🕘', label: t('classHub.tabs.activity'), count: activity.value.length },
  ]
})

const published = (on: boolean) => (on ? t('classHub.published') : t('classHub.draft'))
const tone = (on: boolean) => (on ? ('ok' as const) : ('muted' as const))

const testItems = computed<ClassItem[]>(() =>
  (hub.value?.tests ?? []).map((x) => ({
    key: x.id, icon: '📝', title: x.title,
    meta: [t('classHub.questionsN', { n: x.question_count }), x.time_limit ? t('classHub.minutesN', { n: x.time_limit }) : ''].filter(Boolean).join(' · '),
    badge: published(x.is_published), badgeTone: tone(x.is_published),
    to: `/teacher/tests/${x.id}/results`,
  })),
)
const assignmentItems = computed<ClassItem[]>(() =>
  (hub.value?.assignments ?? []).map((x) => ({
    key: x.id, icon: '📎', title: x.title,
    meta: x.attachment_name || x.description || '',
    badge: published(x.is_published), badgeTone: tone(x.is_published),
  })),
)
const lessonItems = computed<ClassItem[]>(() =>
  (hub.value?.lessons ?? []).map((x) => ({
    key: x.id, icon: '📖', title: x.title, meta: `${x.category} · ${x.difficulty}`,
    badge: published(x.is_published), badgeTone: tone(x.is_published),
  })),
)
const vocabItems = computed<ClassItem[]>(() =>
  (hub.value?.vocab_sets ?? []).map((x) => ({
    key: x.id, icon: '🔤', title: x.name, meta: `${t('classHub.wordsN', { n: x.word_count })} · ${x.language} · ${x.level}`,
    badge: published(x.is_published), badgeTone: tone(x.is_published),
  })),
)
const deckItems = computed<ClassItem[]>(() =>
  (hub.value?.decks ?? []).map((x) => ({
    key: x.id, icon: '🗂️', title: x.title, meta: `${t('classHub.cardsN', { n: x.card_count })} · ${x.category}`,
  })),
)
const activityItems = computed<ClassItem[]>(() =>
  activity.value.map((a) => ({
    key: a.id, icon: '🕘', title: a.summary,
    meta: `${a.actor ? a.actor.name || a.actor.email : '—'} · ${new Date(a.created_at).toLocaleString(locale.value, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
  })),
)

async function openDeck(id: number | null) {
  editingDeck.value = null
  if (id !== null) {
    try {
      editingDeck.value = await api.getFlashcardDeck(id)
    } catch {
      toast.error(t('classHub.deckModal.failed'))
      return
    }
  }
  showDeck.value = true
}

async function removeDeck(id: number) {
  if (!window.confirm(t('classHub.confirmDeleteDeck'))) return
  try {
    await api.deleteFlashcardDeck(id)
    await reload()
  } catch {
    toast.error(t('classHub.deckModal.failed'))
  }
}

const copyCode = () => {
  const code = hub.value?.class.class_code
  if (!code) return
  navigator.clipboard?.writeText(code).catch(() => {})
  toast.success(t('teacher.classDetail.toast.codeCopied'))
}

const getInitials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(locale.value, { month: 'short', day: 'numeric', year: 'numeric' })

const handleRemoveStudent = async (student: ClassHubStudent) => {
  try {
    await api.removeStudent(classId, student.id)
    await reload()
    toast.success(t('teacher.classDetail.toast.studentRemoved'))
  } catch {
    toast.error(t('teacher.classDetail.toast.removeFailed'))
  }
}
</script>
