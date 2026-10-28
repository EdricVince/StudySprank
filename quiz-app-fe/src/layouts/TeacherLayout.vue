<template>
  <div class="bg-background flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <aside
      class="bg-sidebar border-sidebar-border relative flex flex-col overflow-hidden border-r shadow-sm max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-40 max-lg:w-64 max-lg:transition-transform max-lg:duration-300"
      :class="[collapsed ? 'lg:w-17' : 'lg:w-64', mobileOpen ? 'max-lg:translate-x-0' : 'max-lg:-translate-x-full']"
      style="transition: width 300ms cubic-bezier(0.4,0,0.2,1)"
    >
      <!-- Top accent line -->
      <div class="bg-sidebar-primary absolute top-0 left-0 right-0 h-0.5 opacity-60" />

      <!-- Logo -->
      <div class="border-sidebar-border flex h-16 items-center border-b px-3">
        <button
          class="hover:bg-sidebar-accent flex w-full cursor-pointer items-center gap-3 overflow-hidden rounded-xl p-2 transition-colors duration-200"
          :class="collapsed ? 'justify-center' : ''"
          @click="router.push(authStore.homePath)"
        >
          <div class="bg-sidebar-primary text-sidebar-primary-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm">
            <Sparkles class="h-4 w-4" />
          </div>
          <div
            class="overflow-hidden text-left"
            style="transition: opacity 200ms ease, max-width 300ms cubic-bezier(0.4,0,0.2,1)"
            :style="collapsed ? { opacity: '0', maxWidth: '0' } : { opacity: '1', maxWidth: '160px' }"
          >
            <div class="text-sidebar-foreground whitespace-nowrap text-sm font-bold tracking-tight">StudySpark</div>
            <div class="text-primary whitespace-nowrap text-[10px] font-semibold">{{ portalLabel }}</div>
          </div>
        </button>
      </div>

      <!-- Navigation: one list of groups, built from the signed-in role -->
      <nav class="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2 py-3">
        <div v-for="group in navGroups" :key="group.key" class="mb-4">
          <div
            class="overflow-hidden"
            style="transition: max-height 300ms cubic-bezier(0.4,0,0.2,1), opacity 200ms ease"
            :style="collapsed ? { maxHeight: '1px', opacity: '0', marginBottom: '8px' } : { maxHeight: '32px', opacity: '1', marginBottom: '4px' }"
          >
            <p class="text-sidebar-foreground/40 px-3 text-[10px] font-semibold uppercase tracking-widest">
              {{ group.label }}
            </p>
          </div>
          <div v-if="collapsed" class="border-sidebar-border mx-3 mb-2 border-t opacity-30" />

          <router-link
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            class="group relative mb-0.5 flex items-center rounded-xl px-3 py-2.5"
            style="transition: background-color 150ms, color 150ms"
            :class="[
              collapsed ? 'justify-center' : 'gap-3',
              item.path === activePath
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
            ]"
          >
            <div
              v-if="item.path === activePath"
              class="bg-sidebar-primary absolute left-0 top-1/2 h-5 w-0.75 -translate-y-1/2 rounded-r-full"
            />
            <!-- Classes get their initial so they stay tellable apart when the sidebar is collapsed -->
            <span
              v-if="item.initial"
              class="bg-sidebar-primary/15 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
              :class="item.path === activePath ? 'text-sidebar-primary' : ''"
            >{{ item.initial }}</span>
            <component
              :is="item.icon"
              v-else
              class="h-4.5 w-4.5 shrink-0 transition-transform duration-150 group-hover:scale-105"
              :class="item.path === activePath ? 'text-sidebar-primary' : ''"
            />
            <span
              class="flex-1 overflow-hidden truncate whitespace-nowrap text-sm font-medium"
              style="transition: opacity 200ms ease, max-width 300ms cubic-bezier(0.4,0,0.2,1)"
              :style="collapsed ? { opacity: '0', maxWidth: '0' } : { opacity: '1', maxWidth: '160px' }"
            >
              {{ item.label }}
            </span>
            <span
              v-if="item.badge && !collapsed"
              class="bg-primary text-primary-foreground min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold leading-none"
            >
              {{ item.badge }}
            </span>

            <!-- Tooltip when collapsed -->
            <div
              v-if="collapsed"
              class="bg-popover border-border text-popover-foreground pointer-events-none absolute left-[calc(100%+12px)] z-50 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-semibold opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
            >
              {{ item.label }}
            </div>
          </router-link>
        </div>
      </nav>

      <!-- Collapse Button -->
      <div class="border-sidebar-border border-t p-2 max-lg:hidden">
        <button
          class="text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150"
          :class="collapsed ? 'justify-center' : ''"
          @click="isCollapsed = !isCollapsed"
        >
          <component
            :is="collapsed ? PanelLeftOpen : PanelLeftClose"
            class="h-4.5 w-4.5 shrink-0 transition-transform duration-200 group-hover:scale-105"
          />
          <span
            class="overflow-hidden whitespace-nowrap text-sm font-medium"
            style="transition: opacity 200ms ease, max-width 300ms cubic-bezier(0.4,0,0.2,1)"
            :style="collapsed ? { opacity: '0', maxWidth: '0' } : { opacity: '1', maxWidth: '160px' }"
          >
            {{ $t('teacher.nav.collapse') }}
          </span>
        </button>
      </div>
    </aside>

    <!-- Backdrop behind the mobile drawer -->
    <div v-if="mobileOpen" class="fixed inset-0 z-30 bg-black/40 lg:hidden" @click="mobileOpen = false" />

    <!-- Main Content Area -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Header -->
      <header class="bg-card border-border flex h-16 shrink-0 items-center justify-between border-b px-6">
        <!-- Left: back button on sub-pages, otherwise the page title -->
        <div class="flex min-w-0 items-center gap-3">
          <button
            class="text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg p-2 transition-colors lg:hidden"
            @click="mobileOpen = !mobileOpen"
          >
            <Menu class="h-5 w-5" />
          </button>
          <button
            v-if="isSubPage && parentItem"
            class="group flex items-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/8 px-3.5 py-1.5 text-sm font-semibold text-indigo-400 transition-all duration-200 hover:border-indigo-500/40 hover:bg-indigo-500/15 active:scale-95"
            @click="router.push(parentItem.path)"
          >
            <ArrowLeft class="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            {{ parentItem.label }}
          </button>
          <h1 v-else class="text-foreground truncate text-lg font-semibold">{{ currentPageTitle }}</h1>
        </div>

        <div class="flex items-center gap-2 sm:gap-3">
          <!-- Role badge -->
          <div class="hidden items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 lg:flex">
            <component :is="authStore.isAdmin ? CheckCircle : BookOpen" class="text-primary h-3.5 w-3.5" />
            <span class="text-primary text-sm font-semibold">{{ roleLabel }}</span>
          </div>

          <div class="bg-border h-8 w-px"></div>

          <!-- User Dropdown -->
          <div ref="dropdownRef" class="relative">
            <button
              class="hover:bg-accent flex items-center gap-3 rounded-xl p-2 transition-colors"
              @click="isDropdownOpen = !isDropdownOpen"
            >
              <div class="bg-primary text-primary-foreground flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold">
                {{ userInitials }}
              </div>
              <div class="hidden text-left sm:block">
                <p class="text-foreground text-sm font-medium">{{ userName }}</p>
                <p class="text-muted-foreground text-xs">{{ roleLabel }}</p>
              </div>
              <ChevronDown
                class="text-muted-foreground hidden h-4 w-4 transition-transform duration-200 sm:block"
                :class="{ 'rotate-180': isDropdownOpen }"
              />
            </button>

            <Transition name="dropdown">
              <div
                v-if="isDropdownOpen"
                class="bg-popover border-border absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border shadow-lg"
              >
                <div class="border-border border-b p-3">
                  <p class="text-foreground truncate text-sm font-medium">{{ userName }}</p>
                  <p class="text-muted-foreground truncate text-xs">{{ authStore.user?.email }}</p>
                </div>
                <div v-if="authStore.isTeacher" class="p-2">
                  <router-link
                    to="/dashboard"
                    class="text-foreground hover:bg-accent flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
                    @click="isDropdownOpen = false"
                  >
                    <LayoutDashboard class="text-muted-foreground h-4 w-4" />
                    {{ $t('teacher.nav.studentView') }}
                  </router-link>
                </div>
                <div class="border-border border-t p-2">
                  <button
                    class="text-destructive hover:bg-destructive/10 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors"
                    @click="handleLogout"
                  >
                    <LogOut class="h-4 w-4" />
                    {{ $t('teacher.nav.signOut') }}
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="bg-background flex-1 overflow-y-auto">
        <router-view v-slot="{ Component: Page, route: viewRoute }">
          <Transition name="page-slide" mode="out-in">
            <component :is="Page" :key="`${viewRoute.path}-${locale}`" />
          </Transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
  Sparkles,
  LayoutDashboard,
  BookOpen,
  Users,
  FileText,
  Languages,
  GraduationCap,
  Menu,
  LogOut,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart2,
  CheckCircle,
  Clock,
  History,
  Settings,
  ArrowLeft,
} from '@/components/icons'
import { useAuthStore } from '@/stores/auth.store'
import { useAdminStore } from '@/stores/admin.store'
import { usePolling } from '@/composables/usePolling'
import { useTeacherClasses } from '@/composables/useTeacherClasses'

