<template>
  <div class="flex h-screen overflow-hidden bg-background">
    <!-- Sidebar -->
    <aside class="flex flex-col w-64 shrink-0 bg-slate-900 text-white">
      <!-- Logo -->
      <div class="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div class="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-600 shrink-0">
          <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <p class="text-sm font-bold leading-none">Admin Portal</p>
          <p class="text-[11px] text-slate-400 mt-0.5">SPRK Platform</p>
        </div>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p class="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Overview</p>

        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
          :class="isActive(item.to)
            ? 'bg-indigo-600 text-white'
            : 'text-slate-400 hover:bg-white/5 hover:text-white'"
        >
          <component :is="item.icon" class="w-4.5 h-4.5 shrink-0" />
          {{ item.label }}
        </RouterLink>

        <div class="pt-4">
          <p class="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Management</p>
          <RouterLink
            v-for="item in mgmtItems"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            :class="isActive(item.to)
              ? 'bg-indigo-600 text-white'
              : 'text-slate-400 hover:bg-white/5 hover:text-white'"
          >
            <component :is="item.icon" class="w-4.5 h-4.5 shrink-0" />
            {{ item.label }}
          </RouterLink>
        </div>
      </nav>

      <!-- Footer -->
      <div class="px-3 py-4 border-t border-white/10 space-y-1">
        <div class="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <div class="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">A</div>
          <div class="flex-1 min-w-0">
            <p class="text-xs font-semibold text-white truncate">Administrator</p>
            <p class="text-[10px] text-slate-500 truncate">Super Admin</p>
          </div>
        </div>
        <button
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          @click="handleLogout"
        >
          <IconLogout class="w-4.5 h-4.5" />
          Sign Out
        </button>
      </div>
    </aside>

    <!-- Main content -->
    <div class="flex flex-col flex-1 min-w-0 overflow-hidden">
      <!-- Top bar -->
      <header class="flex items-center gap-4 px-6 h-14 bg-card border-b border-border shrink-0">
        <h1 class="text-sm font-semibold text-foreground">{{ pageTitle }}</h1>
        <div class="ml-auto flex items-center gap-3">
          <span class="text-[11px] text-muted-foreground">{{ currentDate }}</span>
          <div class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <span class="text-[11px] text-emerald-600 font-medium">Online</span>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-y-auto">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminStore } from '@/stores/admin.store'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}

const pageTitle = computed(() => {
  const map: Record<string, string> = {
    '/admin/dashboard': 'Dashboard',
    '/admin/users': 'User Management',
    '/admin/students': 'Students',
    '/admin/teachers': 'Teachers',
    '/admin/ai': 'AI Configuration',
  }
  for (const [key, val] of Object.entries(map)) {
    if (route.path.startsWith(key)) return val
  }
  return 'Admin'
})

const currentDate = computed(() => new Date().toLocaleDateString('en-GB', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
}))

async function handleLogout() {
  adminStore.logout()
  await router.push('/admin/login')
}

// Inline SVG icon components
const IconHome = defineComponent({ render: () => h('svg', { fill:'none', viewBox:'0 0 24 24', stroke:'currentColor', 'stroke-width':'2' }, [
  h('path', { 'stroke-linecap':'round', 'stroke-linejoin':'round', d:'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' })
]) })

const IconUsers = defineComponent({ render: () => h('svg', { fill:'none', viewBox:'0 0 24 24', stroke:'currentColor', 'stroke-width':'2' }, [
  h('path', { 'stroke-linecap':'round', 'stroke-linejoin':'round', d:'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' })
]) })

const IconLogout = defineComponent({ render: () => h('svg', { fill:'none', viewBox:'0 0 24 24', stroke:'currentColor', 'stroke-width':'2' }, [
  h('path', { 'stroke-linecap':'round', 'stroke-linejoin':'round', d:'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1' })
]) })

const IconAI = defineComponent({ render: () => h('svg', { fill:'none', viewBox:'0 0 24 24', stroke:'currentColor', 'stroke-width':'2' }, [
  h('path', { 'stroke-linecap':'round', 'stroke-linejoin':'round', d:'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-1' })
]) })

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: IconHome },
  { to: '/admin/ai', label: 'AI Settings', icon: IconAI },
]

// Students and teachers are managed from one place — the Users page has
// All / Students / Teachers tabs — so Management holds a single "Users" entry.
const mgmtItems = [
  { to: '/admin/users', label: 'Users', icon: IconUsers },
]
</script>
