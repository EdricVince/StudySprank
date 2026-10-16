<template>
  <div class="flex w-full max-w-md flex-col gap-8">
    <!-- Title -->
    <div class="animate-fade-in-down text-center lg:text-left">
      <div class="bg-primary/10 text-primary mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl lg:mx-0">
        <KeyRound class="h-7 w-7" />
      </div>
      <h1 class="text-foreground text-3xl font-bold tracking-tight">Set a new password</h1>
      <p class="text-muted-foreground mt-2 text-base">Choose a strong new password for your account.</p>
    </div>

    <!-- Invalid link -->
    <div v-if="!token" class="border-destructive/30 bg-destructive/10 flex items-center gap-3 rounded-xl border p-4">
      <div class="bg-destructive/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
        <AlertCircle class="text-destructive h-5 w-5" />
      </div>
      <p class="text-foreground text-sm font-medium">This reset link is missing its token. Please request a new one.</p>
    </div>

    <!-- Success -->
    <Transition name="fade-scale">
      <div v-if="success" class="animate-fade-in-up border-chart-2/30 bg-chart-2/10 flex items-center gap-3 rounded-xl border p-4">
        <div class="bg-chart-2/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <CheckCircle class="text-chart-2 h-5 w-5" />
        </div>
        <div>
          <p class="text-foreground text-sm font-medium">Password updated</p>
          <p class="text-muted-foreground text-sm">Redirecting you to sign in…</p>
        </div>
      </div>
    </Transition>

    <!-- Error -->
    <Transition name="fade-scale">
      <div v-if="error" class="animate-fade-in-up border-destructive/30 bg-destructive/10 flex items-center gap-3 rounded-xl border p-4">
        <div class="bg-destructive/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <AlertCircle class="text-destructive h-5 w-5" />
        </div>
        <p class="text-foreground text-sm font-medium">{{ error }}</p>
      </div>
    </Transition>

    <!-- Form -->
    <form v-if="token && !success" class="animate-fade-in-up delay-100 space-y-5" @submit.prevent="handleSubmit">
      <div class="space-y-2">
        <label class="text-foreground text-sm font-medium">New password</label>
        <div class="relative">
          <Lock class="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2" />
          <input
            v-model="password"
            :type="show ? 'text' : 'password'"
            autocomplete="new-password"
            placeholder="At least 8 characters"
            class="border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 h-12 w-full rounded-xl border pl-12 pr-12 text-base transition-all focus:ring-2 focus:outline-none"
          />
          <button type="button" class="text-muted-foreground hover:text-foreground absolute top-1/2 right-4 -translate-y-1/2" tabindex="-1" @click="show = !show">
            <Eye v-if="show" class="h-5 w-5" />
            <EyeOff v-else class="h-5 w-5" />
          </button>
        </div>
      </div>

      <div class="space-y-2">
        <label class="text-foreground text-sm font-medium">Confirm new password</label>
        <div class="relative">
          <Lock class="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2" />
          <input
            v-model="confirm"
            :type="show ? 'text' : 'password'"
            autocomplete="new-password"
            placeholder="Re-enter your new password"
            class="border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary/20 h-12 w-full rounded-xl border pl-12 text-base transition-all focus:ring-2 focus:outline-none"
          />
        </div>
      </div>

      <Button
        type="submit"
        :disabled="loading || password.length < 8 || confirm.length < 8"
        class="bg-primary text-primary-foreground hover:bg-primary/90 h-12 w-full cursor-pointer rounded-xl text-base font-semibold shadow-sm transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Spinner v-if="loading" class="mr-2 h-5 w-5 animate-spin" />
        <span>{{ loading ? 'Updating…' : 'Reset password' }}</span>
      </Button>
    </form>

    <button
      type="button"
      class="animate-fade-in-up group delay-300 flex items-center justify-center gap-1.5 rounded-full border border-indigo-500/25 bg-indigo-500/8 px-5 py-2.5 text-sm font-semibold text-indigo-400 transition-all duration-200 hover:border-indigo-500/40 hover:bg-indigo-500/15 active:scale-95"
      @click="router.push({ name: 'Login' })"
    >
      <svg class="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      Back to Sign In
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { KeyRound, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from '@/components/icons'
import Button from '@/components/ui/button/Button.vue'
import Spinner from '@/components/ui/spinner/Spinner.vue'
import { api, ApiError } from '@/utils/api'

const route = useRoute()
const router = useRouter()

const token = ref((route.query.token as string) || '')
const password = ref('')
const confirm = ref('')
const show = ref(false)
const loading = ref(false)
const success = ref(false)
const error = ref('')

const handleSubmit = async () => {
  if (loading.value) return
  error.value = ''
  if (password.value.length < 8) { error.value = 'Password must be at least 8 characters.'; return }
  if (password.value !== confirm.value) { error.value = 'Passwords do not match.'; return }

  loading.value = true
  try {
    await api.confirmResetPassword(token.value, password.value)
    success.value = true
    setTimeout(() => router.push({ name: 'Login' }), 1800)
  } catch (e) {
    error.value = e instanceof ApiError ? e.errorMessage : 'Could not reset your password. Please try again.'
  } finally {
    loading.value = false
  }
}
</script>
