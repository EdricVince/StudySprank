<template>
  <div class="bg-card border-border rounded-2xl border">
    <div v-if="$slots.header" class="border-border flex flex-wrap items-center justify-between gap-3 border-b p-4">
      <slot name="header" />
    </div>

    <ul v-if="items.length" class="divide-border divide-y">
      <li v-for="item in items" :key="item.key" class="flex items-center gap-4 p-4">
        <component
          :is="item.to ? 'router-link' : 'div'"
          :to="item.to"
          class="flex min-w-0 flex-1 items-center gap-4"
          :class="item.to ? 'group' : ''"
        >
          <div class="bg-primary/10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl">{{ item.icon }}</div>
          <div class="min-w-0 flex-1">
            <p class="text-foreground truncate font-medium" :class="item.to ? 'group-hover:text-primary transition-colors' : ''">{{ item.title }}</p>
            <p v-if="item.meta" class="text-muted-foreground truncate text-sm">{{ item.meta }}</p>
          </div>
          <span
            v-if="item.badge"
            class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
            :class="item.badgeTone === 'ok' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-secondary text-muted-foreground'"
          >{{ item.badge }}</span>
        </component>
        <slot name="actions" :item="item" />
      </li>
    </ul>

    <div v-else class="p-10 text-center">
      <p class="text-muted-foreground text-sm">{{ empty }}</p>
      <slot name="empty" />
    </div>
  </div>
</template>

<script setup lang="ts">
export interface ClassItem {
  key: string | number
  icon: string
  title: string
  meta?: string
  badge?: string
  badgeTone?: 'ok' | 'muted'
  /** Makes the whole row a link. */
  to?: string
  /** The original record, handed back through the `actions` slot. */
  data?: unknown
}

defineProps<{ items: ClassItem[]; empty: string }>()
</script>
