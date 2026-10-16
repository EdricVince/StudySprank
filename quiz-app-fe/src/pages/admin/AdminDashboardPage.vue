<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="adm-h1">Welcome back, Admin</h2>
        <p class="adm-text mt-0.5">Here's what's happening on your platform today.</p>
      </div>
      <button
        :disabled="refreshing"
        class="adm-btn-ghost"
        @click="refresh"
      >
        <svg class="w-4 h-4" :class="{ 'animate-spin': refreshing }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Refresh
      </button>
    </div>

    <!-- Stats Grid -->
    <div v-if="adminStore.stats" class="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard label="Total Users"      :value="adminStore.stats.total"      color="indigo"  icon="users" />
      <StatCard label="Students"         :value="adminStore.stats.students"    color="blue"    icon="student" />
      <StatCard label="Teachers"         :value="adminStore.stats.teachers"    color="violet"  icon="teacher" />
      <StatCard label="Active Accounts"  :value="adminStore.stats.active"      color="emerald" icon="check" />
      <StatCard label="New This Week"    :value="adminStore.stats.newThisWeek" color="amber"   icon="sparkle" />
    </div>

    <!-- Skeleton stats -->
    <div v-else class="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <div v-for="i in 5" :key="i" class="h-24 adm-card animate-pulse" />
    </div>

    <!-- Two-column layout -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Recent Users -->
      <div class="lg:col-span-2 adm-card">
        <div class="adm-card-header">
          <h3 class="adm-h3">Recent Registrations</h3>
          <RouterLink to="/admin/users" class="adm-link text-xs">View all</RouterLink>
        </div>
        <!-- Skeleton -->
        <div v-if="adminStore.loading" class="p-5 space-y-3">
          <div v-for="i in 5" :key="i" class="flex items-center gap-3">
            <div class="adm-skel-c w-9 h-9 shrink-0" />
            <div class="flex-1 space-y-1.5">
              <div class="adm-skel h-3 w-1/3" />
              <div class="adm-skel h-2.5 w-1/2" />
            </div>
          </div>
        </div>
        <!-- List -->
        <div v-else-if="recentUsers.length" class="adm-divide">
          <div
            v-for="user in recentUsers"
            :key="user.id"
            class="adm-tr flex items-center gap-3 px-5 py-3"
          >
            <div
              class="adm-avatar"
              :class="user.role_id === 2 ? 'adm-avatar-teacher' : 'adm-avatar-student'"
            >
              {{ initials(user.name ?? user.email) }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-foreground truncate">{{ user.name ?? '—' }}</p>
              <p class="adm-meta truncate">{{ user.email }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span
                class="adm-badge"
                :class="user.role_id === 2 ? 'adm-badge-teacher' : 'adm-badge-student'"
              >{{ user.role_id === 2 ? 'Teacher' : 'Student' }}</span>
              <span class="adm-meta">{{ formatDate(user.created_at) }}</span>
            </div>
          </div>
        </div>
        <div v-else class="px-5 py-10 text-center adm-meta">No users yet</div>
      </div>

      <!-- Right column -->
      <div class="space-y-4">
        <!-- Quick Actions -->
        <div class="adm-card p-5">
          <h3 class="adm-h3 mb-4">Quick Actions</h3>
          <div class="space-y-2.5">
            <RouterLink to="/admin/teachers" class="adm-btn-soft-primary rounded-lg">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Create Teacher Account
            </RouterLink>
            <RouterLink to="/admin/users" class="adm-btn-soft-neutral rounded-lg">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Manage All Users
            </RouterLink>
            <RouterLink to="/admin/students" class="adm-btn-soft-neutral rounded-lg">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
              View Students
            </RouterLink>
          </div>
        </div>

        <!-- Role Distribution -->
        <div v-if="adminStore.stats" class="adm-card p-5">
          <h3 class="adm-h3 mb-4">User Distribution</h3>
          <div class="space-y-3">
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="adm-text">Students</span>
                <span class="font-semibold text-foreground">{{ adminStore.stats.students }}</span>
              </div>
              <div class="adm-bar-track">
                <div
                  class="adm-bar-blue"
                  :style="{ width: adminStore.stats.total ? (adminStore.stats.students / adminStore.stats.total * 100) + '%' : '0%' }"
                />
              </div>
            </div>
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="adm-text">Teachers</span>
                <span class="font-semibold text-foreground">{{ adminStore.stats.teachers }}</span>
              </div>
              <div class="adm-bar-track">
                <div
                  class="adm-bar-violet"
                  :style="{ width: adminStore.stats.total ? (adminStore.stats.teachers / adminStore.stats.total * 100) + '%' : '0%' }"
                />
              </div>
            </div>
            <div>
              <div class="flex justify-between text-xs mb-1">
                <span class="adm-text">Active Rate</span>
                <span class="font-semibold text-foreground">{{ adminStore.stats.total ? Math.round(adminStore.stats.active / adminStore.stats.total * 100) : 0 }}%</span>
              </div>
              <div class="adm-bar-track">
                <div
                  class="adm-bar-emerald"
                  :style="{ width: adminStore.stats.total ? (adminStore.stats.active / adminStore.stats.total * 100) + '%' : '0%' }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, defineComponent, h } from 'vue'
import { useAdminStore } from '@/stores/admin.store'

const adminStore = useAdminStore()
const refreshing = ref(false)

const recentUsers = computed(() => [...adminStore.users].slice(0, 8))

function initials(str: string) {
  return str.split(/[\s.@_-]+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('')
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

async function refresh() {
  refreshing.value = true
  try {
    await Promise.all([adminStore.fetchStats(), adminStore.fetchUsers()])
  } finally {
    refreshing.value = false
  }
}

onMounted(async () => {
  if (!adminStore.stats) await adminStore.fetchStats()
  if (!adminStore.users.length) await adminStore.fetchUsers()
})

interface StatCardProps { label: string; value: number; color: string; icon: string }

const colorMap: Record<string, string> = {
  indigo:  'adm-icon-indigo',
  blue:    'adm-icon-blue',
  violet:  'adm-icon-violet',
  emerald: 'adm-icon-emerald',
  amber:   'adm-icon-amber',
}

const StatCard = defineComponent<StatCardProps>({
  props: ['label', 'value', 'color', 'icon'],
  setup(props) {
    return () => h('div', { class: 'adm-card p-4' }, [
      h('div', { class: 'flex items-center justify-between mb-3' }, [
        h('span', { class: `inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm ${colorMap[props.color] ?? colorMap.indigo}` }, props.icon[0]?.toUpperCase()),
      ]),
      h('div', { class: 'text-2xl font-bold text-foreground' }, props.value?.toLocaleString()),
      h('div', { class: 'adm-meta mt-0.5' }, props.label),
    ])
  },
})
</script>
