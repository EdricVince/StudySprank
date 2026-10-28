<template>
  <div class="p-6 lg:p-8">
    <!-- Header -->
    <div class="animate-fade-in-down mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 class="text-foreground text-2xl font-bold tracking-tight lg:text-3xl">{{ $t('classHub.student.title') }}</h1>
        <p class="text-muted-foreground mt-2">{{ $t('classHub.student.subtitle') }}</p>
      </div>
      <button
        type="button"
        class="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium transition-colors"
        @click="showJoin = true"
      >
        <Plus class="h-4 w-4" />
        {{ $t('quizzesPage.joinClass') }}
      </button>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="border-primary h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"></div>
    </div>

    <div v-else-if="!classes.length" class="bg-card border-border flex flex-col items-center justify-center rounded-2xl border p-16 text-center">
      <div class="bg-secondary mb-4 flex h-16 w-16 items-center justify-center rounded-full text-3xl">🏫</div>
      <h3 class="text-foreground mb-2 font-medium">{{ $t('classHub.student.emptyTitle') }}</h3>
      <p class="text-muted-foreground max-w-sm text-sm">{{ $t('classHub.student.emptyDesc') }}</p>
    </div>

    <div v-else class="animate-fade-in-up grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <router-link
        v-for="c in classes"
        :key="c.id"
        :to="`/classes/${c.id}`"
        class="bg-card border-border group rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
      >
        <div class="mb-4 flex items-start justify-between">
          <div class="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-xl text-2xl">🏫</div>
          <span v-if="c.subject" class="bg-secondary text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">{{ c.subject }}</span>
        </div>
        <h3 class="text-foreground group-hover:text-primary line-clamp-2 text-lg font-semibold transition-colors">{{ c.name }}</h3>
        <p class="text-muted-foreground mt-1 line-clamp-2 text-sm">{{ c.description || '' }}</p>
        <p class="text-muted-foreground mt-4 text-xs">{{ $t('classHub.student.classmates', { n: c.student_count ?? 0 }) }}</p>
      </router-link>
    </div>

    <JoinClassModal :show="showJoin" @close="showJoin = false" @joined="load" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Plus } from '@/components/icons'
import JoinClassModal from '@/components/quiz/JoinClassModal.vue'
import { api } from '@/utils/api'
import type { Class } from '@/types/class'

const classes = ref<Class[]>([])
const loading = ref(true)
const showJoin = ref(false)

async function load() {
  try {
    classes.value = (await api.getClasses()) as Class[]
  } catch {
    classes.value = []
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>
