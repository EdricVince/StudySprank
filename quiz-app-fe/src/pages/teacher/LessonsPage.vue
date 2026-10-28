<template>
  <div class="p-6 lg:p-8">
    <!-- Header -->
    <TeacherPageHeader :title="$t('teacher.lessons.title')" :subtitle="$t('teacher.lessons.subtitle')" :icon="GraduationCap">
      <template #actions>
        <button
          class="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium shadow-sm transition-colors"
          @click="openCreate"
        >
          <Plus class="h-4 w-4" />
          {{ $t('teacher.lessons.createLesson') }}
        </button>
      </template>
    </TeacherPageHeader>

    <!-- Stats -->
    <TeacherStatRow :stats="stats" />

    <!-- Filter Bar -->
    <div class="mb-6 flex flex-col gap-3 sm:flex-row">
      <div class="relative flex-1">
        <Search class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="$t('teacher.lessons.searchPlaceholder')"
          class="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-xl border py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div class="flex gap-2">
        <button
          v-for="f in statusFilters"
          :key="f.value"
          class="rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
          :class="statusFilter === f.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'"
          @click="statusFilter = f.value"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <Loader2 class="text-primary h-8 w-8 animate-spin" />
    </div>

    <!-- Load error -->
    <div v-else-if="loadError" class="bg-destructive/10 text-destructive rounded-2xl p-6 text-center text-sm">
      {{ loadError }}
      <button class="ml-2 underline" @click="load">{{ $t('teacher.lessons.retry') }}</button>
    </div>

    <!-- Lessons List -->
    <div v-else-if="filteredLessons.length > 0" class="space-y-4">
      <div
        v-for="lesson in filteredLessons"
        :key="lesson.id"
        class="bg-card border-border rounded-2xl border p-6 transition-all hover:shadow-md"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div class="bg-primary/10 flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-2xl">
            {{ skillEmoji(lesson.category) }}
          </div>

          <div class="min-w-0 flex-1">
            <div class="mb-2 flex flex-wrap items-center gap-2">
              <h3 class="text-foreground font-semibold">{{ lesson.title }}</h3>
              <span class="rounded-full px-2.5 py-0.5 text-xs font-medium" :class="lesson.is_published ? 'bg-chart-2/10 text-chart-2' : 'bg-secondary text-muted-foreground'">
                {{ lesson.is_published ? $t('teacher.lessons.publishedBadge') : $t('teacher.lessons.draftBadge') }}
              </span>
            </div>
            <p class="text-muted-foreground mb-3 line-clamp-2 text-sm">{{ lesson.description }}</p>
            <div class="flex flex-wrap items-center gap-3 text-xs">
              <span class="bg-secondary text-muted-foreground flex items-center gap-1 rounded-full px-2 py-0.5 capitalize">
                <BookOpen class="h-3 w-3" />
                {{ lesson.category }}
              </span>
              <span class="bg-primary/10 text-primary flex items-center gap-1 rounded-full px-2 py-0.5">
                <GraduationCap class="h-3 w-3" />
                {{ lesson.difficulty }}
              </span>
              <span class="text-muted-foreground flex items-center gap-1">
                {{ className(lesson.class_id) }}
              </span>
            </div>
          </div>

          <div class="flex shrink-0 gap-2">
            <button
              class="bg-secondary hover:bg-secondary/80 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
              :title="$t('teacher.lessons.previewContent')"
              @click="openView(lesson)"
            >
              <Eye class="h-4 w-4" />
            </button>
            <button
              class="rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
              :class="lesson.is_published ? 'bg-chart-2/15 text-chart-2 hover:bg-chart-2/25' : 'bg-primary text-primary-foreground hover:bg-primary/90'"
              @click="togglePublish(lesson)"
            >
              {{ lesson.is_published ? $t('teacher.lessons.unpublish') : $t('teacher.lessons.publish') }}
            </button>
            <button
              class="hover:bg-destructive/10 rounded-xl p-2.5 transition-colors"
              @click="confirmDelete(lesson)"
            >
              <Trash2 class="text-destructive h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="flex flex-col items-center justify-center py-20 text-center">
      <div class="bg-secondary mb-4 flex h-20 w-20 items-center justify-center rounded-2xl">
        <GraduationCap class="text-muted-foreground h-10 w-10" />
      </div>
      <h3 class="text-foreground mb-2 text-lg font-semibold">{{ $t('teacher.lessons.noLessons') }}</h3>
      <p class="text-muted-foreground mb-6 max-w-sm text-sm">{{ $t('teacher.lessons.noLessonsDesc') }}</p>
      <button
        class="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium transition-colors"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" />
        {{ $t('teacher.lessons.createFirst') }}
      </button>
    </div>

    <!-- Create Modal (Manual | AI) -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showModal = false" />
          <div class="bg-card border-border relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border shadow-xl">
            <div class="border-border flex items-center justify-between border-b p-6">
              <h3 class="text-foreground text-lg font-semibold">{{ $t('teacher.lessons.modal.createTitle') }}</h3>
              <button class="text-muted-foreground hover:text-foreground" @click="showModal = false">
                <X class="h-5 w-5" />
              </button>
            </div>

            <!-- Mode tabs -->
            <div class="border-border flex gap-2 border-b px-6 py-3">
              <button
                class="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                :class="mode === 'ai' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'"
                @click="mode = 'ai'"
              >
                <Sparkles class="h-4 w-4" />
                {{ $t('teacher.lessons.modal.tabAi') }}
              </button>
              <button
                class="flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                :class="mode === 'manual' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'"
                @click="mode = 'manual'"
              >
                <Pencil class="h-4 w-4" />
                {{ $t('teacher.lessons.modal.tabManual') }}
              </button>
            </div>

            <div class="flex-1 space-y-4 overflow-y-auto p-6">
              <!-- AI MODE -->
              <template v-if="mode === 'ai'">
                <div v-if="!generated" class="space-y-4">
                  <div>
                    <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.lessons.modal.skillTopic') }}</label>
                    <div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      <button
                        v-for="s in LESSON_SKILLS"
                        :key="s.value"
                        class="flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors"
                        :class="aiForm.skill === s.value ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-secondary'"
                        @click="aiForm.skill = s.value"
                      >
                        <span class="text-lg">{{ s.emoji }}</span>
                        {{ s.label }}
                      </button>
                    </div>
                  </div>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.lessons.modal.levelBand') }}</label>
                      <select v-model="aiForm.level" class="border-border bg-background text-foreground w-full rounded-xl border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <optgroup v-for="g in LEVEL_GROUPS" :key="g.label" :label="g.label">
                          <option v-for="lv in g.options" :key="lv" :value="lv">{{ lv }}</option>
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.lessons.modal.language') }}</label>
                      <select v-model="aiForm.language" class="border-border bg-background text-foreground w-full rounded-xl border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <option v-for="l in CONTENT_LANGUAGES" :key="l.value" :value="l.value">{{ l.label }}</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.lessons.modal.topicDetail') }}</label>
                    <input
                      v-model="aiForm.topic"
                      type="text"
                      :placeholder="$t('teacher.lessons.modal.topicPlaceholder')"
                      class="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <button
                    class="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-medium transition-colors disabled:opacity-50"
                    :disabled="generating"
                    @click="generate"
                  >
                    <Loader2 v-if="generating" class="h-4 w-4 animate-spin" />
                    <Sparkles v-else class="h-4 w-4" />
                    {{ generating ? $t('teacher.lessons.modal.generating') : $t('teacher.lessons.modal.generateLesson') }}
                  </button>
                </div>

                <!-- AI preview (editable) -->
                <div v-else class="space-y-4">
                  <div class="bg-primary/5 border-primary/20 flex items-center gap-2 rounded-xl border p-3 text-sm text-primary">
                    <Sparkles class="h-4 w-4 shrink-0" />
                    {{ $t('teacher.lessons.modal.genSummary', { v: generated.content.vocabulary.length, q: generated.content.quiz.length, c: generated.content.comprehension.length }) }}
                  </div>
                  <div>
                    <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.lessons.modal.titleLabel') }}</label>
                    <input v-model="generated.title" type="text" class="border-border bg-background text-foreground w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.lessons.modal.descriptionLabel') }}</label>
                    <textarea v-model="generated.description" rows="2" class="border-border bg-background text-foreground w-full resize-none rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                  <div>
                    <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.lessons.modal.assignClass') }}</label>
                    <select v-model="aiForm.class_id" class="border-border bg-background text-foreground w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option :value="null">{{ $t('teacher.lessons.modal.noClass') }}</option>
                      <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
                    </select>
                  </div>
                  <!-- Content preview -->
                  <div class="border-border max-h-40 space-y-1.5 overflow-y-auto rounded-xl border p-3 text-sm">
                    <p v-for="(w, i) in generated.content.vocabulary" :key="'v'+i" class="text-muted-foreground">
                      <span class="text-foreground font-medium">{{ w.term }}</span> — {{ w.definition }}
                    </p>
                  </div>
                  <button class="text-muted-foreground text-sm underline" @click="generated = null">{{ $t('teacher.lessons.modal.generateAgain') }}</button>
                </div>
              </template>

              <!-- MANUAL MODE -->
              <template v-else>
                <div>
                  <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.lessons.modal.manualTitle') }}</label>
                  <input v-model="manualForm.title" type="text" :placeholder="$t('teacher.lessons.modal.manualTitlePlaceholder')" class="border-border bg-background text-foreground placeholder:text-muted-foreground w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.lessons.modal.skill') }}</label>
                    <select v-model="manualForm.category" class="border-border bg-background text-foreground w-full rounded-xl border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option v-for="s in LESSON_SKILLS" :key="s.value" :value="s.value">{{ s.label }}</option>
                    </select>
                  </div>
                  <div>
                    <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.lessons.modal.level') }}</label>
                    <select v-model="manualForm.difficulty" class="border-border bg-background text-foreground w-full rounded-xl border px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <optgroup v-for="g in LEVEL_GROUPS" :key="g.label" :label="g.label">
                        <option v-for="lv in g.options" :key="lv" :value="lv">{{ lv }}</option>
                      </optgroup>
                    </select>
                  </div>
                </div>
                <div>
                  <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.lessons.modal.assignClass') }}</label>
                  <select v-model="manualForm.class_id" class="border-border bg-background text-foreground w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                    <option :value="null">{{ $t('teacher.lessons.modal.noClass') }}</option>
                    <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                </div>
                <div>
                  <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.lessons.modal.descriptionLabel') }}</label>
                  <textarea v-model="manualForm.description" rows="2" :placeholder="$t('teacher.lessons.modal.descPlaceholder')" class="border-border bg-background text-foreground placeholder:text-muted-foreground w-full resize-none rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <div class="mb-1.5 flex items-center justify-between">
                    <label class="text-foreground block text-sm font-medium">{{ $t('teacher.lessons.modal.vocabulary') }}</label>
                    <button class="text-primary flex items-center gap-1 text-xs font-medium" @click="addManualWord">
                      <Plus class="h-3.5 w-3.5" /> {{ $t('teacher.lessons.modal.addWord') }}
                    </button>
                  </div>
                  <div v-if="manualForm.vocabulary.length" class="space-y-2">
                    <div v-for="(w, i) in manualForm.vocabulary" :key="i" class="flex items-center gap-2">
                      <input v-model="w.term" :placeholder="$t('teacher.lessons.modal.term')" class="border-border bg-background text-foreground min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      <input v-model="w.definition" :placeholder="$t('teacher.lessons.modal.definition')" class="border-border bg-background text-foreground min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      <button class="text-muted-foreground hover:text-destructive shrink-0 p-1" @click="removeManualWord(i)"><X class="h-4 w-4" /></button>
                    </div>
                  </div>
                  <p v-else class="text-muted-foreground text-xs">{{ $t('teacher.lessons.modal.noWords') }}</p>
                </div>
              </template>
            </div>

            <div class="border-border flex gap-3 border-t p-6">
              <button class="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex-1 rounded-xl py-3 font-medium transition-colors" @click="showModal = false">{{ $t('teacher.lessons.modal.cancel') }}</button>
              <button
                v-if="mode === 'ai'"
                class="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-xl py-3 font-medium transition-colors disabled:opacity-50"
                :disabled="!generated || saving"
                @click="saveAiLesson"
              >
                {{ saving ? $t('teacher.lessons.modal.saving') : $t('teacher.lessons.modal.saveLesson') }}
              </button>
              <button
                v-else
                class="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-xl py-3 font-medium transition-colors disabled:opacity-50"
                :disabled="!manualForm.title.trim() || saving"
                @click="saveManual"
              >
                {{ saving ? $t('teacher.lessons.modal.saving') : $t('teacher.lessons.modal.createLessonBtn') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- View Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showView && viewing" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showView = false" />
          <div class="bg-card border-border relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border shadow-xl">
            <div class="border-border flex items-center justify-between border-b p-6">
              <div>
                <h3 class="text-foreground text-lg font-semibold">{{ viewing.title }}</h3>
                <p class="text-muted-foreground text-xs capitalize">{{ viewing.category }} · {{ viewing.difficulty }}</p>
              </div>
              <button class="text-muted-foreground hover:text-foreground" @click="showView = false"><X class="h-5 w-5" /></button>
            </div>
            <div class="flex-1 space-y-5 overflow-y-auto p-6 text-sm">
              <p v-if="viewing.description" class="text-muted-foreground">{{ viewing.description }}</p>
              <div v-if="viewing.content?.vocabulary?.length">
                <h4 class="text-foreground mb-2 font-semibold">{{ $t('teacher.lessons.modal.vocabulary') }}</h4>
                <div class="space-y-1.5">
                  <p v-for="(w, i) in viewing.content.vocabulary" :key="i" class="text-muted-foreground">
                    <span class="text-foreground font-medium">{{ w.term }}</span> — {{ w.definition }}
                    <span v-if="w.example" class="block text-xs italic">"{{ w.example }}"</span>
                  </p>
                </div>
              </div>
              <div v-if="viewing.content?.quiz?.length">
                <h4 class="text-foreground mb-2 font-semibold">{{ $t('teacher.lessons.view.quiz') }}</h4>
                <div class="space-y-2">
                  <div v-for="(q, i) in viewing.content.quiz" :key="i" class="border-border rounded-lg border p-3">
                    <p class="text-foreground font-medium">{{ i + 1 }}. {{ q.question }}</p>
                    <p v-for="(o, oi) in q.options" :key="oi" :class="oi === q.correct ? 'text-chart-2 font-medium' : 'text-muted-foreground'">
                      {{ String.fromCharCode(65 + oi) }}. {{ o }}
                    </p>
                  </div>
                </div>
              </div>
              <div v-if="viewing.content?.comprehension?.length">
                <h4 class="text-foreground mb-2 font-semibold">{{ $t('teacher.lessons.view.comprehension') }}</h4>
                <div class="space-y-1.5">
                  <p v-for="(c, i) in viewing.content.comprehension" :key="i" class="text-muted-foreground">
                    <span class="text-foreground font-medium">{{ $t('teacher.lessons.view.q') }}</span> {{ c.question }}<br />
                    <span class="text-foreground font-medium">{{ $t('teacher.lessons.view.a') }}</span> {{ c.answer }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div class="fixed inset-0 bg-black/50 backdrop-blur-sm" @click="showDeleteModal = false" />
          <div class="bg-card border-border relative z-10 w-full max-w-sm rounded-2xl border p-6 shadow-xl">
            <div class="bg-destructive/10 mb-4 flex h-12 w-12 items-center justify-center rounded-2xl">
              <Trash2 class="text-destructive h-6 w-6" />
            </div>
            <h3 class="text-foreground mb-2 font-semibold">{{ $t('teacher.lessons.deleteModal.title') }}</h3>
            <p class="text-muted-foreground mb-6 text-sm">{{ $t('teacher.lessons.deleteModal.message', { title: deletingLesson?.title }) }}</p>
            <div class="flex gap-3">
              <button class="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex-1 rounded-xl py-2.5 font-medium" @click="showDeleteModal = false">{{ $t('teacher.lessons.deleteModal.cancel') }}</button>
              <button class="bg-destructive text-destructive-foreground hover:bg-destructive/90 flex-1 rounded-xl py-2.5 font-medium" @click="deleteLesson">{{ $t('teacher.lessons.deleteModal.delete') }}</button>
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
import TeacherPageHeader from '@/components/teacher/TeacherPageHeader.vue'
import TeacherStatRow from '@/components/teacher/TeacherStatRow.vue'
import { LESSON_SKILLS, LEVEL_GROUPS, CONTENT_LANGUAGES } from '@/data/teachingOptions'
import type { LessonData, LessonContentData, GeneratedLessonData, TeacherClassData } from '@/types/content'
import { Plus, Search, BookOpen, GraduationCap, FileText, Pencil, Trash2, X, Sparkles, Loader2Icon as Loader2, Eye } from '@/components/icons'

const toast = useToast()
const { t } = useI18n()
const { locale } = useLocale()

const lessons = ref<LessonData[]>([])
const classes = ref<TeacherClassData[]>([])
const loading = ref(true)
const loadError = ref('')

const searchQuery = ref('')
const statusFilter = ref<'all' | 'published' | 'draft'>('all')
const statusFilters = computed(() => [
  { value: 'all' as const, label: t('teacher.lessons.filters.all') },
  { value: 'published' as const, label: t('teacher.lessons.filters.published') },
  { value: 'draft' as const, label: t('teacher.lessons.filters.draft') },
])

const showModal = ref(false)
const mode = ref<'manual' | 'ai'>('ai')
const saving = ref(false)
const generating = ref(false)
const generated = ref<GeneratedLessonData | null>(null)

const manualForm = ref({
  title: '', class_id: null as number | null, category: 'vocabulary',
  difficulty: 'Intermediate (B1)', description: '',
  vocabulary: [] as { term: string; definition: string; example: string }[],
})
const aiForm = ref({ skill: 'vocabulary', level: 'Intermediate (B1)', language: 'en', topic: '', class_id: null as number | null })

const showView = ref(false)
const viewing = ref<LessonData | null>(null)
const showDeleteModal = ref(false)
const deletingLesson = ref<LessonData | null>(null)

const stats = computed(() => [
  { label: t('teacher.lessons.stats.total'), value: lessons.value.length, icon: GraduationCap, color: 'text-primary', bg: 'bg-primary/10' },
  { label: t('teacher.lessons.stats.published'), value: lessons.value.filter(l => l.is_published).length, icon: FileText, color: 'text-chart-2', bg: 'bg-chart-2/10' },
  { label: t('teacher.lessons.stats.drafts'), value: lessons.value.filter(l => !l.is_published).length, icon: Pencil, color: 'text-chart-3', bg: 'bg-chart-3/10' },
  { label: t('teacher.lessons.stats.classes'), value: classes.value.length, icon: BookOpen, color: 'text-chart-1', bg: 'bg-chart-1/10' },
])

const filteredLessons = computed(() => {
  let list = lessons.value
  if (statusFilter.value === 'published') list = list.filter(l => l.is_published)
  if (statusFilter.value === 'draft') list = list.filter(l => !l.is_published)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(l => l.title.toLowerCase().includes(q) || (l.description ?? '').toLowerCase().includes(q))
  }
  return list
})

const skillEmoji = (skill: string) => LESSON_SKILLS.find(s => s.value === skill)?.emoji ?? '📖'
const className = (classId: number | null) => classId == null ? t('teacher.lessons.public') : (classes.value.find(c => c.id === classId)?.name ?? t('teacher.lessons.classFallback'))

const errMsg = (e: unknown, fallback: string) => e instanceof ApiError ? e.errorMessage : fallback

const load = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const [ls, cs] = await Promise.all([api.getLessons(), api.getClasses()])
    lessons.value = ls
    classes.value = cs as TeacherClassData[]
  } catch (e) {
    loadError.value = errMsg(e, t('teacher.lessons.toast.loadFailed'))
  } finally {
    loading.value = false
  }
}
// Opened from a class page: ?class_id=5&new=1 pre-selects the class and opens the form.
const route = useRoute()
const presetClass = () => Number(route.query.class_id) || null
onMounted(async () => {
  await load()
  if (route.query.new) openCreate()
})

