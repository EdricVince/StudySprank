<template>
  <div class="min-h-full">
    <!-- Hero Banner -->
    <div class="relative overflow-hidden">
      <div class="absolute inset-0 bg-linear-to-br from-indigo-600/20 via-violet-600/10 to-transparent" />
      <div class="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
      <div class="relative mx-auto max-w-5xl px-6 py-10">

        <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm font-semibold text-indigo-400">
          <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-400"></span>
          {{ $t('schedule.badge') }}
        </div>
        <div>
          <h1 class="text-foreground text-4xl font-extrabold tracking-tight">{{ $t('schedule.pageTitle') }}</h1>
          <p class="text-muted-foreground mt-2 text-lg">{{ $t('schedule.pageSubtitle') }}</p>
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-5xl px-6 pb-12">

      <!-- ════════════════════════════════════════
           PLAN LIST VIEW
           ════════════════════════════════════════ -->
      <div v-if="view === 'list'" class="space-y-5">
        <!-- Empty state -->
        <div
v-if="savedPlans.length === 0"
          class="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-card/50 py-20 text-center"
        >
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-3xl">📅</div>
          <div>
            <div class="text-foreground font-bold text-lg">{{ $t('schedule.emptyTitle') }}</div>
            <div class="text-muted-foreground mt-1 text-sm">{{ $t('schedule.emptyDesc') }}</div>
          </div>
          <button
            class="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-bold text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
            @click="startNewPlan"
          >
            <span>✨</span> {{ $t('schedule.createFirst') }}
          </button>
        </div>

        <!-- Plan cards -->
        <div v-else class="space-y-3">
          <div class="flex items-center justify-between mb-4">
            <div class="text-muted-foreground text-sm font-semibold uppercase tracking-wider">
              {{ $t('schedule.planCount', savedPlans.length) }}
            </div>
            <button
              class="flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/8 px-4 py-2 text-sm font-semibold text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-500/15 transition-all duration-200 active:scale-95"
              @click="startNewPlan"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              {{ $t('schedule.newPlan') }}
            </button>
          </div>
          <div
            v-for="sp in savedPlans"
            :key="sp.id"
            class="group bg-card border-border rounded-2xl border p-5 transition-all hover:border-indigo-500/30 hover:shadow-lg cursor-pointer"
            @click="viewSavedPlan(sp)"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-4">
                <!-- Tier badge -->
                <div
class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl"
                  :class="getTierBadgeBg(sp)">
                  {{ getTierIcon(sp) }}
                </div>
                <div class="min-w-0">
                  <div class="text-foreground font-bold text-base">{{ sp.name }}</div>
                  <div class="flex flex-wrap items-center gap-2 mt-1">
                    <span class="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400">{{ sp.plan.target }}</span>
                    <span class="text-muted-foreground text-xs">{{ $t('schedule.months', { n: sp.plan.months_needed }) }}</span>
                    <span class="text-muted-foreground text-xs">·</span>
                    <span class="text-muted-foreground text-xs">{{ $t('schedule.perWeek', { n: sp.form.weekly_hours }) }}</span>
                    <span class="text-muted-foreground text-xs">·</span>
                    <span class="text-muted-foreground text-xs">{{ formatDate(sp.createdAt) }}</span>
                  </div>
                  <div class="flex flex-wrap gap-1.5 mt-2">
                    <span
