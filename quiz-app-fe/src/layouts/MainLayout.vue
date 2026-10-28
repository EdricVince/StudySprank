<template>
  <div class="bg-background flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <aside
      class="bg-sidebar border-sidebar-border relative flex flex-col overflow-hidden border-r shadow-sm"
      :class="[isCollapsed ? 'w-17' : 'w-64']"
      style="transition: width 300ms cubic-bezier(0.4,0,0.2,1)"
    >
      <!-- Top accent line -->
      <div class="bg-sidebar-primary absolute top-0 left-0 right-0 h-0.5 opacity-60" />

      <!-- Logo -->
      <div class="border-sidebar-border flex h-16 items-center border-b px-3">
        <button
          class="hover:bg-sidebar-accent flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-xl p-2 transition-colors duration-200"
          :class="isCollapsed ? 'justify-center' : ''"
          @click="router.push('/dashboard')"
        >
          <div class="bg-sidebar-primary text-sidebar-primary-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm">
            <Sparkles class="h-4 w-4" />
          </div>
          <div
            class="overflow-hidden text-left"
            style="transition: opacity 200ms ease, max-width 300ms cubic-bezier(0.4,0,0.2,1)"
            :style="isCollapsed ? { opacity: '0', maxWidth: '0' } : { opacity: '1', maxWidth: '160px' }"
          >
            <div class="text-sidebar-foreground whitespace-nowrap text-sm font-bold tracking-tight">StudySpark</div>
            <div class="text-sidebar-foreground/40 whitespace-nowrap text-[10px] font-medium">{{ $t('nav.tagline') }}</div>
          </div>
        </button>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 py-3">
        <div v-for="section in menuSections" :key="section.title" class="mb-4">
          <!-- Section label (expanded) or divider (collapsed) -->
          <div
            class="overflow-hidden"
            style="transition: max-height 300ms cubic-bezier(0.4,0,0.2,1), opacity 200ms ease"
            :style="isCollapsed ? { maxHeight: '1px', opacity: '0', marginBottom: '8px' } : { maxHeight: '32px', opacity: '1', marginBottom: '4px' }"
          >
            <p class="text-sidebar-foreground/40 px-3 text-[10px] font-semibold uppercase tracking-widest">
              {{ section.title }}
            </p>
          </div>
          <div v-if="isCollapsed" class="border-sidebar-border mx-3 mb-2 border-t opacity-30" />

          <router-link
            v-for="item in section.items"
            :key="item.path"
            :to="item.path"
            class="nav-item group relative mb-0.5 flex items-center rounded-xl px-3 py-2.5"
            style="transition: background-color 150ms, color 150ms"
            :class="[
              isCollapsed ? 'justify-center' : 'gap-3',
              isActiveRoute(item.path)
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
            ]"
          >
            <!-- Active pill -->
            <div
              v-if="isActiveRoute(item.path)"
              class="bg-sidebar-primary absolute left-0 top-1/2 h-5 w-0.75 -translate-y-1/2 rounded-r-full"
            />

            <component
              :is="item.icon"
              class="h-4.5 w-4.5 shrink-0 transition-transform duration-150 group-hover:scale-105"
              :class="isActiveRoute(item.path) ? 'text-sidebar-primary' : ''"
            />

            <span
              class="overflow-hidden whitespace-nowrap text-sm font-medium"
              style="transition: opacity 200ms ease, max-width 300ms cubic-bezier(0.4,0,0.2,1)"
              :style="isCollapsed ? { opacity: '0', maxWidth: '0' } : { opacity: '1', maxWidth: '160px' }"
            >
              {{ item.label }}
            </span>

            <!-- Tooltip when collapsed -->
            <Transition name="tooltip">
              <div
                v-if="isCollapsed"
                class="bg-popover border-border text-popover-foreground pointer-events-none absolute left-[calc(100%+12px)] z-50 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              >
                {{ item.label }}
                <div class="border-border bg-popover absolute right-full top-1/2 -translate-y-1/2 h-2 w-2 rotate-45 border-l border-b -mr-px" />
              </div>
            </Transition>
          </router-link>
        </div>
      </nav>

      <!-- Collapse Button -->
      <div class="border-sidebar-border border-t p-2">
        <button
          class="text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150"
          :class="isCollapsed ? 'justify-center' : ''"
          :title="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          @click="toggleSidebar"
        >
          <component
            :is="isCollapsed ? PanelLeftOpen : PanelLeftClose"
            class="h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105"
          />
          <span
            class="overflow-hidden whitespace-nowrap text-sm font-medium"
            style="transition: opacity 200ms ease, max-width 300ms cubic-bezier(0.4,0,0.2,1)"
            :style="isCollapsed ? { opacity: '0', maxWidth: '0' } : { opacity: '1', maxWidth: '160px' }"
          >
            {{ $t('nav.sidebar.collapse') }}
          </span>
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Header -->
      <header class="bg-card border-border flex h-16 shrink-0 items-center justify-between border-b px-6">
        <!-- Left: Back button (sub-pages / page-back) or Page Title -->
        <div class="flex items-center gap-3">
          <button
            v-if="backFn"
            class="group flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/8 px-3.5 py-1.5 text-sm font-semibold text-indigo-400 transition-all duration-200 hover:border-indigo-500/40 hover:bg-indigo-500/15 active:scale-95"
            @click="backFn()"
          >
            <ArrowLeft class="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            {{ backLabel }}
          </button>
          <button
            v-else-if="isSubPage"
            class="group flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/8 px-3.5 py-1.5 text-sm font-semibold text-indigo-400 transition-all duration-200 hover:border-indigo-500/40 hover:bg-indigo-500/15 active:scale-95"
            @click="router.back()"
          >
            <ArrowLeft class="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            {{ currentPageTitle }}
          </button>
          <h1 v-else class="text-foreground text-lg font-semibold">{{ currentPageTitle }}</h1>
        </div>

        <!-- Right: Actions -->
        <div class="flex items-center gap-3">
          <!-- Search -->
          <button
            class="text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg p-2 transition-colors"
            @click="showSearch = true"
          >
            <Search class="h-5 w-5" />
          </button>

          <!-- Streak Badge -->
          <StreakBadge
            v-if="progressStore.streakCount > 0"
            :streak-count="progressStore.streakCount"
            :milestone-reached="progressStore.milestoneReached"
            compact
            class="hidden sm:inline-flex"
          />

          <!-- XP Pill -->
          <div class="hidden items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 sm:flex">
            <span class="text-primary text-xs font-bold uppercase tracking-wide">XP</span>
            <span class="text-primary text-sm font-semibold">{{ progressStore.xp.toLocaleString() }}</span>
          </div>

          <!-- Notifications -->
          <div ref="notificationRef" class="relative">
            <button
              class="text-muted-foreground hover:text-foreground hover:bg-accent relative rounded-lg p-2 transition-colors"
              @click="showNotifications = !showNotifications"
            >
              <Bell class="h-5 w-5" />
              <span v-if="notificationCount > 0" class="bg-destructive absolute top-1.5 right-1.5 h-2 w-2 rounded-full"></span>
            </button>
            <NotificationPanel :show="showNotifications" />
          </div>

          <!-- Divider -->
          <div class="bg-border h-8 w-px"></div>

          <!-- User Dropdown -->
          <div ref="dropdownRef" class="relative">
            <button
              class="hover:bg-accent flex items-center gap-3 rounded-xl p-2 transition-colors"
              @click="toggleDropdown"
            >
              <div class="bg-primary text-primary-foreground flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold">
                {{ userInitials }}
              </div>
              <div class="hidden text-left sm:block">
                <p class="text-foreground text-sm font-medium">{{ userName }}</p>
                <p class="text-muted-foreground text-xs">{{ userEmail }}</p>
              </div>
              <ChevronDown
                class="text-muted-foreground hidden h-4 w-4 transition-transform duration-200 sm:block"
                :class="{ 'rotate-180': isDropdownOpen }"
              />
            </button>

            <!-- Dropdown Menu -->
            <Transition name="dropdown">
              <div
                v-if="isDropdownOpen"
                class="bg-popover border-border absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border shadow-lg"
              >
                <div class="border-border border-b p-3">
                  <p class="text-foreground text-sm font-medium">{{ userName }}</p>
                  <p class="text-muted-foreground text-xs">{{ userEmail }}</p>
                </div>
                <div class="p-2">
                  <router-link
                    v-for="item in dropdownItems"
                    :key="item.path"
                    :to="item.path"
                    class="text-foreground hover:bg-accent flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
                    @click="isDropdownOpen = false"
                  >
                    <component :is="item.icon" class="text-muted-foreground h-4 w-4" />
                    {{ item.label }}
                  </router-link>
                  <button
                    v-if="canAccessTeacher"
                    class="text-foreground hover:bg-accent flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
                    @click="isDropdownOpen = false; router.push(authStore.homePath)"
                  >
                    <GraduationCap class="text-muted-foreground h-4 w-4" />
                    {{ $t('teacher.nav.portal') }}
                  </button>
                </div>
                <div class="border-border border-t p-2">
                  <button
                    class="text-destructive hover:bg-destructive/10 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
                    @click="handleLogout"
                  >
                    <LogOut class="h-4 w-4" />
                    {{ $t('nav.userMenu.signOut') }}
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="bg-background flex-1 overflow-y-auto">
        <router-view v-slot="{ Component, route }">
          <Transition name="page-slide" mode="out-in">
            <component :is="Component" :key="`${route.path}-${locale}`" />
          </Transition>
        </router-view>
      </main>
    </div>

    <!-- Search Modal -->
    <SearchModal :show="showSearch" @close="showSearch = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import {
  Sparkles,
  LayoutDashboard,
  BookOpen,
  Layers,
  Trophy,
  BarChart3,
  Settings,
  Bell,
  Search,
  ArrowLeft,
  ChevronDown,
  User,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Gamepad2,
  Target,
  GraduationCap,
  FileText,
  Calendar,
  Users,
} from '@/components/icons'
import SearchModal from '@/components/ui/SearchModal.vue'
import NotificationPanel from '@/components/ui/NotificationPanel.vue'
import StreakBadge from '@/components/streak/StreakBadge.vue'
import { useProgressStore } from '@/stores/progress.store'
import { useNotificationStore } from '@/stores/notification.store'
import { usePageBack } from '@/composables/usePageBack'

