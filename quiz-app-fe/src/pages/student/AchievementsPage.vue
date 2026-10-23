<template>
  <div class="p-6 lg:p-8">
    <!-- Header -->
    <div class="animate-fade-in-down mb-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-foreground text-2xl font-bold tracking-tight lg:text-3xl">{{ $t('achievements.title') }}</h1>
          <p class="text-muted-foreground mt-1 text-base">{{ $t('achievements.unlockBadges') }}</p>
        </div>
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="bg-secondary text-foreground flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all hover:bg-secondary/80"
            @click="handleShareAchievements"
          >
            <Share2 class="h-4 w-4" />
            {{ $t('achievements.share') }}
          </button>
          <div class="bg-linear-to-r from-primary/10 to-chart-1/10 rounded-xl px-4 py-2 text-center">
            <p class="text-foreground text-2xl font-bold">{{ earnedCount }}</p>
            <p class="text-muted-foreground text-xs">{{ $t('achievements.ofEarned', { total: achievementsData.achievements.length }) }}</p>
          </div>
        </div>
      </div>

      <AchievementStatsCards
        :total-points="totalPoints"
        :rarity-count="rarityCount"
        :recent-achievement="recentAchievement ?? null"
      />
    </div>

    <!-- Leaderboard — competitive section, shown first -->
    <div class="animate-fade-in-up mb-8">
      <LeaderboardPreview
        :users="progressStore.leaderboard"
        :current-user-id="authStore.currentUser?.id"
      />
    </div>

    <!-- Category Tabs -->
    <div class="animate-fade-in-up mb-4">
      <AchievementCategoryTabs
        v-model="selectedCategory"
        :achievements="achievementsData.achievements"
      />
    </div>

    <!-- Rarity Legend -->
    <div class="animate-fade-in-up mb-6">
      <RarityLegend />
    </div>

    <!-- Achievements Grid -->
    <div class="animate-fade-in-up delay-100">
      <AchievementsGrid :achievements="filteredAchievements" @select="openDetail" />
    </div>

    <!-- Detail Modal -->
    <AchievementDetailModal
      :show="showModal"
      :achievement="selectedAchievement"
      @close="closeModal"
      @share="handleShareAchievement"
    />

    <ShareToast :show="showShareToast" :message="toastMessage" />
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Share2 } from '@/components/icons'

const { t } = useI18n()

import AchievementStatsCards from '@/components/achievements/AchievementStatsCards.vue'
import RarityLegend from '@/components/achievements/RarityLegend.vue'
import AchievementsGrid from '@/components/achievements/AchievementsGrid.vue'
import LeaderboardPreview from '@/components/achievements/LeaderboardPreview.vue'
import ShareToast from '@/components/achievements/ShareToast.vue'
import AchievementCategoryTabs from '@/components/achievements/AchievementCategoryTabs.vue'
import AchievementDetailModal from '@/components/achievements/AchievementDetailModal.vue'

import { useAchievements } from '@/composables'
import { useProgressStore } from '@/stores/progress.store'
import { useAuthStore } from '@/stores/auth.store'
import type { EnhancedAchievement } from '@/types/profile'

const progressStore = useProgressStore()
const authStore = useAuthStore()

const {
  selectedCategory,
  selectedAchievement,
  showModal,
  achievementsData,
  openDetail,
  closeModal,
  filteredAchievements,
  earnedCount,
  totalPoints,
  rarityCount,
  recentAchievement,
} = useAchievements()

const showShareToast = ref(false)
const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | undefined

function showToast(message: string) {
  toastMessage.value = message
  showShareToast.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { showShareToast.value = false }, 3000)
}

/** Clipboard API needs a secure context; fall back to a hidden textarea + execCommand. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch { /* permission denied / insecure origin — try the fallback */ }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

/** Native share sheet when available (mobile), otherwise copy the text. */
async function share(text: string, successMessage: string) {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text })
      showToast(successMessage)
      return
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return // user closed the share sheet
    }
  }
  showToast((await copyText(text)) ? successMessage : t('achievements.shareFailed'))
}

const handleShareAchievements = () =>
  share(
    t('achievements.shareText', { count: earnedCount.value, points: totalPoints.value }),
    t('achievements.linkCopied'),
  )

const handleShareAchievement = async (achievement: EnhancedAchievement) => {
  closeModal()
  await share(t('achievements.shareOneText', { name: achievement.name }), t('achievements.achievementShared'))
}

onUnmounted(() => clearTimeout(toastTimer))
</script>