const { t, locale } = useI18n({ useScope: 'global' })
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const adminStore = useAdminStore()
const { teacherClasses, refreshTeacherClasses } = useTeacherClasses()

const isCollapsed = ref(false)
// Below `lg` the sidebar is an overlay drawer instead of a column.
const mobileOpen = ref(false)
const desktopQuery = window.matchMedia('(min-width: 1024px)')
const isDesktop = ref(desktopQuery.matches)
const collapsed = computed(() => isCollapsed.value && isDesktop.value)
const onViewportChange = (e: MediaQueryListEvent) => {
  isDesktop.value = e.matches
  if (e.matches) mobileOpen.value = false
}
const isDropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

interface NavItem { path: string; label: string; icon: Component; badge?: number; initial?: string }
interface NavGroup { key: string; label: string; items: NavItem[] }

const navItem = (path: string, titleKey: string, icon: Component, badge?: number): NavItem => ({
  path, label: t(titleKey), icon, badge,
})

/** Shortcuts to the teacher's own classes, so a class hub is one click away from anywhere. */
const MAX_CLASS_SHORTCUTS = 6
const classShortcuts = computed<NavItem[]>(() =>
  teacherClasses.value.slice(0, MAX_CLASS_SHORTCUTS).map((c) => ({
    path: `/teacher/classes/${c.id}`,
    label: c.name,
    icon: Users,
    initial: (c.name.trim()[0] ?? '?').toUpperCase(),
  })),
)

