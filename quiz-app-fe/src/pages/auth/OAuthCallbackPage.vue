<template>
  <div class="flex min-h-screen items-center justify-center">
    <div class="text-center">
      <div class="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"></div>
      <p class="text-muted-foreground text-sm">{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/lib/supabase'
import { api } from '@/utils/api'
import { useAuthStore } from '@/stores/auth.store'
import { useProgressStore } from '@/stores/progress.store'

const router = useRouter()
const authStore = useAuthStore()
const progressStore = useProgressStore()
const message = ref('Signing you in...')

onMounted(async () => {
  try {
    // Check if OAuth provider returned an error in URL params
    const urlParams = new URLSearchParams(window.location.search)
    const urlError = urlParams.get('error')
    if (urlError) {
      console.error('OAuth error from provider:', urlError, urlParams.get('error_description'))
      message.value = 'Authentication failed. Redirecting...'
      setTimeout(() => router.push('/login'), 1500)
      return
    }

    // PKCE flow: exchange code for session if code is present
    const code = urlParams.get('code')
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      if (exchangeError) {
        console.error('Code exchange error:', exchangeError)
        message.value = 'Authentication failed. Redirecting...'
        setTimeout(() => router.push('/login'), 1500)
        return
      }
    }

    // Get session (works for both implicit and PKCE flow)
    const { data, error } = await supabase.auth.getSession()

    if (error || !data.session) {
      console.error('No session after OAuth:', error)
      message.value = 'Authentication failed. Redirecting...'
      setTimeout(() => router.push('/login'), 1500)
      return
    }

    // Exchange Supabase session for our own JWT (BE verifies the token with Supabase)
    const resp = await api.oauthLogin(data.session.access_token)
    authStore.setTokens(resp.access_token, resp.refresh_token)
    authStore.setUser({
      id: resp.user.id,
      email: resp.user.email,
      is_active: resp.user.is_active,
      role_id: resp.user.role_id,
    })

    // Fetch full profile
    try {
      const profile = await api.getProfile()
      authStore.setUser({
        id: profile.id,
        email: profile.email,
        name: profile.name ?? undefined,
        is_active: profile.is_active,
        role_id: profile.role_id,
      })
    } catch { /* non-critical */ }

    void Promise.all([progressStore.fetchProgress(), progressStore.fetchWeekly(), progressStore.fetchLeaderboard()])

    // Sign out of Supabase (we use our own JWT from here)
    await supabase.auth.signOut()

    message.value = 'Success! Redirecting...'
    setTimeout(() => router.push('/dashboard'), 500)
  } catch (err) {
    console.error('OAuth callback error:', err)
    message.value = 'Login failed. Redirecting...'
    setTimeout(() => router.push('/login'), 1500)
  }
})
</script>
