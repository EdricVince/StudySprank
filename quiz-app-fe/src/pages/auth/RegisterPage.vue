<template>
  <div class="flex w-full max-w-md flex-col gap-8">
    <!-- Title Section -->
    <div class="animate-fade-in-down text-center lg:text-left">
      <h1 class="text-foreground text-3xl font-bold tracking-tight">{{ $t('auth.register.title') }}</h1>
      <p class="text-muted-foreground mt-2 text-base">
        {{ $t('auth.register.subtitle') }}
      </p>
    </div>

    <!-- Student / Teacher switch -->
    <div class="bg-muted grid grid-cols-2 gap-1 rounded-xl p-1">
      <span class="bg-background text-foreground rounded-lg px-3 py-2 text-center text-sm font-semibold shadow-sm">
        {{ $t('auth.teacherRegister.studentTab') }}
      </span>
      <router-link
        :to="{ name: 'TeacherRegister' }"
        class="text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors"
      >{{ $t('auth.teacherRegister.teacherTab') }}</router-link>
    </div>

    <!-- Success/Error Messages -->
    <div v-if="successMessage" class="rounded-lg border border-primary/30 bg-primary/10 p-4">
      <p class="text-sm text-primary">{{ successMessage }}</p>
    </div>
    <div v-if="errorMessage" class="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
      <p class="text-sm text-destructive">{{ errorMessage }}</p>
    </div>

    <!-- Register Form -->
    <form class="animate-fade-in-up delay-100 space-y-5" @submit="handleSignUp">
      <!-- Email Field -->
      <FormField v-slot="{ componentField }" name="email">
        <FormItem class="space-y-2">
          <FormLabel class="text-foreground text-sm font-medium">{{ $t('auth.register.email') }}</FormLabel>
          <FormControl>
            <div class="relative">
              <Mail
                class="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2"
              />
              <Input
                v-bind="componentField"
                type="email"
                autocomplete="email"
                :placeholder="$t('auth.register.emailPlaceholder')"
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
          <FormLabel class="text-foreground text-sm font-medium">{{ $t('auth.register.password') }}</FormLabel>
          <FormControl>
            <div class="relative">
              <Lock
                class="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2"
              />
              <Input
                v-bind="componentField"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                :placeholder="$t('auth.register.passwordPlaceholder')"
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

      <!-- Confirm Password Field -->
      <FormField v-slot="{ componentField }" name="confirmPassword">
        <FormItem class="space-y-2">
          <FormLabel class="text-foreground text-sm font-medium">{{ $t('auth.register.confirmPassword') }}</FormLabel>
          <FormControl>
            <div class="relative">
              <Lock
                class="text-muted-foreground pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2"
              />
              <Input
                v-bind="componentField"
                :type="showConfirmPassword ? 'text' : 'password'"
                autocomplete="new-password"
                :placeholder="$t('auth.register.confirmPasswordPlaceholder')"
                class="border-input bg-background focus:border-primary focus:ring-primary/20 h-12 rounded-xl pl-12 pr-12 text-base transition-all focus:ring-2"
              />
              <button
                type="button"
                class="text-muted-foreground hover:text-foreground absolute top-1/2 right-4 -translate-y-1/2 p-1 transition-colors"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <Eye v-if="showConfirmPassword" class="h-5 w-5" />
                <EyeOff v-else class="h-5 w-5" />
              </button>
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>

      <!-- Terms Agreement -->
      <div class="flex items-start gap-3">
        <Checkbox v-model:checked="agreeTerms" class="mt-0.5 cursor-pointer" />
        <span class="text-muted-foreground text-sm leading-relaxed">
          {{ $t('auth.register.termsText') }}
          <Button
            type="button"
            variant="link"
            class="text-primary hover:text-primary/80 h-auto p-0 font-medium"
            @click="openTermsOfService"
          >
            {{ $t('auth.register.termsOfService') }}
          </Button>
          {{ $t('auth.register.and') }}
          <Button
            type="button"
            variant="link"
            class="text-primary hover:text-primary/80 h-auto p-0 font-medium"
            @click="openPrivacyPolicy"
          >
            {{ $t('auth.register.privacyPolicy') }}
          </Button>
        </span>
      </div>

      <!-- Submit Button -->
      <Button
        type="submit"
        :disabled="isSubmitting || !agreeTerms"
        class="bg-primary text-primary-foreground hover:bg-primary/90 h-12 w-full cursor-pointer rounded-xl text-base font-semibold shadow-sm transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Spinner v-if="isSubmitting" class="mr-2 h-5 w-5 animate-spin" />
        <span>{{ isSubmitting ? $t('auth.register.creatingAccount') : $t('auth.register.createAccount') }}</span>
      </Button>
    </form>

    <!-- Divider -->
    <div class="animate-fade-in-up delay-200 relative">
      <div class="absolute inset-0 flex items-center">
        <div class="border-border w-full border-t"></div>
      </div>
      <div class="relative flex justify-center">
        <span class="bg-background text-muted-foreground px-4 text-sm">{{ $t('auth.register.orSignUpWith') }}</span>
      </div>
    </div>

    <!-- Social Login -->
    <div class="animate-fade-in-up delay-300 grid grid-cols-2 gap-4">
      <Button
        type="button"
        variant="outline"
        class="border-border hover:bg-accent h-12 cursor-pointer gap-2 rounded-xl text-sm font-medium transition-all"
        @click="handleGoogleSignUp"
      >
        <Icon name="google" class="h-5 w-5" />
        Google
      </Button>
      <Button
        type="button"
        variant="outline"
        class="border-border hover:bg-accent h-12 cursor-pointer gap-2 rounded-xl text-sm font-medium transition-all"
        @click="handleFacebookSignUp"
      >
        <Icon name="facebook" class="h-5 w-5" />
        Facebook
      </Button>
    </div>

    <!-- Sign in link -->
    <p class="animate-fade-in-up delay-400 text-muted-foreground text-center text-sm">
      {{ $t('auth.register.alreadyHaveAccount') }}
      <Button
        type="button"
        variant="link"
        class="text-primary hover:text-primary/80 h-auto p-0 font-semibold"
        @click="goToLogin"
      >
        {{ $t('auth.register.signIn') }}
      </Button>
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { Eye, EyeOff, Mail, Lock } from '@/components/icons'

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
import { useAuthStore } from '@/stores/auth.store'
import { UserRole } from '@/types/role'
import { signInWithGoogle, signInWithFacebook } from '@/lib/supabase'

