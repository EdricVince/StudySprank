<template>
  <div class="min-h-full">
    <!-- Hero -->
    <div class="relative overflow-hidden">
      <div class="absolute inset-0 bg-linear-to-br from-violet-600/20 via-purple-600/10 to-transparent" />
      <div class="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
      <div class="absolute -bottom-10 -left-10 h-60 w-60 rounded-full bg-purple-500/10 blur-3xl" />
      <div class="relative mx-auto max-w-5xl px-6 py-12">
        <div class="hero-pill-violet mb-0 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold">
          <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-current"></span>
          {{ $t('skills.hub.badge') }}
        </div>
        <h1 class="text-foreground text-4xl font-extrabold leading-tight">{{ $t('skills.hub.title') }}</h1>
        <p class="text-muted-foreground mt-3 text-lg">{{ $t('skills.hub.subtitle') }}</p>
      </div>
    </div>

    <div class="mx-auto max-w-5xl space-y-6 px-6 pb-12">
      <!-- 2x2 skill cards grid -->
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <router-link
          v-for="skill in skills"
          :key="skill.name"
          :to="skill.path"
          class="group relative overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
          :class="skill.cardClass"
        >
          <div class="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" :class="skill.hoverGrad" />
          <div class="relative p-7">
            <div class="mb-5 flex items-start justify-between">
              <div class="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl" :class="skill.iconBg">
                {{ skill.emoji }}
              </div>
              <span class="rounded-full px-3 py-1 text-xs font-bold" :class="skill.badge">{{ $t(`skills.hub.cards.${skill.name}.tag`) }}</span>
            </div>
            <h2 class="text-foreground text-2xl font-extrabold">{{ $t(`skills.hub.cards.${skill.name}.label`) }}</h2>
            <p class="text-muted-foreground mt-1.5 text-sm leading-relaxed">{{ $t(`skills.hub.cards.${skill.name}.desc`) }}</p>

            <!-- Feature list -->
            <ul class="mt-4 space-y-1.5">
              <li v-for="f in ['f1', 'f2', 'f3', 'f4']" :key="f" class="flex items-center gap-2 text-sm" :class="skill.featureColor">
                <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="skill.dot"></span>
                {{ $t(`skills.hub.cards.${skill.name}.${f}`) }}
              </li>
            </ul>

            <!-- CTA -->
            <div class="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold transition-all duration-200 group-hover:scale-[1.02]" :class="skill.btn">
              <span>{{ $t('skills.hub.start') }}</span>
              <svg class="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </div>
        </router-link>
      </div>

      <!-- CEFR level guide -->
      <div class="bg-card border-border rounded-2xl border p-6">
        <h3 class="text-foreground mb-4 text-base font-bold">{{ $t('skills.hub.cefrTitle') }}</h3>
        <div class="grid grid-cols-3 gap-3 sm:grid-cols-6">
          <div v-for="lvl in cefrLevels" :key="lvl.code" class="rounded-xl p-3 text-center" :class="lvl.sec">
            <div class="text-lg font-extrabold">{{ lvl.code }}</div>
            <div class="text-muted-foreground text-xs">{{ $t(`skills.speaking.levels.${lvl.code}`) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Texts come from skills.hub.cards.<name>.* in the locale files.
const skills = [
  {
    name: 'reading',
    path: '/skills/reading',
    emoji: '📖',
    cardClass: 'card-tint-blue',
    hoverGrad: 'bg-linear-to-br from-blue-500/5 to-cyan-500/5',
    iconBg: 'bg-blue-500/15',
    badge: 'cbadge-blue',
    featureColor: 'ct-blue',
    dot: 'bg-blue-400',
    btn: 'bg-linear-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/20',
  },
  {
    name: 'listening',
    path: '/skills/listening',
    emoji: '🎧',
    cardClass: 'card-tint-emerald',
    hoverGrad: 'bg-linear-to-br from-emerald-500/5 to-teal-500/5',
    iconBg: 'bg-emerald-500/15',
    badge: 'cbadge-emerald',
    featureColor: 'ct-emerald',
    dot: 'bg-emerald-400',
    btn: 'bg-linear-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20',
  },
  {
    name: 'writing',
    path: '/skills/writing',
    emoji: '✍️',
    cardClass: 'card-tint-amber',
    hoverGrad: 'bg-linear-to-br from-amber-500/5 to-orange-500/5',
    iconBg: 'bg-amber-500/15',
    badge: 'cbadge-amber',
    featureColor: 'ct-amber',
    dot: 'bg-amber-400',
    btn: 'bg-linear-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/20',
  },
  {
    name: 'speaking',
    path: '/skills/speaking',
    emoji: '🎙️',
    cardClass: 'card-tint-rose',
    hoverGrad: 'bg-linear-to-br from-rose-500/5 to-pink-500/5',
    iconBg: 'bg-rose-500/15',
    badge: 'cbadge-rose',
    featureColor: 'ct-rose',
    dot: 'bg-rose-400',
    btn: 'bg-linear-to-r from-rose-600 to-pink-600 text-white shadow-lg shadow-rose-500/20',
  },
]

const cefrLevels = [
  { code: 'A1', sec: 'sec-red' },
  { code: 'A2', sec: 'sec-orange' },
  { code: 'B1', sec: 'sec-amber' },
  { code: 'B2', sec: 'sec-yellow' },
  { code: 'C1', sec: 'sec-emerald' },
  { code: 'C2', sec: 'sec-blue' },
]
</script>
