<template>
  <div class="space-y-6">
    <div class="bg-card border-border rounded-2xl border p-6">
      <h2 class="text-foreground mb-6 flex items-center gap-2 text-lg font-semibold">
        <User class="text-primary h-5 w-5" />
        {{ $t('settings.account.accountInfo') }}
      </h2>

      <!-- Profile Picture -->
      <div class="mb-6 flex items-center gap-4">
        <div class="bg-primary text-primary-foreground flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold">
          {{ userInitials }}
        </div>
        <div>
          <button class="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium transition-all hover:opacity-90">
            {{ $t('settings.account.changeAvatarBtn') }}
          </button>
          <p class="text-muted-foreground mt-2 text-xs">{{ $t('settings.account.avatarHint') }}</p>
        </div>
      </div>

      <!-- Form Fields -->
      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label class="text-foreground mb-2 block text-sm font-medium">{{ $t('settings.account.fullName') }}</label>
          <input
            :value="account.fullName"
            type="text"
            class="bg-secondary border-border text-foreground placeholder:text-muted-foreground w-full rounded-lg border px-4 py-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
            @input="$emit('update:account', { ...account, fullName: ($event.target as HTMLInputElement).value })"
          />
        </div>
        <div>
          <label class="text-foreground mb-2 block text-sm font-medium">{{ $t('settings.account.username') }}</label>
          <input
            :value="account.username"
            type="text"
            class="bg-secondary border-border text-foreground placeholder:text-muted-foreground w-full rounded-lg border px-4 py-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
            @input="$emit('update:account', { ...account, username: ($event.target as HTMLInputElement).value })"
          />
        </div>
        <div class="sm:col-span-2">
          <label class="text-foreground mb-2 block text-sm font-medium">{{ $t('settings.account.email') }}</label>
          <input
            :value="account.email"
            type="email"
            class="bg-secondary border-border text-foreground placeholder:text-muted-foreground w-full rounded-lg border px-4 py-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
            @input="$emit('update:account', { ...account, email: ($event.target as HTMLInputElement).value })"
          />
        </div>
      </div>

      <div class="mt-6 flex justify-end">
        <button
          class="bg-primary text-primary-foreground rounded-lg px-6 py-2.5 text-sm font-medium transition-all hover:opacity-90"
          @click="$emit('save')"
        >
          {{ $t('settings.account.saveChanges') }}
        </button>
      </div>
    </div>

    <!-- Teacher Portal (only shown for teacher accounts) -->
    <div v-if="authStore.isTeacher" class="bg-card border-border rounded-2xl border p-6">
      <h2 class="text-foreground mb-4 flex items-center gap-2 text-lg font-semibold">
        <GraduationCap class="text-primary h-5 w-5" />
        {{ $t('settings.account.teacherPortal.title') }}
      </h2>
      <div class="flex items-center justify-between">
        <div>
          <p class="text-foreground text-sm font-medium">{{ $t('settings.account.teacherPortal.hasAccess') }}</p>
          <p class="text-muted-foreground mt-0.5 text-xs">{{ $t('settings.account.teacherPortal.accessDesc') }}</p>
        </div>
        <button
          class="bg-primary text-primary-foreground flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all hover:opacity-90"
          @click="goToTeacherDashboard"
        >
          <GraduationCap class="h-4 w-4" />
          {{ $t('settings.account.teacherPortal.goToDashboard') }}
        </button>
      </div>
    </div>

    <!-- Password Change -->
    <div class="bg-card border-border rounded-2xl border p-6">
      <h2 class="text-foreground mb-6 flex items-center gap-2 text-lg font-semibold">
        <Lock class="text-primary h-5 w-5" />
        {{ $t('settings.account.changePassword') }}
      </h2>

      <div class="space-y-4">
        <div>
          <label class="text-foreground mb-2 block text-sm font-medium">{{ $t('settings.account.currentPassword') }}</label>
          <input
            :value="password.current"
            type="password"
            class="bg-secondary border-border text-foreground w-full rounded-lg border px-4 py-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
            @input="$emit('update:password', { ...password, current: ($event.target as HTMLInputElement).value })"
          />
        </div>
        <div>
          <label class="text-foreground mb-2 block text-sm font-medium">{{ $t('settings.account.newPassword') }}</label>
          <input
            :value="password.new"
            type="password"
            class="bg-secondary border-border text-foreground w-full rounded-lg border px-4 py-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
            @input="$emit('update:password', { ...password, new: ($event.target as HTMLInputElement).value })"
          />
        </div>
        <div>
          <label class="text-foreground mb-2 block text-sm font-medium">{{ $t('settings.account.confirmNewPassword') }}</label>
          <input
            :value="password.confirm"
            type="password"
            class="bg-secondary border-border text-foreground w-full rounded-lg border px-4 py-2.5 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50"
            @input="$emit('update:password', { ...password, confirm: ($event.target as HTMLInputElement).value })"
          />
        </div>
      </div>

      <div class="mt-6 flex justify-end">
        <button
          class="bg-secondary text-foreground hover:bg-secondary/80 rounded-lg px-6 py-2.5 text-sm font-medium transition-all"
          @click="$emit('changePassword')"
        >
          {{ $t('settings.account.updatePassword') }}
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock, GraduationCap } from '@/components/icons'
import { useAuthStore } from '@/stores/auth.store'

export interface AccountData {
  fullName: string
  username: string
  email: string
}

export interface PasswordData {
  current: string
  new: string
  confirm: string
}

const props = defineProps<{
  account: AccountData
  password: PasswordData
}>()

defineEmits<{
  'update:account': [value: AccountData]
  'update:password': [value: PasswordData]
  save: []
  changePassword: []
}>()

const router = useRouter()
const authStore = useAuthStore()

const goToTeacherDashboard = () => {
  router.push('/teacher/dashboard')
}

const userInitials = computed(() => {
  const names = props.account.fullName.split(' ')
  return names.map(n => n[0]).join('').toUpperCase().slice(0, 2)
})
</script>