// The main sections of the portal, per role. Page titles and the back button are derived from these.
const mainGroups = computed<NavGroup[]>(() => {
  if (authStore.isAdmin) {
    return [{
      key: 'admin',
      label: t('staff.nav.adminGroup'),
      items: [
        navItem('/teacher/admin/overview', 'staff.nav.overview', LayoutDashboard),
        navItem('/teacher/admin/approvals', 'staff.nav.approvals', CheckCircle, adminStore.pendingTeachers || undefined),
        navItem('/teacher/admin/users', 'staff.nav.users', Users),
        navItem('/teacher/admin/activity', 'staff.nav.activity', History),
        navItem('/teacher/admin/ai', 'staff.nav.ai', Settings),
      ],
    }]
  }
  if (!authStore.isTeacherApproved) {
    // Pending / rejected teachers only see their application status.
    return [{
      key: 'application',
      label: t('teacher.nav.management'),
      items: [navItem('/teacher/pending', 'teacher.pending.navTitle', Clock)],
    }]
  }
  return [
    {
      key: 'management',
      label: t('teacher.nav.management'),
      items: [
        navItem('/teacher/dashboard', 'teacher.nav.dashboard', LayoutDashboard),
        navItem('/teacher/classes', 'teacher.nav.classes', BookOpen),
        navItem('/teacher/students', 'teacher.nav.students', Users),
        navItem('/teacher/analytics', 'teacher.nav.analytics', BarChart2),
      ],
    },
    {
      key: 'content',
      label: t('teacher.nav.content'),
      items: [
        navItem('/teacher/lessons', 'teacher.nav.lessons', GraduationCap),
        navItem('/teacher/vocabulary', 'teacher.nav.vocabulary', Languages),
        navItem('/teacher/tests', 'teacher.nav.tests', FileText),
      ],
    },
  ]
})