v-for="month in sp.plan.monthly_plan.slice(0, 3)" :key="month.month"
                      class="rounded-lg bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {{ $t('schedule.monthTheme', { n: month.month, theme: month.theme.split('&')[0].trim() }) }}
                    </span>
                    <span v-if="sp.plan.months_needed > 3" class="rounded-lg bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                      {{ $t('schedule.moreMonths', { n: sp.plan.months_needed - 3 }) }}
                    </span>
                  </div>
                </div>
              </div>
              <!-- Actions -->
              <div class="flex shrink-0 gap-2" @click.stop>
                <button
                  class="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  @click.stop="viewSavedPlan(sp)"
                >{{ $t('schedule.view') }}</button>
                <button
                  class="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  @click.stop="editSavedPlan(sp)"
                >{{ $t('schedule.edit') }}</button>
                <button
                  class="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                  @click.stop="confirmDelete(sp.id)"
                >{{ $t('schedule.delete') }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════
           PLAN CREATION FORM
           ════════════════════════════════════════ -->
      <div v-if="view === 'form'" class="space-y-5">
        <!-- Step indicators -->
        <div class="flex items-center gap-2">
          <div v-for="(step, i) in formSteps" :key="i" class="flex items-center gap-2">
            <div
              class="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all"
              :class="currentStep > i ? 'bg-indigo-500 text-white' : currentStep === i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'"
            >
              <svg v-if="currentStep > i" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span v-else>{{ i + 1 }}</span>
            </div>
            <span class="text-sm font-medium" :class="currentStep >= i ? 'text-foreground' : 'text-muted-foreground'">{{ step }}</span>
            <div v-if="i < formSteps.length - 1" class="mx-1 h-px w-8 bg-border" />
          </div>
        </div>

        <!-- Step 1: Level & Exam -->
        <div v-if="currentStep === 0" class="bg-card border-border space-y-7 rounded-2xl border p-6">
          <div>
            <h2 class="text-foreground text-lg font-bold">{{ $t('schedule.levelTitle') }}</h2>
            <p class="text-muted-foreground text-sm mt-0.5">{{ $t('schedule.levelDesc') }}</p>
          </div>

          <div class="space-y-3">
            <div class="grid grid-cols-4 gap-2 sm:grid-cols-7">
              <button
                v-for="lvl in levels"
                :key="lvl.value"
                class="group relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                :style="form.current_level === lvl.value ? { borderColor: lvl.hex, background: lvl.hex + '22' } : {}"
                :class="form.current_level === lvl.value ? '' : 'border-border hover:border-border/80'"
                @click="form.current_level = lvl.value"
              >
                <span
class="text-sm font-extrabold transition-colors"
                  :style="form.current_level === lvl.value ? { color: lvl.hex } : {}"
                  :class="form.current_level !== lvl.value && 'text-muted-foreground'">{{ lvl.value }}</span>
                <span class="text-center text-[10px] leading-tight" :class="form.current_level === lvl.value ? 'text-foreground font-medium' : 'text-muted-foreground'">{{ $t(`schedule.levels.${lvl.value}`) }}</span>
                <div v-if="form.current_level === lvl.value" class="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 rounded-sm" :style="{ background: lvl.hex }" />
              </button>
            </div>
            <div class="relative h-2 rounded-full bg-border overflow-hidden">
              <div class="h-full rounded-full transition-all duration-500" :style="{ width: levelProgress + '%', background: 'linear-gradient(to right, #ef4444, #f59e0b, #22c55e)' }" />
            </div>
            <div class="flex justify-between text-xs text-muted-foreground">
              <span v-for="s in ['beginner', 'elementary', 'intermediate', 'advanced', 'proficient']" :key="s">{{ $t(`schedule.scale.${s}`) }}</span>
            </div>
          </div>

          <div class="space-y-3">
            <div>
              <h3 class="text-foreground font-semibold">{{ $t('schedule.targetExam') }}</h3>
              <p class="text-muted-foreground text-sm">{{ $t('schedule.targetExamDesc') }}</p>
            </div>
            <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <button
                v-for="ex in examTargets"
                :key="ex.id"
                class="group relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                :class="form.target_exam === ex.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'"
                @click="form.target_exam = ex.id; form.target_band = ''"
              >
                <span class="text-2xl">{{ ex.icon }}</span>
                <span class="text-foreground text-sm font-bold">{{ ex.id }}</span>
                <span class="text-muted-foreground text-xs">{{ $t(`schedule.exams.${ex.id}`) }}</span>
                <div v-if="form.target_exam === ex.id" class="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <svg class="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </button>
            </div>
          </div>

          <div v-if="form.target_exam && form.target_exam !== 'General'" class="space-y-3">
            <div>
              <h3 class="text-foreground font-semibold">{{ $t('schedule.targetBand') }}</h3>
              <p class="text-muted-foreground text-sm">{{ $t('schedule.targetBandDesc') }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="band in currentBandOptions"
                :key="band"
                class="rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-all duration-200 hover:shadow-md"
                :class="form.target_band === band ? 'border-primary bg-primary/15 text-primary shadow-sm' : 'border-border text-muted-foreground hover:border-primary/40'"
                @click="form.target_band = band"
              >{{ band }}</button>
            </div>
          </div>

          <!-- Learning tier preview -->
          <div
v-if="form.current_level && form.target_exam" class="rounded-xl border p-4 space-y-1"
            :class="previewTier === 1 ? 'border-amber-500/30 bg-amber-500/5' : previewTier === 2 ? 'border-blue-500/30 bg-blue-500/5' : 'border-violet-500/30 bg-violet-500/5'">
            <div class="font-semibold text-sm" :class="previewTier === 1 ? 'text-amber-300' : previewTier === 2 ? 'text-blue-300' : 'text-violet-300'">
              {{ $t(`schedule.tiers.${tierKey}`) }}
            </div>
            <div class="text-xs text-muted-foreground">
              {{ $t(`schedule.tiers.${tierKey}Desc`) }}
            </div>
          </div>

          <div v-if="!step1Valid" class="flex items-start gap-2 info-box info-box-amber">
            <span class="mt-0.5 text-amber-400 text-sm">⚠</span>
            <p class="text-amber-300/80 text-sm">
              <span v-if="!form.current_level">{{ $t('schedule.needLevel') }}</span>
              <span v-else-if="!form.target_exam">{{ $t('schedule.needExam') }}</span>
              <span v-else-if="form.target_exam !== 'General' && !form.target_band">{{ $t('schedule.needBand') }}</span>
            </p>
          </div>

          <button
            class="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 font-bold transition-all duration-200"
            :class="step1Valid ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md' : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'"
            :disabled="!step1Valid"
            @click="step1Valid && (currentStep = 1)"
          >
            {{ $t('schedule.continue') }}
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>

        <!-- Step 2: Hours & Skills -->
        <div v-if="currentStep === 1" class="bg-card border-border space-y-7 rounded-2xl border p-6">
          <div>
            <h2 class="text-foreground text-lg font-bold">{{ $t('schedule.prefsTitle') }}</h2>
            <p class="text-muted-foreground text-sm mt-0.5">{{ $t('schedule.prefsDesc') }}</p>
          </div>

          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-foreground font-semibold">{{ $t('schedule.weeklyHours') }}</h3>
                <p class="text-muted-foreground text-sm">{{ $t('schedule.weeklyHoursDesc') }}</p>
              </div>
              <div class="flex flex-col items-center justify-center h-14 w-20 rounded-xl bg-primary/10 text-primary">
                <span class="text-xl font-extrabold">{{ form.weekly_hours }}h</span>
                <span class="text-xs text-primary/70">{{ $t('schedule.approxMonth', { n: monthlyHoursPreview }) }}</span>
              </div>
            </div>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="tier in hourTiers"
                :key="tier.value"
                class="rounded-xl border-2 p-3 text-center transition-all"
                :class="form.weekly_hours >= tier.min && form.weekly_hours <= tier.max ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/30'"
                @click="form.weekly_hours = tier.value"
              >
                <div class="text-sm font-bold" :class="form.weekly_hours >= tier.min && form.weekly_hours <= tier.max ? 'text-primary' : 'text-foreground'">{{ $t(`schedule.hourTiers.${tier.key}`) }}</div>
                <div class="text-muted-foreground text-xs">{{ $t('schedule.perWeek', { n: `${tier.min}–${tier.max}` }) }}</div>
              </button>
            </div>
            <div class="space-y-1">
              <input v-model.number="form.weekly_hours" type="range" min="2" max="40" class="accent-primary w-full" />
              <div class="flex justify-between text-xs text-muted-foreground"><span>{{ $t('schedule.perWeek', { n: 2 }) }}</span><span>{{ $t('schedule.perWeek', { n: 40 }) }}</span></div>
            </div>
          </div>

          <div class="space-y-3">
            <div>
              <h3 class="text-foreground font-semibold">{{ $t('schedule.focusAreas') }}</h3>
              <p class="text-muted-foreground text-sm">{{ $t('schedule.focusDesc') }}</p>
            </div>
            <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <button
                v-for="skill in skills"
                :key="skill.name"
                class="flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all duration-200"
                :class="form.focus_areas.includes(skill.name) ? 'border-indigo-500 bg-indigo-500/10' : 'border-border hover:border-indigo-500/30'"
                @click="toggleSkill(skill.name)"
              >
                <span class="text-xl">{{ skill.icon }}</span>
                <div>
                  <div class="text-sm font-semibold" :class="form.focus_areas.includes(skill.name) ? 'text-indigo-400' : 'text-foreground'">{{ $t(`schedule.skills.${skill.name}`) }}</div>
                  <div class="text-muted-foreground text-xs">{{ $t(`schedule.skills.${skill.name}Desc`) }}</div>
                </div>
              </button>
            </div>
          </div>

          <div class="rounded-xl border border-dashed border-border bg-muted/30 p-4">
            <div class="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wider">{{ $t('schedule.preview') }}</div>
            <div class="flex flex-wrap gap-4">
              <div class="flex items-center gap-2">
                <span class="text-muted-foreground text-xs">{{ $t('schedule.level') }}:</span>
                <span class="text-foreground text-sm font-bold">{{ form.current_level }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-muted-foreground text-xs">{{ $t('schedule.target') }}:</span>
                <span class="text-foreground text-sm font-bold">{{ form.target_exam }}{{ form.target_band ? ' ' + form.target_band : '' }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-muted-foreground text-xs">{{ $t('schedule.study') }}:</span>
                <span class="text-foreground text-sm font-bold">{{ $t('schedule.perWeek', { n: form.weekly_hours }) }} · {{ $t('schedule.perMonth', { n: monthlyHoursPreview }) }}</span>
              </div>
            </div>
          </div>

          <div class="flex gap-3">
            <button
              class="group flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/8 px-4 py-3 text-sm font-semibold text-indigo-400 transition-all duration-200 hover:border-indigo-500/40 hover:bg-indigo-500/15 active:scale-95"
              @click="currentStep = 0"
            >
              <svg class="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
              {{ $t('schedule.back') }}
            </button>
            <button
              class="flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 font-bold text-white transition-all disabled:opacity-60"
              :class="loading ? 'bg-primary/70 cursor-not-allowed' : 'bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/20'"
              :disabled="loading"
              @click="generatePlan"
            >
              <div v-if="loading" class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              {{ loading ? $t('schedule.generating') : '✨ ' + $t('schedule.generate') }}
            </button>
          </div>
          <div v-if="generateError" class="info-box info-box-red mt-3 text-sm text-red-400">
            ⚠ {{ generateError }}
          </div>
        </div>
      </div>

      <!-- ════════════════════════════════════════
           PLAN DETAIL VIEW
           ════════════════════════════════════════ -->
      <div v-if="view === 'detail' && activePlan" class="space-y-6">
        <!-- Actions -->
        <div class="flex justify-end">
          <button
            class="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
            @click="editSavedPlan(activePlan)"
          >{{ $t('schedule.editPlan') }}</button>
        </div>

        <!-- Plan hero card -->
        <div class="relative overflow-hidden rounded-2xl border card-tint-indigo p-6">
          <div class="relative">
            <div class="text-foreground text-xl font-extrabold mb-3">{{ activePlan.name }}</div>
            <div class="flex flex-wrap gap-6">
              <div class="flex flex-col gap-1">
                <span class="ct-indigo text-xs font-semibold uppercase tracking-wider">{{ $t('schedule.level') }}</span>
                <span class="text-foreground text-lg font-extrabold">{{ activePlan.plan.level }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="ct-indigo text-xs font-semibold uppercase tracking-wider">{{ $t('schedule.target') }}</span>
                <span class="text-foreground text-lg font-extrabold">{{ activePlan.plan.target }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="ct-indigo text-xs font-semibold uppercase tracking-wider">{{ $t('schedule.duration') }}</span>
                <span class="text-foreground text-lg font-extrabold">{{ $t('schedule.months', { n: activePlan.plan.months_needed }) }}</span>
              </div>
              <div class="flex flex-col gap-1">
                <span class="ct-indigo text-xs font-semibold uppercase tracking-wider">{{ $t('schedule.study') }}</span>
                <span class="text-foreground text-lg font-extrabold">{{ $t('schedule.perWeek', { n: activePlan.form.weekly_hours }) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Month tabs -->
        <div class="space-y-1">
          <div class="text-muted-foreground text-xs font-semibold uppercase tracking-wider">{{ $t('schedule.monthly') }}</div>
          <div class="flex gap-2 overflow-x-auto pb-1">
            <button
              v-for="m in activePlan.plan.monthly_plan"
              :key="m.month"
              class="shrink-0 rounded-xl border-2 px-5 py-2 text-sm font-semibold transition-all duration-200"
              :class="activeMonthIdx === m.month - 1 ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground hover:border-primary/40'"
              @click="activeMonthIdx = m.month - 1"
            >{{ $t('schedule.monthTab', { n: m.month }) }}</button>
            <!-- Add month button -->
            <button
              class="shrink-0 flex items-center gap-1.5 rounded-xl border-2 border-dashed border-indigo-500/40 px-4 py-2 text-sm font-semibold text-indigo-400 hover:border-indigo-500 hover:bg-indigo-500/10 transition-all duration-200"
              @click="showAddMonthModal = true"
            >
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
              {{ $t('schedule.addMonth') }}
            </button>
          </div>
        </div>

        <!-- Month content -->
        <div v-if="activeMonthData" class="space-y-4">
          <!-- Month header -->
          <div class="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4 space-y-1">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <span class="text-lg">📅</span>
                <span class="text-primary text-sm font-bold uppercase tracking-wider">{{ $t('schedule.monthTab', { n: activeMonthData.month }) }} — {{ activeMonthData.theme }}</span>
              </div>
              <span class="text-primary/70 text-xs font-semibold">{{ $t('schedule.hoursThisMonth', { n: activeMonthData.total_hours }) }}</span>
            </div>
            <p class="text-primary/70 text-xs pl-7 leading-relaxed">{{ activeMonthData.objective }}</p>
          </div>

          <!-- Week summaries -->
          <div class="space-y-4">
            <div
              v-for="week in activeMonthData.week_summaries"
              :key="week.week_in_month"
              class="bg-card border-border rounded-2xl border p-5 space-y-4"
            >
              <!-- Week header -->
              <div class="flex items-center gap-2">
                <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-xs font-extrabold text-primary">{{ week.week_in_month }}</span>
                <span class="text-foreground font-semibold text-sm">{{ $t('schedule.week', { n: week.week_in_month, focus: week.focus }) }}</span>
              </div>

              <!-- Daily schedule -->
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
                <div
                  v-for="day in week.daily_schedule"
                  :key="day.day"
                  class="rounded-xl border p-3 space-y-1.5 transition-all"
                  :class="day.is_rest ? 'border-border/50 bg-muted/20 opacity-60' : 'border-border hover:border-primary/30 hover:bg-primary/5'"
                >
                  <!-- Day label -->
                  <div class="text-xs font-bold text-muted-foreground uppercase">{{ day.day }}</div>
                  <!-- Skill badge -->
                  <div v-if="day.is_rest" class="flex items-center gap-1">
                    <span class="text-base">🌿</span>
                    <span class="text-muted-foreground text-xs font-semibold">{{ $t('schedule.rest') }}</span>
                  </div>
                  <div v-else class="flex items-center gap-1">
                    <span class="text-sm">{{ skillIcon(day.skill) }}</span>
                    <span class="text-xs font-bold" :class="skillColor(day.skill)">{{ skillLabel(day.skill) }}</span>
                  </div>
                  <!-- Topic -->
                  <div class="text-[11px] text-muted-foreground leading-snug line-clamp-3">{{ day.topic }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tips & Resources -->
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
            <h3 class="mb-4 flex items-center gap-2 text-sm font-bold text-amber-400">
              <span class="text-base">💡</span> {{ $t('schedule.aiTips') }}
            </h3>
            <ul class="space-y-3">
              <li v-for="tip in activePlan.plan.tips" :key="tip" class="flex gap-2 text-sm leading-relaxed text-amber-200/80">
                <span class="mt-0.5 shrink-0 text-amber-400">›</span>
                {{ tip }}
              </li>
            </ul>
          </div>
          <div class="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
            <h3 class="mb-4 flex items-center gap-2 text-sm font-bold text-blue-400">
              <span class="text-base">📚</span> {{ $t('schedule.resources') }}
            </h3>
            <div v-for="r in activePlan.plan.resources" :key="r.name" class="mb-3 last:mb-0">
              <div class="text-blue-200 text-sm font-semibold">{{ r.name }}</div>
              <div class="text-blue-300/60 mt-0.5 text-xs">{{ r.description }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Month Modal -->
    <div v-if="showAddMonthModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" @click.self="closeAddMonthModal">
      <div class="bg-card border-border rounded-2xl border p-6 w-full max-w-md space-y-5 shadow-xl">
        <div class="flex items-center justify-between">
          <div>
            <div class="text-foreground font-bold text-lg">{{ $t('schedule.addMonthTitle', { n: nextMonthNumber }) }}</div>
            <div class="text-muted-foreground text-sm mt-0.5">{{ $t('schedule.addMonthDesc') }}</div>
          </div>
          <button class="rounded-lg p-2 hover:bg-accent transition-colors" @click="closeAddMonthModal">
            <svg class="h-5 w-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Option tabs -->
        <div class="grid grid-cols-2 gap-3">
          <button
            class="rounded-xl border-2 p-4 text-left transition-all duration-200"
            :class="addMonthType === 'ai' ? 'border-indigo-500 bg-indigo-500/10' : 'border-border hover:border-indigo-500/40'"
            @click="addMonthType = 'ai'"
          >
            <div class="text-xl mb-1">✨</div>
            <div class="font-semibold text-sm" :class="addMonthType === 'ai' ? 'text-indigo-400' : 'text-foreground'">{{ $t('schedule.aiGenerate') }}</div>
            <div class="text-muted-foreground text-xs mt-0.5">{{ $t('schedule.aiGenerateDesc') }}</div>
          </button>
          <button
            class="rounded-xl border-2 p-4 text-left transition-all duration-200"
            :class="addMonthType === 'custom' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/30'"
            @click="addMonthType = 'custom'"
          >
            <div class="text-xl mb-1">✏️</div>
            <div class="font-semibold text-sm" :class="addMonthType === 'custom' ? 'text-primary' : 'text-foreground'">{{ $t('schedule.custom') }}</div>
            <div class="text-muted-foreground text-xs mt-0.5">{{ $t('schedule.customDesc') }}</div>
          </button>
        </div>

        <!-- Custom form -->
        <div v-if="addMonthType === 'custom'" class="space-y-4">
          <div>
            <label class="text-foreground text-sm font-medium block mb-1.5">{{ $t('schedule.theme') }} <span class="text-destructive">*</span></label>
            <input
              v-model="customMonth.theme"
              type="text"
              :placeholder="$t('schedule.themePlaceholder')"
              class="bg-secondary text-foreground placeholder:text-muted-foreground h-11 w-full rounded-xl border-0 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label class="text-foreground text-sm font-medium block mb-1.5">{{ $t('schedule.objective') }}</label>
            <textarea
              v-model="customMonth.objective"
              :placeholder="$t('schedule.objectivePlaceholder')"
              rows="2"
              class="bg-secondary text-foreground placeholder:text-muted-foreground w-full resize-none rounded-xl border-0 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            ></textarea>
          </div>
          <div>
            <label class="text-foreground text-sm font-medium block mb-1.5">{{ $t('schedule.monthlyHours') }}</label>
            <input
              v-model.number="customMonth.total_hours"
              type="number"
              min="1"
              max="200"
              class="bg-secondary text-foreground h-11 w-full rounded-xl border-0 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <!-- AI note -->
        <div v-if="addMonthType === 'ai'" class="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 text-sm text-indigo-300/80">
          {{ $t('schedule.aiNote') }}
        </div>

        <div v-if="addMonthError" class="text-sm text-destructive">⚠ {{ addMonthError }}</div>

        <div class="flex gap-3 pt-1">
          <button
            class="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-muted-foreground hover:bg-accent transition-colors"
            @click="closeAddMonthModal"
          >{{ $t('schedule.cancel') }}</button>
          <button
            class="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition-all disabled:opacity-60"
            :class="addingMonth ? 'bg-primary/70 cursor-not-allowed' : addMonthType === 'ai' ? 'bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500' : 'bg-primary hover:bg-primary/90'"
            :disabled="addingMonth || (addMonthType === 'custom' && !customMonth.theme.trim())"
            @click="confirmAddMonth"
          >
            <div v-if="addingMonth" class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            <span v-else>{{ addMonthType === 'ai' ? '✨' : '+' }}</span>
            {{ addingMonth ? $t('schedule.generating') : addMonthType === 'ai' ? $t('schedule.generate') : $t('schedule.addMonth') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <div v-if="deletingId" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="bg-card border-border rounded-2xl border p-6 max-w-sm w-full space-y-4">
        <div class="text-foreground font-bold text-lg">{{ $t('schedule.deleteTitle') }}</div>
        <p class="text-muted-foreground text-sm">{{ $t('schedule.deleteDesc') }}</p>
        <div class="flex gap-3">
          <button
            class="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-muted-foreground hover:bg-accent transition-colors"
            @click="deletingId = null"
          >{{ $t('schedule.cancel') }}</button>
          <button
            class="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-500 transition-colors"
            @click="deletePlan(deletingId)"
          >{{ $t('schedule.delete') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { api } from '@/utils/api'
import { errorText } from '@/utils/skills'
import { usePageBack } from '@/composables/usePageBack'

const { t, te, locale } = useI18n()
const { setBack, clearBack } = usePageBack()

// ── View state ──────────────────────────────────────────────────────────────
type View = 'list' | 'form' | 'detail'
const view = ref<View>('list')

watch(view, (v) => {
  if (v !== 'list') setBack(t('schedule.backLabel'), () => { view.value = 'list' })
  else clearBack()
}, { immediate: true })

onUnmounted(clearBack)
const loading = ref(false)
const generateError = ref('')
const activeMonthIdx = ref(0)
const currentStep = ref(0)
const deletingId = ref<string | null>(null)

// ── Add month state ───────────────────────────────────────────────────────────
const showAddMonthModal = ref(false)
const addMonthType = ref<'ai' | 'custom'>('ai')
const addingMonth = ref(false)
const addMonthError = ref('')
const customMonth = ref({ theme: '', objective: '', total_hours: 40 })

const nextMonthNumber = computed(() =>
  (activePlan.value?.plan?.monthly_plan?.length ?? 0) + 1
)

function closeAddMonthModal() {
  showAddMonthModal.value = false
  addMonthError.value = ''
  customMonth.value = { theme: '', objective: '', total_hours: activePlan.value?.form?.weekly_hours ? activePlan.value.form.weekly_hours * 4 : 40 }
}

async function confirmAddMonth() {
  if (!activePlan.value) return
  addingMonth.value = true
  addMonthError.value = ''
  try {
    if (addMonthType.value === 'ai') {
      const existingThemes = activePlan.value.plan.monthly_plan.map((m: any) => m.theme)
      const newMonth = await api.extendSchedule({
        current_level: activePlan.value.form.current_level,
        target_exam: activePlan.value.form.target_exam,
        target_band: activePlan.value.form.target_band,
        weekly_hours: activePlan.value.form.weekly_hours,
        next_month_number: nextMonthNumber.value,
        existing_themes: existingThemes,
        focus_areas: activePlan.value.form.focus_areas,
      })
      activePlan.value.plan.monthly_plan.push(newMonth)
    } else {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      const skills = ['Vocabulary', 'Grammar', 'Reading', 'Listening', 'Writing', 'Speaking', 'Rest']
      const newMonth = {
        month: nextMonthNumber.value,
        theme: customMonth.value.theme.trim(),
        objective: customMonth.value.objective.trim() || `Complete Month ${nextMonthNumber.value} objectives`,
        total_hours: customMonth.value.total_hours,
        week_summaries: [1, 2, 3, 4].map(w => ({
          week_in_month: w,
          focus: `Week ${w} — ${customMonth.value.theme}`,
          daily_schedule: days.map((day, i) => ({
            day,
            skill: skills[i],
            topic: i === 6 ? 'Rest & consolidation' : `Week ${w} ${skills[i]} practice`,
            is_rest: i === 6,
          })),
        })),
      }
      activePlan.value.plan.monthly_plan.push(newMonth)
    }
    activePlan.value.plan.months_needed = Math.max(
      activePlan.value.plan.months_needed,
      activePlan.value.plan.monthly_plan.length,
    )
    savePlan(activePlan.value)
    activeMonthIdx.value = activePlan.value.plan.monthly_plan.length - 1
    closeAddMonthModal()
  } catch (e) {
    addMonthError.value = errorText(e, t('schedule.addMonthFailed'))
  } finally {
    addingMonth.value = false
  }
}

// ── Saved plans (localStorage) ───────────────────────────────────────────────
const STORAGE_KEY = 'studyspark_study_plans'

interface SavedPlan {
  id: string
  name: string
  createdAt: string
  form: typeof form.value
  plan: any
}

const savedPlans = ref<SavedPlan[]>([])
const activePlan = ref<SavedPlan | null>(null)
const editingId = ref<string | null>(null)

function loadPlans(): SavedPlan[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}

function persistPlans(plans: SavedPlan[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans))
  savedPlans.value = plans
}

function savePlan(sp: SavedPlan) {
  const plans = loadPlans().filter(p => p.id !== sp.id)
  plans.unshift(sp)
  persistPlans(plans)
}

function confirmDelete(id: string) { deletingId.value = id }

function deletePlan(id: string | null) {
  if (!id) return
  persistPlans(loadPlans().filter(p => p.id !== id))
  if (activePlan.value?.id === id) { activePlan.value = null; view.value = 'list' }
  deletingId.value = null
}

onMounted(() => { savedPlans.value = loadPlans() })

// ── Form data ────────────────────────────────────────────────────────────────
const formSteps = computed(() => [t('schedule.steps.levelExam'), t('schedule.steps.hoursSkills')])

const form = ref({
  current_level: '',
  target_exam: '',
  target_band: '',
  weekly_hours: 10,
  focus_areas: [] as string[],
})

const levels = [
  { value: 'beginner', hex: '#ef4444' },
  { value: 'A1',       hex: '#f97316' },
  { value: 'A2',       hex: '#eab308' },
  { value: 'B1',       hex: '#22c55e' },
  { value: 'B2',       hex: '#14b8a6' },
  { value: 'C1',       hex: '#3b82f6' },
  { value: 'C2',       hex: '#8b5cf6' },
]

const examTargets = [
  { id: 'IELTS',   icon: '🎓' },
  { id: 'General', icon: '📖' },
]

const bandMap: Record<string, string[]> = {
  IELTS: ['4.0','4.5','5.0','5.5','6.0','6.5','7.0','7.5','8.0','8.5','9.0'],
}
const currentBandOptions = computed(() => bandMap[form.value.target_exam] ?? [])

const hourTiers = [
  { value: 5,  min: 2,  max: 7,  key: 'casual' },
  { value: 10, min: 8,  max: 14, key: 'regular' },
  { value: 20, min: 15, max: 24, key: 'intensive' },
  { value: 30, min: 25, max: 40, key: 'fulltime' },
]

// Skill names are also the values sent to the API; labels come from schedule.skills.*
const skills = [
  { name: 'Vocabulary', icon: '📖' },
  { name: 'Grammar',    icon: '📝' },
  { name: 'Reading',    icon: '📰' },
  { name: 'Listening',  icon: '🎧' },
  { name: 'Writing',    icon: '✍️' },
  { name: 'Speaking',   icon: '🗣️' },
]

const levelProgress = computed(() => {
  if (!form.value.current_level) return 0
  const idx = levels.findIndex(l => l.value === form.value.current_level)
  return idx < 0 ? 0 : Math.round((idx / (levels.length - 1)) * 100)
})

const step1Valid = computed(() => {
  if (!form.value.current_level || !form.value.target_exam) return false
  if (form.value.target_exam !== 'General' && !form.value.target_band) return false
  return true
})

const monthlyHoursPreview = computed(() => form.value.weekly_hours * 4)

// Preview tier before generating
const previewTier = computed(() => {
  const lv = form.value.current_level
  const ex = form.value.target_exam
  const band = form.value.target_band
  if (lv === 'C1' || lv === 'C2') return 3
  if (ex === 'IELTS' && band && parseFloat(band) >= 7.0) return 3
  if (lv === 'B1' || lv === 'B2') return 2
  if (ex === 'IELTS' && band && parseFloat(band) >= 5.0) return 2
  return 1
})
const tierKey = computed(() => (['slow', 'moderate', 'pro'] as const)[previewTier.value - 1])

function toggleSkill(s: string) {
  const idx = form.value.focus_areas.indexOf(s)
  if (idx >= 0) form.value.focus_areas.splice(idx, 1)
  else form.value.focus_areas.push(s)
}

function startNewPlan() {
  form.value = { current_level: '', target_exam: '', target_band: '', weekly_hours: 10, focus_areas: [] }
  editingId.value = null
  currentStep.value = 0
  view.value = 'form'
}

function viewSavedPlan(sp: SavedPlan) {
  activePlan.value = sp
  activeMonthIdx.value = 0
  view.value = 'detail'
}

function editSavedPlan(sp: SavedPlan) {
  form.value = { ...sp.form, focus_areas: [...(sp.form.focus_areas ?? [])] }
  editingId.value = sp.id
  currentStep.value = 0
  view.value = 'form'
}

async function generatePlan() {
  loading.value = true
  generateError.value = ''
  try {
    const data = await api.generateSchedule(form.value as any)
    const planName = `${form.value.target_exam}${form.value.target_band ? ' ' + form.value.target_band : ''} — ${form.value.current_level}`
    const sp: SavedPlan = {
      id: editingId.value ?? crypto.randomUUID(),
      name: planName,
      createdAt: new Date().toISOString(),
      form: { ...form.value, focus_areas: [...form.value.focus_areas] },
      plan: data,
    }
    savePlan(sp)
    activePlan.value = sp
    activeMonthIdx.value = 0
    view.value = 'detail'
  } catch (e) {
    const status = (e as { status?: number })?.status
    generateError.value = status === 503 ? t('schedule.aiNotConfigured') : errorText(e, t('schedule.generateFailed'))
  } finally {
    loading.value = false
  }
}

// ── Active month computed ─────────────────────────────────────────────────────
const activeMonthData = computed(() => activePlan.value?.plan?.monthly_plan?.[activeMonthIdx.value] ?? null)

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(locale.value, { month: 'short', day: 'numeric', year: 'numeric' })
}

// AI plans store English skill names; show the translated label when we have one.
function skillLabel(skill: string): string {
  return te(`schedule.skills.${skill}`) ? t(`schedule.skills.${skill}`) : skill
}

function skillIcon(skill: string): string {
  return ({ Vocabulary: '📖', Grammar: '📝', Reading: '📰', Listening: '🎧', Writing: '✍️', Speaking: '🗣️', 'Practice Test': '📋', Review: '🔍' } as Record<string, string>)[skill] ?? '📌'
}

function skillColor(skill: string): string {
  return ({
    Vocabulary: 'text-violet-400', Grammar: 'text-blue-400', Reading: 'text-green-400',
    Listening: 'text-cyan-400', Writing: 'text-amber-400', Speaking: 'text-rose-400',
    'Practice Test': 'text-indigo-400', Review: 'text-slate-400',
  } as Record<string, string>)[skill] ?? 'text-muted-foreground'
}

function getTierIcon(sp: SavedPlan): string {
  const lv = sp.form.current_level
  const ex = sp.form.target_exam
  const band = sp.form.target_band
  if (lv === 'C1' || lv === 'C2' || (ex === 'IELTS' && band && parseFloat(band) >= 7.0)) return '🚀'
  if (lv === 'B1' || lv === 'B2' || (ex === 'IELTS' && band && parseFloat(band) >= 5.0)) return '🚶'
  return '🐢'
}

function getTierBadgeBg(sp: SavedPlan): string {
  const icon = getTierIcon(sp)
  if (icon === '🚀') return 'bg-violet-500/10'
  if (icon === '🚶') return 'bg-blue-500/10'
  return 'bg-amber-500/10'
}
</script>