const TEACHER_DOMAIN = '@teacher.sprk'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const agreeTerms = ref(false)
const isSubmitting = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const registerSchema = z
  .object({
    email: z
      .string()
      .email(t('auth.register.errEmail'))
      .refine((e) => !e.toLowerCase().endsWith(TEACHER_DOMAIN), {
        message: t('auth.register.errTeacherOnly'),
      }),
    password: z.string().min(8, t('auth.register.errPasswordMin')),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: t('auth.register.errPasswordMatch'),
    path: ['confirmPassword'],
  })

const { handleSubmit } = useForm({
  validationSchema: toTypedSchema(registerSchema),
  initialValues: { email: '', password: '', confirmPassword: '' },
})

const roleFromEmail = computed(() => UserRole.STUDENT)

const handleSignUp = handleSubmit(async (formValues) => {
  if (isSubmitting.value || !agreeTerms.value) return

  isSubmitting.value = true
  successMessage.value = ''
  errorMessage.value = ''

  try {
    const result = await authStore.register(formValues.email, formValues.password, roleFromEmail.value)

    if (result.success) {
      successMessage.value = result.message || t('auth.register.success')
      setTimeout(() => {
        router.push({ name: 'Login' })
      }, 2000)
    } else {
      errorMessage.value = result.message || t('auth.register.failed')
    }
  } catch (error) {
    console.error('Registration error:', error)
    errorMessage.value = t('auth.register.unexpectedError')
  } finally {
    isSubmitting.value = false
  }
})

const goToLogin = () => {
  router.push({ name: 'Login' })
}

const handleGoogleSignUp = async () => {
  errorMessage.value = ''
  try {
    await signInWithGoogle()
  } catch {
    errorMessage.value = t('auth.register.googleFailed')
  }
}

const handleFacebookSignUp = async () => {
  errorMessage.value = ''
  try {
    await signInWithFacebook()
  } catch {
    errorMessage.value = t('auth.register.facebookFailed')
  }
}

const openTermsOfService = () => {
  window.open('/terms-of-service', '_blank')
}

const openPrivacyPolicy = () => {
  window.open('/privacy-policy', '_blank')
}
</script>
