<template>
  <div class="adm-page space-y-5 p-6">
    <!-- Header -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="adm-h1">{{ $t('staff.activity.title') }}</h2>
        <p class="adm-text mt-0.5">{{ $t('staff.activity.subtitle') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <select v-model="action" class="adm-input" :aria-label="$t('staff.activity.filter')" @change="load">
          <option v-for="f in filters" :key="f.value" :value="f.value">{{ f.label }}</option>
        </select>
        <button class="adm-btn-ghost" :disabled="loading" @click="load">{{ $t('staff.refresh') }}</button>
      </div>
    </div>

    <div v-if="loading && !items.length" class="space-y-3">
      <div v-for="i in 5" :key="i" class="adm-card h-16 animate-pulse" />
    </div>
    <p v-else-if="failed" class="text-sm text-red-500">{{ $t('staff.activity.loadFailed') }}</p>
    <div v-else-if="!items.length" class="adm-card p-10 text-center">
      <p class="adm-text">{{ $t('staff.activity.empty') }}</p>
    </div>

    <ul v-else class="adm-card adm-divide">
      <li v-for="a in items" :key="a.id" class="flex items-start gap-3 px-5 py-3">
        <div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm" :class="tone(a.action)">
          {{ icon(a.action) }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-foreground text-sm font-medium">{{ a.summary }}</p>
          <p class="adm-meta mt-0.5">
            {{ a.actor ? $t('staff.activity.by', { name: a.actor.name || a.actor.email }) : $t('staff.activity.deletedActor') }}
            <template v-if="a.class_name"> · {{ $t('staff.activity.inClass', { name: a.class_name }) }}</template>
            <template v-else-if="a.class_id"> · {{ $t('staff.activity.inClassId', { id: a.class_id }) }}</template>
          </p>
        </div>
        <div class="adm-meta shrink-0 text-right">
          <div>{{ formatDate(a.created_at) }}</div>
          <code class="adm-code">{{ a.action }}</code>
        </div>
      </li>
    </ul>

    <div v-if="canLoadMore" class="text-center">
      <button class="adm-btn-ghost" :disabled="loadingMore" @click="loadMore">{{ $t('staff.activity.loadMore') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAdminStore } from '@/stores/admin.store'
import type { ActivityItem } from '@/types/content'

const PAGE = 30

const { t, locale } = useI18n()
const adminStore = useAdminStore()

const items = ref<ActivityItem[]>([])
const action = ref('')
const loading = ref(false)
const loadingMore = ref(false)
const failed = ref(false)
const exhausted = ref(false)

// Prefix of the action name: "class" matches class.create, class.join, …
const filters = computed(() =>
  ['', 'class', 'test', 'assignment', 'lesson', 'vocab_set', 'flashcard_deck', 'teacher', 'user'].map((value) => ({
    value,
    label: t(`staff.activity.filters.${value || 'all'}`),
  })),
)
const canLoadMore = computed(() => items.value.length > 0 && !exhausted.value)

const icon = (a: string) =>
  a.startsWith('class') ? '🏫' : a.startsWith('test') ? '📝' : a.startsWith('assignment') ? '📎'
    : a.startsWith('lesson') ? '📖' : a.startsWith('vocab') ? '🔤' : a.startsWith('flashcard') ? '🗂️'
      : a.startsWith('teacher') || a.startsWith('admin') ? '🎓' : '⚙️'

const tone = (a: string) =>
  a.endsWith('.delete') || a === 'user.bulk_delete' ? 'bg-red-500/10'
    : a.endsWith('.create') || a === 'teacher.apply' ? 'bg-emerald-500/10' : 'bg-indigo-500/10'

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(locale.value, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

const query = (before?: number) => ({ limit: PAGE, ...(action.value ? { action: action.value } : {}), ...(before ? { before_id: before } : {}) })

async function load() {
  loading.value = true
  failed.value = false
  try {
    const rows = await adminStore.fetchActivity(query())
    items.value = rows
    exhausted.value = rows.length < PAGE
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  const last = items.value[items.value.length - 1]
  if (!last || loadingMore.value) return
  loadingMore.value = true
  try {
    const rows = await adminStore.fetchActivity(query(last.id))
    items.value = [...items.value, ...rows]
    exhausted.value = rows.length < PAGE
  } finally {
    loadingMore.value = false
  }
}

onMounted(load)
</script>
