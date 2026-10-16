<template>
  <div
    class="quiz-card bg-card border-border group cursor-pointer overflow-hidden rounded-xl border p-5 transition-all duration-200 hover:border-primary/30 hover:shadow-md"
    :style="{ animationDelay: `${index * 50}ms` }"
    @click="$emit('click')"
  >
    <!-- Icon -->
    <div class="bg-primary/10 mb-3 flex h-10 w-10 items-center justify-center rounded-lg">
      <component :is="mode.icon" class="text-primary h-5 w-5" />
    </div>

    <!-- Title & Description -->
    <h3 class="text-foreground mb-1 text-sm font-semibold">{{ mode.title }}</h3>
    <p class="text-muted-foreground mb-3 line-clamp-2 text-xs">{{ mode.description }}</p>

    <!-- Play Button -->
    <div class="flex items-center justify-between">
      <span class="text-muted-foreground text-xs">Start</span>
      <div class="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-105">
        <Play class="h-4 w-4" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {} from 'vue'
import { Play } from '@/components/icons'
import type { QuizMode } from '@/types/quiz'

interface Props {
  mode: QuizMode
  index?: number
}

withDefaults(defineProps<Props>(), {
  index: 0,
})

defineEmits<{
  click: []
}>()

</script>

<style scoped>
.quiz-card {
  animation: fadeInUp 0.5s ease-out forwards;
  opacity: 0;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
