<template>
  <div class="bg-background flex h-screen overflow-hidden">
    <!-- Sidebar -->
    <aside
      class="bg-sidebar border-sidebar-border flex flex-col overflow-hidden border-r transition-all duration-300 ease-in-out"
      :class="[isCollapsed ? 'w-20' : 'w-64']"
    >
      <!-- Logo -->
      <div class="border-sidebar-border flex h-16 items-center border-b px-4">
        <div
          class="flex cursor-pointer items-center gap-3 overflow-hidden"
          @click="router.push(authStore.homePath)"
        >
          <div class="bg-sidebar-primary text-sidebar-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <Sparkles class="h-5 w-5" />
          </div>
          <div
            class="flex flex-col whitespace-nowrap transition-opacity duration-300"
            :class="[isCollapsed ? 'opacity-0' : 'opacity-100']"
          >
            <span class="text-sidebar-foreground text-base font-bold leading-tight tracking-tight">StudySpark</span>
            <span class="text-primary text-xs font-semibold">{{ portalLabel }}</span>
          </div>
        </div>
      </div>

      <!-- Navigation: one list of groups, built from the signed-in role -->
      <nav class="flex-1 space-y-4 overflow-y-auto p-3">
        <div v-for="group in navGroups" :key="group.key">
          <p
            v-if="!isCollapsed"
            class="text-sidebar-foreground/50 mb-2 px-3 text-xs font-semibold uppercase tracking-wider"
          >
            {{ group.label }}
          </p>
          <div v-else class="border-sidebar-border mb-2 border-t"></div>

          <router-link
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            class="nav-item group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200"
            :class="[
              isActive(item.path)
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            ]"
          >
            <div
              v-if="isActive(item.path)"
              class="bg-sidebar-primary absolute left-0 h-6 w-1 rounded-r-full"
            ></div>
            <component :is="item.icon" class="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
            <span
              class="flex-1 whitespace-nowrap transition-opacity duration-300"
              :class="[isCollapsed ? 'opacity-0' : 'opacity-100']"
            >
              {{ item.label }}
            </span>
            <span
              v-if="item.badge && !isCollapsed"
              class="bg-primary text-primary-foreground min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold leading-none"
            >
              {{ item.badge }}
            </span>
            <div
              v-if="isCollapsed"
              class="bg-sidebar-foreground text-sidebar pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100"
            >
              {{ item.label }}
            </div>
          </router-link>
        </div>
      </nav>

      <!-- Collapse Button -->
      <div class="border-sidebar-border border-t p-3">
        <button
          class="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200"
          @click="isCollapsed = !isCollapsed"
        >
          <component :is="isCollapsed ? PanelLeftOpen : PanelLeftClose" class="h-5 w-5 shrink-0" />
          <span
            class="whitespace-nowrap transition-opacity duration-300"
            :class="[isCollapsed ? 'opacity-0' : 'opacity-100']"
          >
            {{ $t('teacher.nav.collapse') }}
          </span>
        </button>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Header -->
      <header class="bg-card border-border flex h-16 shrink-0 items-center justify-between border-b px-6">
        <div class="flex items-center gap-4">
          <button
            class="text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg p-2 transition-colors lg:hidden"
            @click="isCollapsed = !isCollapsed"
          >
            <Menu class="h-5 w-5" />
          </button>
          <h1 class="text-foreground text-lg font-semibold">{{ currentPageTitle }}</h1>
        </div>

        <div class="flex items-center gap-3">
          <!-- Role badge -->
          <div class="hidden items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 sm:flex">
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
                class="bg-popover border-border absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border shadow-lg"
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
        <router-view :key="locale" />
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
} from '@/components/icons'
import { useAuthStore } from '@/stores/auth.store'
import { useAdminStore } from '@/stores/admin.store'
import { usePolling } from '@/composables/usePolling'

const { t, locale } = useI18n({ useScope: 'global' })
const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const adminStore = useAdminStore()

const isCollapsed = ref(false)
const isDropdownOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

interface NavItem { path: string; label: string; icon: Component; titleKey: string; badge?: number }
interface NavGroup { key: string; label: string; items: NavItem[] }

const item = (path: string, titleKey: string, icon: Component, badge?: number): NavItem => ({
  path, titleKey, icon, label: t(titleKey), badge,
})

// One shared portal: what the sidebar shows depends on the signed-in role.
const navGroups = computed<NavGroup[]>(() => {
  if (authStore.isAdmin) {
    return [{
      key: 'admin',
      label: t('staff.nav.adminGroup'),
      items: [
        item('/teacher/admin/overview', 'staff.nav.overview', LayoutDashboard),
        item('/teacher/admin/approvals', 'staff.nav.approvals', CheckCircle, adminStore.pendingTeachers || undefined),
        item('/teacher/admin/users', 'staff.nav.users', Users),
        item('/teacher/admin/activity', 'staff.nav.activity', History),
        item('/teacher/admin/ai', 'staff.nav.ai', Settings),
      ],
    }]
  }
  if (!authStore.isTeacherApproved) {
    // Pending / rejected teachers only see their application status.
    return [{
      key: 'application',
      label: t('teacher.nav.management'),
      items: [item('/teacher/pending', 'teacher.pending.navTitle', Clock)],
    }]
  }
  return [
    {
      key: 'management',
      label: t('teacher.nav.management'),
      items: [
        item('/teacher/dashboard', 'teacher.nav.dashboard', LayoutDashboard),
        item('/teacher/classes', 'teacher.nav.classes', BookOpen),
        item('/teacher/students', 'teacher.nav.students', Users),
        item('/teacher/analytics', 'teacher.nav.analytics', BarChart2),
      ],
    },
    {
      key: 'content',
      label: t('teacher.nav.content'),
      items: [
        item('/teacher/lessons', 'teacher.nav.lessons', GraduationCap),
        item('/teacher/vocabulary', 'teacher.nav.vocabulary', Languages),
        item('/teacher/tests', 'teacher.nav.tests', FileText),
      ],
    },
  ]
})

const portalLabel = computed(() => (authStore.isAdmin ? t('staff.portal') : t('teacher.nav.portal')))
const roleLabel = computed(() => (authStore.isAdmin ? t('staff.roleAdmin') : t('teacher.nav.teacher')))

const currentPageTitle = computed(() => {
  const all = navGroups.value.flatMap((g) => g.items)
  const hit = [...all].sort((a, b) => b.path.length - a.path.length).find((i) => isActive(i.path))
  return hit ? hit.label : portalLabel.value
})

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

const isActive = (path: string) =>
  route.path === path || route.path.startsWith(path + '/')

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

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  loadPending()
})
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
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
</style>
