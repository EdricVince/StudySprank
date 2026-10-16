<template>
  <div v-bind="$attrs" :class="[$attrs.class]">
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ variant?: string }>(), { variant: 'default' })
</script>