const { t, locale } = useI18n({ useScope: 'global' })
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const progressStore = useProgressStore()
const notificationStore = useNotificationStore()
const { backLabel, backFn } = usePageBack()

// Sidebar state
const isCollapsed = ref(false)
const toggleSidebar = () => { isCollapsed.value = !isCollapsed.value }

// Back button: show on any route that's not a top-level nav page
const topLevelPaths = new Set([
  '/dashboard', '/courses', '/classes', '/flashcards', '/quizzes', '/goals', '/achievements',
  '/statistics', '/settings', '/profile',
  '/entrance-exam', '/schedule', '/skills',
])
const isSubPage = computed(() => !topLevelPaths.has(route.path))

// Search & Notifications
const showSearch = ref(false)
const showNotifications = ref(false)
const notificationRef = ref<HTMLElement | null>(null)
const notificationCount = computed(() => notificationStore.unreadCount)

// Dropdown state
const isDropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

// Close dropdown/notifications when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isDropdownOpen.value = false
  }
  if (notificationRef.value && !notificationRef.value.contains(event.target as Node)) {
    showNotifications.value = false
  }
}

// Keyboard shortcut for search (Ctrl+K)
const handleKeydown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
    event.preventDefault()
    showSearch.value = !showSearch.value
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
})

