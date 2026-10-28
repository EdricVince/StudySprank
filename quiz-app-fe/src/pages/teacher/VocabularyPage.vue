<template>
  <div class="p-6 lg:p-8">
    <!-- Header -->
    <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 class="text-foreground text-2xl font-bold">{{ $t('teacher.vocabulary.title') }}</h2>
        <p class="text-muted-foreground mt-1 text-sm">{{ $t('teacher.vocabulary.subtitle') }}</p>
      </div>
      <button
        class="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium transition-colors"
        @click="openCreateSet"
      >
        <Plus class="h-4 w-4" />
        {{ $t('teacher.vocabulary.newSet') }}
      </button>
    </div>

    <!-- Stats -->
    <div class="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <div v-for="stat in stats" :key="stat.label" class="bg-card border-border rounded-2xl border p-5">
        <div class="mb-3 flex items-center justify-between">
          <span class="text-muted-foreground text-sm">{{ stat.label }}</span>
          <div class="rounded-lg p-2" :class="stat.bg">
            <component :is="stat.icon" class="h-4 w-4" :class="stat.color" />
          </div>
        </div>
        <p class="text-foreground text-2xl font-bold">{{ stat.value }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <Loader2 class="text-primary h-8 w-8 animate-spin" />
    </div>
    <div v-else-if="loadError" class="bg-destructive/10 text-destructive rounded-2xl p-6 text-center text-sm">
      {{ loadError }}
      <button class="ml-2 underline" @click="load">{{ $t('teacher.vocabulary.retry') }}</button>
    </div>

    <!-- Two-panel layout -->
    <div v-else class="grid gap-6 lg:grid-cols-5">
      <!-- Left: Vocab Sets -->
      <div class="lg:col-span-2">
        <div class="bg-card border-border rounded-2xl border">
          <div class="border-border flex items-center justify-between border-b px-5 py-4">
            <h3 class="text-foreground font-semibold">{{ $t('teacher.vocabulary.vocabSets') }}</h3>
            <span class="bg-secondary text-muted-foreground rounded-full px-2.5 py-0.5 text-xs">{{ sets.length }}</span>
          </div>

          <div class="divide-border divide-y">
            <!-- A div row (not a button) so the delete button inside is valid HTML. -->
            <div
              v-for="set in sets"
              :key="set.id"
              role="button"
              tabindex="0"
              class="flex w-full cursor-pointer items-center gap-3 px-5 py-4 text-left transition-colors"
              :class="selectedSet?.id === set.id ? 'bg-primary/5' : 'hover:bg-secondary/50'"
              @click="selectedSet = set"
              @keydown.enter="selectedSet = set"
            >
              <div class="bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl">🔤</div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <p class="text-foreground truncate text-sm font-medium">{{ set.name }}</p>
                  <span v-if="set.is_published" class="shrink-0 rounded-full bg-chart-2/15 px-1.5 py-0.5 text-xs font-semibold text-chart-2">{{ $t('teacher.vocabulary.live') }}</span>
                </div>
                <p class="text-muted-foreground text-xs">{{ $t('teacher.vocabulary.wordsMeta', { n: set.words.length, lang: set.language, level: set.level }) }}</p>
              </div>
              <button class="text-muted-foreground hover:text-destructive shrink-0 rounded-lg p-1.5 transition-colors hover:bg-destructive/10" @click.stop="confirmDeleteSet(set)">
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div v-if="sets.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
            <Languages class="text-muted-foreground mb-3 h-10 w-10" />
            <p class="text-muted-foreground text-sm">{{ $t('teacher.vocabulary.noSets') }}</p>
          </div>
        </div>
      </div>

      <!-- Right: Words Editor -->
      <div class="lg:col-span-3">
        <div v-if="selectedSet" class="bg-card border-border rounded-2xl border">
          <div class="border-border border-b px-6 py-4">
            <!-- Publish bar -->
            <div class="mb-3 flex items-center justify-between rounded-xl px-4 py-2.5" :class="selectedSet.is_published ? 'bg-chart-2/10' : 'bg-secondary/50'">
              <div class="flex items-center gap-2">
                <component :is="selectedSet.is_published ? CheckCircle : Globe" class="h-4 w-4" :class="selectedSet.is_published ? 'text-chart-2' : 'text-muted-foreground'" />
                <span class="text-sm font-medium" :class="selectedSet.is_published ? 'text-chart-2' : 'text-muted-foreground'">
                  {{ selectedSet.is_published ? $t('teacher.vocabulary.publishedNote') : $t('teacher.vocabulary.draftNote') }}
                </span>
              </div>
              <button
                class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50"
                :class="selectedSet.is_published ? 'bg-chart-2 text-white hover:bg-chart-2/80' : 'bg-primary text-primary-foreground hover:bg-primary/90'"
                :disabled="publishing"
                @click="togglePublish(selectedSet)"
              >
                <component :is="selectedSet.is_published ? EyeOff : Eye" class="h-3.5 w-3.5" />
                {{ selectedSet.is_published ? $t('teacher.vocabulary.unpublish') : $t('teacher.vocabulary.publishToStudents') }}
              </button>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-xl text-xl">🔤</div>
                <div>
                  <h3 class="text-foreground font-semibold">{{ selectedSet.name }}</h3>
                  <p class="text-muted-foreground text-xs">{{ selectedSet.language }} · {{ selectedSet.level }} · {{ className(selectedSet.class_id) }}</p>
                </div>
              </div>
              <button class="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors" @click="addWord">
                <Plus class="h-4 w-4" />
                {{ $t('teacher.vocabulary.addWord') }}
              </button>
            </div>
          </div>

          <!-- Words -->
          <div class="divide-border divide-y">
            <div v-for="(word, idx) in selectedSet.words" :key="idx" class="flex items-center gap-3 px-6 py-3">
              <span class="text-muted-foreground w-6 shrink-0 text-center text-sm">{{ idx + 1 }}</span>
              <input v-model="word.term" type="text" :placeholder="$t('teacher.vocabulary.term')" class="border-border bg-background text-foreground placeholder:text-muted-foreground min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input v-model="word.definition" type="text" :placeholder="$t('teacher.vocabulary.definitionTr')" class="border-border bg-background text-foreground placeholder:text-muted-foreground min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input v-model="word.example" type="text" :placeholder="$t('teacher.vocabulary.exampleOptional')" class="border-border bg-background text-foreground placeholder:text-muted-foreground hidden min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 lg:block" />
              <button class="text-muted-foreground hover:text-destructive shrink-0 rounded-lg p-1.5 transition-colors hover:bg-destructive/10" @click="removeWord(idx)">
                <X class="h-4 w-4" />
              </button>
            </div>
          </div>

          <div v-if="selectedSet.words.length === 0" class="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen class="text-muted-foreground mb-3 h-10 w-10" />
            <p class="text-foreground mb-1 font-medium">{{ $t('teacher.vocabulary.noWords') }}</p>
            <p class="text-muted-foreground mb-4 text-sm">{{ $t('teacher.vocabulary.noWordsDesc') }}</p>
            <button class="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors" @click="addWord">
              <Plus class="h-4 w-4" /> {{ $t('teacher.vocabulary.addFirstWord') }}
            </button>
          </div>

          <!-- Footer -->
          <div class="border-border flex items-center justify-between border-t px-6 py-4">
            <p class="text-muted-foreground text-sm">{{ $t('teacher.vocabulary.wordsCount', { n: selectedSet.words.length }) }}</p>
            <button class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50" :disabled="savingWords" @click="saveWords">
              {{ savingWords ? $t('teacher.vocabulary.saving') : $t('teacher.vocabulary.saveChanges') }}
            </button>
          </div>
        </div>

        <div v-else class="bg-card border-border flex flex-col items-center justify-center rounded-2xl border py-20 text-center">
          <Languages class="text-muted-foreground mb-4 h-14 w-14" />
          <h3 class="text-foreground mb-2 font-semibold">{{ $t('teacher.vocabulary.selectSet') }}</h3>
          <p class="text-muted-foreground max-w-xs text-sm">{{ $t('teacher.vocabulary.selectSetDesc') }}</p>
        </div>
      </div>
    </div>

    <!-- Create Set Modal (Manual | AI) -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showModal = false" />
          <div class="bg-card border-border relative z-10 flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border shadow-xl">
            <div class="border-border flex items-center justify-between border-b p-6">
              <h3 class="text-foreground text-lg font-semibold">{{ $t('teacher.vocabulary.modal.createTitle') }}</h3>
              <button class="text-muted-foreground hover:text-foreground" @click="showModal = false"><X class="h-5 w-5" /></button>
            </div>

            <!-- Mode tabs -->
            <div class="border-border flex gap-2 border-b px-6 py-3">
              <button
                class="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                :class="mode === 'ai' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'"
                @click="mode = 'ai'"
              >
                <Sparkles class="h-4 w-4" /> {{ $t('teacher.vocabulary.modal.tabAi') }}
              </button>
              <button
                class="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                :class="mode === 'manual' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'"
                @click="mode = 'manual'"
              >
                <Pencil class="h-4 w-4" /> {{ $t('teacher.vocabulary.modal.tabManual') }}
              </button>
            </div>

            <div class="flex-1 space-y-4 overflow-y-auto p-6">
              <!-- AI mode -->
              <template v-if="mode === 'ai'">
                <div v-if="!generated" class="space-y-4">
                  <div>
                    <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.vocabulary.modal.topic') }}</label>
                    <input v-model="aiForm.topic" type="text" :placeholder="$t('teacher.vocabulary.modal.topicPlaceholder')" class="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.vocabulary.modal.level') }}</label>
                      <select v-model="aiForm.level" class="border-border bg-background text-foreground w-full rounded-xl border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <optgroup v-for="g in LEVEL_GROUPS" :key="g.label" :label="g.label">
                          <option v-for="lv in g.options" :key="lv" :value="lv">{{ lv }}</option>
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.vocabulary.modal.language') }}</label>
                      <select v-model="aiForm.language" class="border-border bg-background text-foreground w-full rounded-xl border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <option v-for="l in CONTENT_LANGUAGES" :key="l.value" :value="l.value">{{ l.label }}</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.vocabulary.modal.numWords') }}</label>
                    <input v-model.number="aiForm.count" type="number" min="4" max="40" class="border-border bg-background text-foreground w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <button class="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-medium transition-colors disabled:opacity-50" :disabled="generating || !aiForm.topic.trim()" @click="generate">
                    <Loader2 v-if="generating" class="h-4 w-4 animate-spin" />
                    <Sparkles v-else class="h-4 w-4" />
                    {{ generating ? $t('teacher.vocabulary.modal.generating') : $t('teacher.vocabulary.modal.generateWords') }}
                  </button>
                </div>

                <div v-else class="space-y-4">
                  <div class="bg-primary/5 border-primary/20 flex items-center gap-2 rounded-xl border p-3 text-sm text-primary">
                    <Sparkles class="h-4 w-4 shrink-0" /> {{ $t('teacher.vocabulary.modal.genSummary', { n: generated.words.length }) }}
                  </div>
                  <div>
                    <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.vocabulary.modal.setName') }}</label>
                    <input v-model="generated.name" type="text" class="border-border bg-background text-foreground w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.vocabulary.modal.assignClass') }}</label>
                    <select v-model="aiForm.class_id" class="border-border bg-background text-foreground w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option :value="null">{{ $t('teacher.vocabulary.modal.noClass') }}</option>
                      <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
                    </select>
                  </div>
                  <div class="border-border max-h-40 space-y-1.5 overflow-y-auto rounded-xl border p-3 text-sm">
                    <p v-for="(w, i) in generated.words" :key="i" class="text-muted-foreground">
                      <span class="text-foreground font-medium">{{ w.term }}</span> — {{ w.definition }}
                    </p>
                  </div>
                  <button class="text-muted-foreground text-sm underline" @click="generated = null">{{ $t('teacher.vocabulary.modal.generateAgain') }}</button>
                </div>
              </template>

              <!-- Manual mode -->
              <template v-else>
                <div>
                  <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.vocabulary.modal.manualName') }}</label>
                  <input v-model="manualForm.name" type="text" :placeholder="$t('teacher.vocabulary.modal.manualNamePlaceholder')" class="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.vocabulary.modal.language') }}</label>
                    <select v-model="manualForm.language" class="border-border bg-background text-foreground w-full rounded-xl border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option v-for="l in CONTENT_LANGUAGES" :key="l.value" :value="l.value">{{ l.label }}</option>
                    </select>
                  </div>
                  <div>
                    <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.vocabulary.modal.level') }}</label>
                    <select v-model="manualForm.level" class="border-border bg-background text-foreground w-full rounded-xl border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <optgroup v-for="g in LEVEL_GROUPS" :key="g.label" :label="g.label">
                        <option v-for="lv in g.options" :key="lv" :value="lv">{{ lv }}</option>
                      </optgroup>
                    </select>
                  </div>
                </div>
                <div>
                  <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.vocabulary.modal.assignClass') }}</label>
                  <select v-model="manualForm.class_id" class="border-border bg-background text-foreground w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option :value="null">{{ $t('teacher.vocabulary.modal.noClass') }}</option>
                    <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                </div>
              </template>
            </div>

            <div class="border-border flex gap-3 border-t p-6">
              <button class="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex-1 rounded-xl py-3 font-medium transition-colors" @click="showModal = false">{{ $t('teacher.vocabulary.modal.cancel') }}</button>
              <button
                v-if="mode === 'ai'"
                class="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-xl py-3 font-medium transition-colors disabled:opacity-50"
                :disabled="!generated || saving"
                @click="saveAiSet"
              >
                {{ saving ? $t('teacher.vocabulary.saving') : $t('teacher.vocabulary.modal.saveSet') }}
              </button>
              <button
                v-else
                class="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-xl py-3 font-medium transition-colors disabled:opacity-50"
                :disabled="!manualForm.name.trim() || saving"
                @click="saveManualSet"
              >
                {{ saving ? $t('teacher.vocabulary.saving') : $t('teacher.vocabulary.modal.createSet') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Set Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showDeleteModal = false" />
          <div class="bg-card border-border relative z-10 w-full max-w-sm rounded-2xl border p-6 shadow-xl">
            <div class="bg-destructive/10 mb-4 flex h-12 w-12 items-center justify-center rounded-2xl">
              <Trash2 class="text-destructive h-6 w-6" />
            </div>
            <h3 class="text-foreground mb-2 font-semibold">{{ $t('teacher.vocabulary.deleteModal.title') }}</h3>
            <p class="text-muted-foreground mb-6 text-sm">{{ $t('teacher.vocabulary.deleteModal.message', { name: deletingSet?.name }) }}</p>
            <div class="flex gap-3">
              <button class="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex-1 rounded-xl py-2.5 font-medium" @click="showDeleteModal = false">{{ $t('teacher.vocabulary.deleteModal.cancel') }}</button>
              <button class="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex-1 rounded-xl py-2.5 font-medium" @click="deleteSet">{{ $t('teacher.vocabulary.deleteModal.delete') }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { api, ApiError } from '@/utils/api'
import { useToast } from '@/composables/useToast'
import { useLocale } from '@/composables/useLocale'
import { LEVEL_GROUPS, CONTENT_LANGUAGES } from '@/data/teachingOptions'
import type { VocabSetData, TeacherClassData } from '@/types/content'
import { Plus, Trash2, X, BookOpen, Languages, FileText, Globe, Eye, EyeOff, CheckCircle, Sparkles, Loader2Icon as Loader2, Pencil } from '@/components/icons'

const toast = useToast()
const { t } = useI18n()
const { locale } = useLocale()

const sets = ref<VocabSetData[]>([])
const classes = ref<TeacherClassData[]>([])
const loading = ref(true)
const loadError = ref('')
const selectedSet = ref<VocabSetData | null>(null)

const showModal = ref(false)
const mode = ref<'manual' | 'ai'>('ai')
const saving = ref(false)
const savingWords = ref(false)
const publishing = ref(false)
const generating = ref(false)
const generated = ref<{ name: string; words: { term: string; definition: string; example: string }[] } | null>(null)

const manualForm = ref({ name: '', language: 'en', level: 'Intermediate (B1)', class_id: null as number | null })
const aiForm = ref({ topic: '', level: 'Intermediate (B1)', language: 'en', count: 15, class_id: null as number | null })

const showDeleteModal = ref(false)
const deletingSet = ref<VocabSetData | null>(null)

const stats = computed(() => [
  { label: t('teacher.vocabulary.stats.totalSets'), value: sets.value.length, icon: Languages, color: 'text-primary', bg: 'bg-primary/10' },
  { label: t('teacher.vocabulary.stats.totalWords'), value: sets.value.reduce((s, v) => s + v.words.length, 0), icon: BookOpen, color: 'text-chart-2', bg: 'bg-chart-2/10' },
  { label: t('teacher.vocabulary.stats.published'), value: sets.value.filter(s => s.is_published).length, icon: Globe, color: 'text-chart-3', bg: 'bg-chart-3/10' },
  { label: t('teacher.vocabulary.stats.assigned'), value: sets.value.filter(s => s.class_id != null).length, icon: FileText, color: 'text-chart-1', bg: 'bg-chart-1/10' },
])

const labelFor = (code: string) => CONTENT_LANGUAGES.find(l => l.value === code)?.label ?? 'English'
const className = (classId: number | null) => classId == null ? t('teacher.vocabulary.public') : (classes.value.find(c => c.id === classId)?.name ?? t('teacher.vocabulary.classFallback'))
const errMsg = (e: unknown, fallback: string) => e instanceof ApiError ? e.errorMessage : fallback

const load = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const [ss, cs] = await Promise.all([api.getVocabSets(), api.getClasses()])
    sets.value = ss
    classes.value = cs as TeacherClassData[]
    if (selectedSet.value) selectedSet.value = sets.value.find(s => s.id === selectedSet.value!.id) ?? null
  } catch (e) {
    loadError.value = errMsg(e, t('teacher.vocabulary.toast.loadFailed'))
  } finally {
    loading.value = false
  }
}
// Opened from a class page: ?class_id=5&new=1 pre-selects the class and opens the form.
const route = useRoute()
const presetClass = () => Number(route.query.class_id) || null
onMounted(async () => {
  await load()
  if (route.query.new) openCreateSet()
})

const openCreateSet = () => {
  mode.value = 'ai'
  generated.value = null
  manualForm.value = { name: '', language: 'en', level: 'Intermediate (B1)', class_id: presetClass() }
  aiForm.value = { topic: '', level: 'Intermediate (B1)', language: 'en', count: 15, class_id: presetClass() }
  showModal.value = true
}

const generate = async () => {
  if (!aiForm.value.topic.trim()) return
  generating.value = true
  try {
    generated.value = await api.generateVocabSet({
      topic: aiForm.value.topic.trim(),
      level: aiForm.value.level,
      language: aiForm.value.language,
      meaningLanguage: locale.value as string,
      count: aiForm.value.count,
    })
  } catch (e) {
    toast.error(errMsg(e, t('teacher.vocabulary.toast.aiFailed')))
  } finally {
    generating.value = false
  }
}

const saveAiSet = async () => {
  if (!generated.value) return
  saving.value = true
  try {
    const created = await api.createVocabSet({
      name: generated.value.name,
      language: labelFor(aiForm.value.language),
      level: aiForm.value.level,
      class_id: aiForm.value.class_id ?? undefined,
      words: generated.value.words,
    })
    sets.value.unshift(created)
    selectedSet.value = created
    toast.success(t('teacher.vocabulary.toast.created'))
    showModal.value = false
  } catch (e) {
    toast.error(errMsg(e, t('teacher.vocabulary.toast.saveFailed')))
  } finally {
    saving.value = false
  }
}

const saveManualSet = async () => {
  if (!manualForm.value.name.trim() || saving.value) return
  saving.value = true
  try {
    const created = await api.createVocabSet({
      name: manualForm.value.name.trim(),
      language: labelFor(manualForm.value.language),
      level: manualForm.value.level,
      class_id: manualForm.value.class_id ?? undefined,
      words: [],
    })
    sets.value.unshift(created)
    selectedSet.value = created
    toast.success(t('teacher.vocabulary.toast.created'))
    showModal.value = false
  } catch (e) {
    toast.error(errMsg(e, t('teacher.vocabulary.toast.createFailed')))
  } finally {
    saving.value = false
  }
}

const addWord = () => { if (selectedSet.value) selectedSet.value.words.push({ term: '', definition: '', example: '' }) }
const removeWord = (idx: number) => { if (selectedSet.value) selectedSet.value.words.splice(idx, 1) }

const saveWords = async () => {
  if (!selectedSet.value || savingWords.value) return
  savingWords.value = true
  try {
    const words = selectedSet.value.words.filter(w => w.term.trim())
    const updated = await api.updateVocabSet(selectedSet.value.id, { words })
    const idx = sets.value.findIndex(s => s.id === updated.id)
    if (idx !== -1) sets.value[idx] = updated
    selectedSet.value = updated
    toast.success(t('teacher.vocabulary.toast.saved'))
  } catch (e) {
    toast.error(errMsg(e, t('teacher.vocabulary.toast.saveWordsFailed')))
  } finally {
    savingWords.value = false
  }
}

const togglePublish = async (set: VocabSetData) => {
  publishing.value = true
  try {
    const updated = await api.updateVocabSet(set.id, { is_published: !set.is_published })
    set.is_published = updated.is_published
    toast.success(updated.is_published ? t('teacher.vocabulary.toast.published') : t('teacher.vocabulary.toast.unpublished'))
  } catch (e) {
    toast.error(errMsg(e, t('teacher.vocabulary.toast.updateFailed')))
  } finally {
    publishing.value = false
  }
}

const confirmDeleteSet = (set: VocabSetData) => { deletingSet.value = set; showDeleteModal.value = true }
const deleteSet = async () => {
  if (!deletingSet.value) return
  const id = deletingSet.value.id
  try {
    await api.deleteVocabSet(id)
    sets.value = sets.value.filter(s => s.id !== id)
    if (selectedSet.value?.id === id) selectedSet.value = sets.value[0] ?? null
    toast.success(t('teacher.vocabulary.toast.deleted'))
  } catch (e) {
    toast.error(errMsg(e, t('teacher.vocabulary.toast.deleteFailed')))
  }
  showDeleteModal.value = false
  deletingSet.value = null
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95); }
</style>
