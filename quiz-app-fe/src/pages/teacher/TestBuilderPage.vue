<template>
  <div class="p-6 lg:p-8">
    <!-- Back -->
    <button class="text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1.5 text-sm font-medium" @click="router.push('/teacher/tests')">
      <ArrowLeft class="h-4 w-4" /> {{ $t('teacher.testBuilder.back') }}
    </button>

    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-foreground text-2xl font-bold tracking-tight lg:text-3xl">{{ isEditing ? $t('teacher.testBuilder.editTitle') : $t('teacher.testBuilder.createTitle') }}</h1>
      <div class="flex gap-3">
        <Button variant="outline" @click="router.push('/teacher/tests')">{{ $t('teacher.testBuilder.cancel') }}</Button>
        <Button :disabled="!form.title.trim() || saving" @click="save">{{ saving ? $t('teacher.testBuilder.saving') : (isEditing ? $t('teacher.testBuilder.saveChanges') : $t('teacher.testBuilder.createBtn')) }}</Button>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20"><Loader2 class="text-primary h-8 w-8 animate-spin" /></div>

    <div v-else class="grid gap-6 lg:grid-cols-3">
      <!-- Settings + AI -->
      <div class="space-y-6 lg:col-span-1">
        <div class="bg-card border-border space-y-4 rounded-2xl border p-5">
          <h3 class="text-foreground font-semibold">{{ $t('teacher.testBuilder.details') }}</h3>
          <div>
            <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.testBuilder.titleLabel') }}</label>
            <input v-model="form.title" type="text" :placeholder="$t('teacher.testBuilder.titlePlaceholder')" class="border-border bg-background text-foreground w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.testBuilder.description') }}</label>
            <textarea v-model="form.description" rows="2" class="border-border bg-background text-foreground w-full resize-none rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.testBuilder.classLabel') }}</label>
              <select v-model="form.class_id" class="border-border bg-background text-foreground w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option :value="null">{{ $t('teacher.testBuilder.publicOption') }}</option>
                <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div>
              <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.testBuilder.timeLabel') }}</label>
              <input v-model.number="form.time_limit" type="number" min="0" placeholder="—" class="border-border bg-background text-foreground w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <label class="flex cursor-pointer items-center gap-2.5">
            <input v-model="form.is_published" type="checkbox" class="accent-primary h-4 w-4 rounded" />
            <span class="text-foreground text-sm">{{ $t('teacher.testBuilder.publishLabel') }}</span>
          </label>
        </div>

        <!-- AI generate -->
        <div class="bg-card border-border space-y-4 rounded-2xl border p-5">
          <h3 class="text-foreground flex items-center gap-2 font-semibold"><Sparkles class="text-primary h-4 w-4" /> {{ $t('teacher.testBuilder.aiGenerate') }}</h3>
          <div>
            <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.testBuilder.topicLabel') }}</label>
            <input v-model="ai.topic" type="text" :placeholder="$t('teacher.testBuilder.topicPlaceholder')" class="border-border bg-background text-foreground w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.testBuilder.levelLabel') }}</label>
              <select v-model="ai.level" class="border-border bg-background text-foreground w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <optgroup v-for="g in LEVEL_GROUPS" :key="g.label" :label="g.label">
                  <option v-for="lv in g.options" :key="lv" :value="lv">{{ lv }}</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.testBuilder.questionsNum') }}</label>
              <input v-model.number="ai.count" type="number" min="1" max="20" class="border-border bg-background text-foreground w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label class="text-foreground mb-1.5 block text-sm font-medium">{{ $t('teacher.testBuilder.languageLabel') }}</label>
            <select v-model="ai.language" class="border-border bg-background text-foreground w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option v-for="l in CONTENT_LANGUAGES" :key="l.value" :value="l.value">{{ l.label }}</option>
            </select>
          </div>
          <button class="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50" :disabled="generating || !ai.topic.trim()" @click="generate">
            <Loader2 v-if="generating" class="h-4 w-4 animate-spin" />
            <Sparkles v-else class="h-4 w-4" />
            {{ generating ? $t('teacher.testBuilder.generating') : $t('teacher.testBuilder.generateBtn') }}
          </button>
          <p class="text-muted-foreground text-xs">{{ $t('teacher.testBuilder.aiHint') }}</p>
        </div>
      </div>

      <!-- Questions -->
      <div class="space-y-4 lg:col-span-2">
        <div class="flex items-center justify-between">
          <h3 class="text-foreground font-semibold">{{ $t('teacher.testBuilder.questionsHeading') }} ({{ form.questions.length }})</h3>
          <Button variant="outline" size="sm" @click="addQuestion"><Plus class="mr-2 h-4 w-4" /> {{ $t('teacher.testBuilder.addQuestion') }}</Button>
        </div>

        <div v-if="form.questions.length === 0" class="bg-card border-border rounded-2xl border p-10 text-center">
          <HelpCircle class="text-muted-foreground mx-auto mb-3 h-10 w-10" />
          <p class="text-foreground font-medium">{{ $t('teacher.testBuilder.noQuestions') }}</p>
          <p class="text-muted-foreground text-sm">{{ $t('teacher.testBuilder.noQuestionsDesc') }}</p>
        </div>

        <div v-for="(q, qi) in form.questions" :key="qi" class="bg-card border-border rounded-2xl border p-5">
          <div class="mb-3 flex items-start gap-3">
            <span class="bg-primary/10 text-primary mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">{{ qi + 1 }}</span>
            <input v-model="q.question" type="text" :placeholder="$t('teacher.testBuilder.questionPlaceholder')" class="border-border bg-background text-foreground min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <button class="text-muted-foreground hover:text-destructive shrink-0 p-1.5" @click="removeQuestion(qi)"><Trash2 class="h-4 w-4" /></button>
          </div>
          <div class="space-y-2 pl-9">
            <div v-for="(_opt, oi) in q.options" :key="oi" class="flex items-center gap-2">
              <input type="radio" :name="`correct-${qi}`" :checked="q.correct === oi" class="accent-primary h-4 w-4" :title="$t('teacher.testBuilder.markCorrect')" @change="q.correct = oi" />
              <input v-model="q.options[oi]" type="text" :placeholder="$t('teacher.testBuilder.optionPlaceholder', { letter: String.fromCharCode(65 + oi) })" class="border-border bg-background text-foreground min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" :class="q.correct === oi ? 'border-chart-2' : ''" />
              <button v-if="q.options.length > 2" class="text-muted-foreground hover:text-destructive shrink-0 p-1" @click="removeOption(q, oi)"><X class="h-3.5 w-3.5" /></button>
            </div>
            <button v-if="q.options.length < 6" class="text-primary text-xs font-medium" @click="q.options.push('')">{{ $t('teacher.testBuilder.addOption') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { api, ApiError } from '@/utils/api'
import { useToast } from '@/composables/useToast'
import { useLocale } from '@/composables/useLocale'
import { LEVEL_GROUPS, CONTENT_LANGUAGES } from '@/data/teachingOptions'
import type { TestQuestionData, TeacherClassData } from '@/types/content'
import { ArrowLeft, Plus, X, Trash2, Sparkles, HelpCircle, Loader2Icon as Loader2 } from '@/components/icons'
import Button from '@/components/ui/button/Button.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const { t } = useI18n()
const { locale } = useLocale()

const testId = computed(() => (route.params.id ? Number(route.params.id) : null))
const isEditing = computed(() => testId.value !== null)

interface Q { question: string; options: string[]; correct: number; points: number }
const form = ref<{ title: string; description: string; class_id: number | null; time_limit: number | null; is_published: boolean; questions: Q[] }>({
  // ?class_id=5 (from a class page) pre-selects the class for a new test.
  title: '', description: '', class_id: Number(route.query.class_id) || null, time_limit: null, is_published: false, questions: [],
})
const ai = ref({ topic: '', level: 'Beginner (A1)', language: 'en', count: 6 })
const classes = ref<TeacherClassData[]>([])
const loading = ref(false)
const saving = ref(false)
const generating = ref(false)

const errMsg = (e: unknown, fb: string) => (e instanceof ApiError ? e.errorMessage : fb)

const newQuestion = (): Q => ({ question: '', options: ['', '', '', ''], correct: 0, points: 1 })
const addQuestion = () => form.value.questions.push(newQuestion())
const removeQuestion = (i: number) => form.value.questions.splice(i, 1)
const removeOption = (q: Q, oi: number) => {
  q.options.splice(oi, 1)
  if (q.correct >= q.options.length) q.correct = 0
}

const generate = async () => {
  if (!ai.value.topic.trim()) return
  generating.value = true
  try {
    const gen = await api.generateTest({ topic: ai.value.topic.trim(), level: ai.value.level, language: ai.value.language, count: ai.value.count })
    if (!form.value.title.trim()) form.value.title = gen.title
    form.value.questions.push(...gen.questions.map(g => ({ question: g.question, options: g.options, correct: g.correct, points: g.points || 1 })))
    toast.success(t('teacher.testBuilder.toast.added', { n: gen.questions.length }))
  } catch (e) {
    toast.error(errMsg(e, t('teacher.testBuilder.toast.aiFailed')))
  } finally {
    generating.value = false
  }
}

const save = async () => {
  if (!form.value.title.trim() || saving.value) return
  const questions: TestQuestionData[] = form.value.questions
    .filter(q => q.question.trim() && q.options.filter(o => o.trim()).length >= 2)
    .map(q => ({ question: q.question.trim(), options: q.options.map(o => o.trim()).filter(o => o), correct: q.correct, points: q.points || 1 }))
  saving.value = true
  try {
    const body = {
      title: form.value.title.trim(),
      description: form.value.description || undefined,
      class_id: form.value.class_id ?? undefined,
      time_limit: form.value.time_limit || undefined,
      is_published: form.value.is_published,
      questions,
    }
    if (isEditing.value) await api.updateTest(testId.value!, body)
    else await api.createTest(body)
    toast.success(isEditing.value ? t('teacher.testBuilder.toast.updated') : t('teacher.testBuilder.toast.created'))
    router.push('/teacher/tests')
  } catch (e) {
    toast.error(errMsg(e, t('teacher.testBuilder.toast.saveFailed')))
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  ai.value.language = (locale.value as string) || 'en'
  try { classes.value = (await api.getClasses()) as TeacherClassData[] } catch { /* non-critical */ }
  if (isEditing.value) {
    loading.value = true
    try {
      const t = await api.getTest(testId.value!)
      form.value = {
        title: t.title, description: t.description ?? '', class_id: t.class_id,
        time_limit: t.time_limit, is_published: t.is_published,
        questions: (t.questions ?? []).map(q => ({ question: q.question, options: q.options.slice(), correct: q.correct ?? 0, points: q.points || 1 })),
      }
    } catch (e) {
      toast.error(errMsg(e, t('teacher.testBuilder.toast.loadFailed')))
      router.push('/teacher/tests')
    } finally {
      loading.value = false
    }
  }
})
</script>