// Teacher access check (email-based OR teacher mode enabled at login)
const canAccessTeacher = computed(() => authStore.canAccessTeacher)

// User data - get from auth store
const userName = computed(() => {
  if (authStore.user?.name) return authStore.user.name
  if (authStore.user?.email) return authStore.user.email.split('@')[0] ?? 'Guest'
  return 'Guest'
})
const userEmail = computed(() => authStore.user?.email || '')
const userInitials = computed(() => {
  const name = userName.value
  const names = name.split(' ')
  if (names.length > 1) {
    return names.map(n => n?.[0] ?? '').join('').toUpperCase().slice(0, 2)
  }
  return name.slice(0, 2).toUpperCase()
})

// Navigation menu
const menuSections = computed(() => [
  {
    title: t('nav.sections.main'),
    items: [
      { path: '/dashboard', label: t('nav.items.dashboard'), icon: LayoutDashboard },
      { path: '/courses', label: t('nav.items.myCourses'), icon: BookOpen },
      { path: '/classes', label: t('nav.items.myClasses'), icon: Users },
      { path: '/flashcards', label: t('nav.items.flashcards'), icon: Layers },
      { path: '/quizzes', label: t('nav.items.quizzes'), icon: Gamepad2 },
    ],
  },
  {
    title: t('nav.sections.progress'),
    items: [
      { path: '/goals', label: t('nav.items.goals'), icon: Target },
      { path: '/achievements', label: t('nav.items.achievements'), icon: Trophy },
      { path: '/statistics', label: t('nav.items.statistics'), icon: BarChart3 },
    ],
  },
  {
    title: t('nav.sections.examSchedule'),
    items: [
      { path: '/entrance-exam', label: t('nav.items.entranceExam'), icon: FileText },
      { path: '/schedule', label: t('nav.items.schedule'), icon: Calendar },
    ],
  },
  {
    title: t('nav.sections.skills'),
    items: [
      { path: '/skills', label: t('nav.items.skillsHub'), icon: Sparkles },
    ],
  },
])

// Dropdown menu items
const dropdownItems = computed(() => [
  { path: '/profile', label: t('nav.userMenu.myProfile'), icon: User },
  { path: '/settings', label: t('nav.userMenu.settings'), icon: Settings },
])

const isActiveRoute = (path: string) => {
  return route.path === path || route.path.startsWith(path + '/')
}

// Current page title — prefer most-specific match
const currentPageTitle = computed(() => {
  const allItems = menuSections.value.flatMap(s => s.items)
  const sorted = [...allItems].sort((a, b) => b.path.length - a.path.length)
  const current = sorted.find(item => route.path === item.path || route.path.startsWith(item.path + '/'))
  return current?.label || t('nav.items.dashboard')
})


// Logout handler
const handleLogout = () => {
  isDropdownOpen.value = false
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
/* Nav item hover effect */
.nav-item::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 0.75rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.nav-item:hover::before {
  opacity: 1;
}

/* Dropdown animation */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}

/* Page transitions */
.page-slide-enter-active,
.page-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.page-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* Fade transition */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.25s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}
</style>
