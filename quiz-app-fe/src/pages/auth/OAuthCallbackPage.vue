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
import { useI18n } from 'vue-i18n'
import { supabase } from '@/lib/supabase'
import { api } from '@/utils/api'
import { useAuthStore } from '@/stores/auth.store'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()
const message = ref(t('authPages.oauth.signingIn'))

/** Show a failure message, log the cause, and send the user back to the login page. */
function fail(key: 'failed' | 'loginFailed', cause?: unknown) {
  if (cause) console.error('OAuth sign-in failed:', cause)
  message.value = t(`authPages.oauth.${key}`)
  setTimeout(() => router.push('/login'), 1500)
}

onMounted(async () => {
  try {
    // The provider may return an error in the URL
    const urlParams = new URLSearchParams(window.location.search)
    const urlError = urlParams.get('error')
    if (urlError) return fail('failed', `${urlError}: ${urlParams.get('error_description') ?? ''}`)

    // PKCE flow: exchange the code for a Supabase session
    const code = urlParams.get('code')
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      if (exchangeError) return fail('failed', exchangeError)
    }

    // Works for both implicit and PKCE flows
    const { data, error } = await supabase.auth.getSession()
    if (error || !data.session) return fail('failed', error ?? 'no session')

    // Exchange the Supabase session for our own tokens (the backend verifies it with Supabase)
    await authStore.completeLogin(await api.oauthLogin(data.session.access_token))

    // From here on we use our own JWT
    await supabase.auth.signOut()

    message.value = t('authPages.oauth.success')
    // Route by role — an existing teacher account signing in with Google lands in the teacher portal.
    setTimeout(() => router.push(authStore.homePath), 500)
  } catch (err) {
    fail('loginFailed', err)
  }
})
</script>