const navGroups = computed<NavGroup[]>(() => {
  if (!authStore.isTeacherApproved || authStore.isAdmin || classShortcuts.value.length === 0) {
    return mainGroups.value
  }
  return [
    ...mainGroups.value,
    { key: 'my-classes', label: t('teacher.nav.myClasses'), items: classShortcuts.value },
  ]
})

const mainItems = computed(() => mainGroups.value.flatMap((g) => g.items))
const allItems = computed(() => navGroups.value.flatMap((g) => g.items))

const portalLabel = computed(() => (authStore.isAdmin ? t('staff.portal') : t('teacher.nav.portal')))
const roleLabel = computed(() => (authStore.isAdmin ? t('staff.roleAdmin') : t('teacher.nav.teacher')))

const matches = (path: string) => route.path === path || route.path.startsWith(path + '/')
const longestMatch = (items: NavItem[]) =>
  [...items].sort((a, b) => b.path.length - a.path.length).find((i) => matches(i.path))

// The single highlighted entry: a class shortcut wins over the "Classes" section it lives under.
const activePath = computed(() => longestMatch(allItems.value)?.path ?? '')

const isSubPage = computed(() => !mainItems.value.some((i) => i.path === route.path))
const parentItem = computed(() => longestMatch(mainItems.value))

const currentPageTitle = computed(() => longestMatch(allItems.value)?.label ?? portalLabel.value)

const userName = computed(() => {
  if (authStore.user?.name) return authStore.user.name
  if (authStore.user?.email) return authStore.user.email.split('@')[0] ?? 'Teacher'
  return 'Teacher'
})

const userInitials = computed(() => {
  const name = userName.value
  const parts = name.split(' ')
  return parts.map((p: string) => p[0] ?? '').join('').toUpperCase().slice(0, 2)
})

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}

const handleClickOutside = (e: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target as Node)) {
    isDropdownOpen.value = false
  }
}

// Admins get a live count of applications waiting for review.
const loadPending = () => { if (authStore.isAdmin) void adminStore.fetchPendingTeachers() }
watch(() => route.path, loadPending)
watch(() => route.path, () => { mobileOpen.value = false })

// A teacher's approval can change while they work (an admin rejects or re-opens the account):
// re-read it regularly and drop back to the status page the moment it is no longer "approved".
usePolling(() => (authStore.isTeacher ? authStore.refreshProfile() : undefined), 60000)
watch(
  () => authStore.isTeacherApproved,
  (approved) => {
    if (authStore.isTeacher && !approved && route.path !== '/teacher/pending') {
      router.replace('/teacher/pending')
    }
  },
)

const loadClasses = () => { if (authStore.isTeacher && authStore.isTeacherApproved) void refreshTeacherClasses() }
watch(() => authStore.isTeacherApproved, loadClasses)

onMounted(() => {
  desktopQuery.addEventListener('change', onViewportChange)
  document.addEventListener('click', handleClickOutside)
  loadPending()
  loadClasses()
})
onUnmounted(() => {
  desktopQuery.removeEventListener('change', onViewportChange)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.98);
}

/* Page transitions (same feel as the student layout) */
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
</style>