const openCreate = () => {
  mode.value = 'ai'
  generated.value = null
  manualForm.value = { title: '', class_id: presetClass(), category: 'vocabulary', difficulty: 'Intermediate (B1)', description: '', vocabulary: [] }
  aiForm.value = { skill: 'vocabulary', level: 'Intermediate (B1)', language: 'en', topic: '', class_id: presetClass() }
  showModal.value = true
}

const generate = async () => {
  generating.value = true
  try {
    generated.value = await api.generateLesson({
      skill: aiForm.value.skill,
      level: aiForm.value.level,
      language: aiForm.value.language,
      meaningLanguage: locale.value as string,
      topic: aiForm.value.topic || undefined,
    })
  } catch (e) {
    toast.error(errMsg(e, t('teacher.lessons.toast.aiFailed')))
  } finally {
    generating.value = false
  }
}

const saveAiLesson = async () => {
  if (!generated.value) return
  saving.value = true
  try {
    const created = await api.createLesson({
      title: generated.value.title,
      description: generated.value.description,
      category: generated.value.category,
      difficulty: generated.value.difficulty,
      class_id: aiForm.value.class_id ?? undefined,
      content: generated.value.content,
    })
    lessons.value.unshift(created)
    toast.success(t('teacher.lessons.toast.created'))
    showModal.value = false
  } catch (e) {
    toast.error(errMsg(e, t('teacher.lessons.toast.saveFailed')))
  } finally {
    saving.value = false
  }
}

