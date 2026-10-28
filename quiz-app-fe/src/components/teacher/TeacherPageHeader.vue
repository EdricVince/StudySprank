<template>
  <div class="animate-fade-in-down mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex min-w-0 items-center gap-4">
      <div
        v-if="icon"
        class="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
      >
        <component :is="icon" class="h-6 w-6" />
      </div>
      <div class="min-w-0">
        <h1 class="text-foreground truncate text-2xl font-bold tracking-tight lg:text-3xl">{{ title }}</h1>
        <p v-if="subtitle" class="text-muted-foreground mt-1 text-sm">{{ subtitle }}</p>
      </div>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

/** The one page heading used by every teacher page: optional icon tile, title, subtitle and an actions slot. */
defineProps<{
  title: string
  subtitle?: string
  icon?: Component
}>()
</script>
