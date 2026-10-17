<template>
  <div class="flex w-full max-w-md flex-col gap-8">
    <!-- Title Section -->
    <div class="animate-fade-in-down text-center lg:text-left">
      <h1 class="text-foreground text-3xl font-bold tracking-tight">{{ $t('auth.login.title') }}</h1>
      <p class="text-muted-foreground mt-2 text-base">
        {{ $t('auth.login.subtitle') }}
      </p>
    </div>

    <!-- Role Selector -->
    <div class="animate-fade-in-up delay-75 grid grid-cols-2 gap-3">
      <button
        type="button"
        class="flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all"
        :class="
          selectedRole === 'student'
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-accent'
        "
        @click="switchRole('student')"
      >
        <GraduationCap class="h-5 w-5 shrink-0" />
        <div class="text-left">
          <p class="text-sm font-semibold">{{ $t('auth.login.roleStudent') }}</p>
          <p class="text-xs opacity-70">{{ $t('auth.login.roleStudentDesc') }}</p>
        </div>
      </button>
      <button
        type="button"
        class="flex items-center gap-3 rounded-xl border-2 px-4 py-3 transition-all"
        :class="
          selectedRole === 'teacher'
            ? 'border-primary bg-primary/5 text-primary'
            : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:bg-accent'
        "
        @click="switchRole('teacher')"
      >
        <Users class="h-5 w-5 shrink-0" />
        <div class="text-left">
          <p class="text-sm font-semibold">{{ $t('auth.login.roleTeacher') }}</p>
          <p class="text-xs opacity-70">{{ $t('auth.login.roleTeacherDesc') }}</p>
        </div>
      </button>
    </div>

    <!-- Teacher info banner -->
    <div
      v-if="selectedRole === 'teacher'"
      class="animate-fade-in rounded-xl border border-primary/30 bg-primary/5 p-4"
    >
      <div class="flex items-start gap-3">
        <GraduationCap class="text-primary mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p class="text-foreground text-sm font-semibold">{{ $t('auth.login.teacherPortalAccess') }}</p>
          <p class="text-muted-foreground mt-0.5 text-xs">
            {{ $t('auth.login.teacherBanner') }}
          </p>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <div
      v-if="errorMessage"
      class="animate-fade-in rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
    >
      {{ errorMessage }}
    </div>

    <!-- Login Form -->
    <form class="animate-fade-in-up delay-100 space-y-5" @submit="handleSignIn">
      <!-- Email Field -->
      <FormField v-slot="{ componentField }" name="email">
        <FormItem class="space-y-2">
          <FormLabel class="text-foreground text-sm font-medium">{{ $t('auth.login.email') }}</FormLabel>
          <FormControl>
            <div class="relative">
              <Mail class="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2" />
              <Input
                v-bind="componentField"
                type="email"
                autocomplete="email"
                :placeholder="selectedRole === 'teacher' ? 'yourname@teacher.sprk' : 'name@example.com'"
                class="border-input bg-background focus:border-primary focus:ring-primary/20 h-12 rounded-xl pl-12 text-base transition-all focus:ring-2"
              />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <!-- Password Field -->
      <FormField v-slot="{ componentField }" name="password">
        <FormItem class="space-y-2">
          <div class="flex items-center justify-between">
            <FormLabel class="text-foreground text-sm font-medium">{{ $t('auth.login.password') }}</FormLabel>
            <Button
              type="button"
              variant="link"
              class="text-primary hover:text-primary/80 h-auto p-0 text-sm font-medium"
              @click="goToForgotPassword"
            >
              {{ $t('auth.login.forgotPassword') }}
            </Button>
          </div>
          <FormControl>
            <div class="relative">
              <Lock class="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2" />
              <Input
                v-bind="componentField"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                :placeholder="$t('auth.login.passwordPlaceholder')"
                class="border-input bg-background focus:border-primary focus:ring-primary/20 h-12 rounded-xl pl-12 pr-12 text-base transition-all focus:ring-2"
              />
              <button
                type="button"
                class="text-muted-foreground hover:text-foreground absolute top-1/2 right-4 -translate-y-1/2 p-1 transition-colors"
                @click="showPassword = !showPassword"
              >
                <Eye v-if="showPassword" class="h-5 w-5" />
                <EyeOff v-else class="h-5 w-5" />
              </button>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <!-- Remember me -->
      <div class="flex items-center">
        <Checkbox v-model:checked="rememberMe" class="cursor-pointer">
          <span class="text-muted-foreground select-none text-sm">{{ $t('auth.login.rememberMe') }}</span>
        </Checkbox>
      </div>

      <!-- Submit Button -->
      <Button
        type="submit"
        :disabled="isSubmitting"
        class="bg-primary text-primary-foreground hover:bg-primary/90 h-12 w-full cursor-pointer rounded-xl text-base font-semibold shadow-sm transition-all duration-200 hover:shadow-md"
      >
        <Spinner v-if="isSubmitting" class="mr-2 h-5 w-5 animate-spin" />
        <span>{{ isSubmitting ? $t('auth.login.signingIn') : $t('auth.login.signIn') }}</span>
      </Button>
    </form>

    <!-- Divider (hidden for teacher tab) -->
    <template v-if="selectedRole === 'student'">
      <div class="animate-fade-in-up delay-200 relative">
        <div class="absolute inset-0 flex items-center">
          <div class="border-border w-full border-t"></div>
        </div>
        <div class="relative flex justify-center">
          <span class="bg-background text-muted-foreground px-4 text-sm">{{ $t('auth.login.orContinueWith') }}</span>
        </div>
      </div>

      <!-- Social Login -->
      <div class="animate-fade-in-up delay-300 grid grid-cols-2 gap-4">
        <Button
          type="button"
          variant="outline"
          class="border-border hover:bg-accent h-12 cursor-pointer gap-2 rounded-xl text-sm font-medium transition-all"
          @click="handleGoogleSignIn"
        >
          <Icon name="google" class="h-5 w-5" />
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          class="border-border hover:bg-accent h-12 cursor-pointer gap-2 rounded-xl text-sm font-medium transition-all"
          @click="handleFacebookSignIn"
        >
          <Icon name="facebook" class="h-5 w-5" />
          Facebook
        </Button>
      </div>
    </template>

    <!-- Sign up link (hidden for teacher tab) -->
    <p v-if="selectedRole === 'student'" class="animate-fade-in-up delay-400 text-muted-foreground text-center text-sm">
      {{ $t('auth.login.noAccount') }}
      <Button
        type="button"
        variant="link"
        class="text-primary hover:text-primary/80 h-auto p-0 font-semibold"
        @click="goToRegister"
      >
        {{ $t('auth.login.createAccount') }}
      </Button>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { Eye, EyeOff, Mail, Lock, GraduationCap, Users } from '@/components/icons'