const addManualWord = () => manualForm.value.vocabulary.push({ term: '', definition: '', example: '' })
const removeManualWord = (i: number) => manualForm.value.vocabulary.splice(i, 1)

const saveManual = async () => {
  if (!manualForm.value.title.trim() || saving.value) return
  saving.value = true
  try {
    const content: LessonContentData = {
      vocabulary: manualForm.value.vocabulary.filter(w => w.term.trim()),
      quiz: [],
      comprehension: [],
    }
    const created = await api.createLesson({
      title: manualForm.value.title.trim(),
      description: manualForm.value.description || undefined,
      category: manualForm.value.category,
      difficulty: manualForm.value.difficulty,
      class_id: manualForm.value.class_id ?? undefined,
      content,
    })
    lessons.value.unshift(created)
    toast.success(t('teacher.lessons.toast.created'))
    showModal.value = false
  } catch (e) {
    toast.error(errMsg(e, t('teacher.lessons.toast.createFailed')))
  } finally {
    saving.value = false
  }
}

const togglePublish = async (lesson: LessonData) => {
  try {
    const updated = await api.updateLesson(lesson.id, { is_published: !lesson.is_published })
    lesson.is_published = updated.is_published
    toast.success(updated.is_published ? t('teacher.lessons.toast.published') : t('teacher.lessons.toast.unpublished'))
  } catch (e) {
    toast.error(errMsg(e, t('teacher.lessons.toast.updateFailed')))
  }
}

const openView = async (lesson: LessonData) => {
  viewing.value = lesson
  showView.value = true
  if (!lesson.content) {
    try {
      viewing.value = await api.getLessonById(lesson.id)
    } catch { /* keep the summary if content fetch fails */ }
  }
}

const confirmDelete = (lesson: LessonData) => { deletingLesson.value = lesson; showDeleteModal.value = true }
const deleteLesson = async () => {
  if (!deletingLesson.value) return
  const id = deletingLesson.value.id
  try {
    await api.deleteLesson(id)
    lessons.value = lessons.value.filter(l => l.id !== id)
    toast.success(t('teacher.lessons.toast.deleted'))
  } catch (e) {
    toast.error(errMsg(e, t('teacher.lessons.toast.deleteFailed')))
  }
  showDeleteModal.value = false
  deletingLesson.value = null
}
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95); }
</style>