import Button from '@/components/ui/button/Button.vue'
import Input from '@/components/ui/input/Input.vue'
import Icon from '@/components/ui/icon/Icon.vue'
import Checkbox from '@/components/ui/checkbox/Checkbox.vue'
import Spinner from '@/components/ui/spinner/Spinner.vue'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { loginSchema } from '@/types/auth'
import { useAuthStore } from '@/stores/auth.store'
import { signInWithGoogle, signInWithFacebook } from '@/lib/supabase'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const showPassword = ref(false)
const rememberMe = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')
const selectedRole = ref<'student' | 'teacher'>('student')

const { handleSubmit, resetForm } = useForm({
  validationSchema: toTypedSchema(loginSchema),
  initialValues: { email: '', password: '' },
})

const switchRole = (role: 'student' | 'teacher') => {
  selectedRole.value = role
  errorMessage.value = ''
  resetForm()
}

const handleSignIn = handleSubmit(async (formValues) => {
  if (isSubmitting.value) return

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    const result = await authStore.login(formValues.email, formValues.password, rememberMe.value)

    if (result.success) {
      // Route by the role the server returned — not by the email domain or the
      // selected tab — so a teacher with any email address lands in the teacher portal.
      router.push(authStore.isTeacher ? { name: 'TeacherDashboard' } : { name: 'Dashboard' })
    } else {
      errorMessage.value = result.message || t('auth.login.failed')
    }
  } catch {
    errorMessage.value = t('auth.login.unexpectedError')
  } finally {
    isSubmitting.value = false
  }
})

const goToRegister = () => router.push({ name: 'Register' })
const goToForgotPassword = () => router.push({ name: 'ForgotPassword' })

const handleGoogleSignIn = async () => {
  errorMessage.value = ''
  try {
    await signInWithGoogle()
  } catch {
    errorMessage.value = t('auth.login.googleFailed')
  }
}

const handleFacebookSignIn = async () => {
  errorMessage.value = ''
  try {
    await signInWithFacebook()
  } catch {
    errorMessage.value = t('auth.login.facebookFailed')
  }
}
</script>
