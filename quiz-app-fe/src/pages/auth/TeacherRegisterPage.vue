<template>
  <div class="flex w-full max-w-md flex-col gap-6">
    <!-- Title -->
    <div class="animate-fade-in-down text-center lg:text-left">
      <h1 class="text-foreground text-3xl font-bold tracking-tight">{{ $t('auth.teacherRegister.title') }}</h1>
      <p class="text-muted-foreground mt-2 text-base">{{ $t('auth.teacherRegister.subtitle') }}</p>
    </div>

    <!-- Student / Teacher switch -->
    <div class="bg-muted grid grid-cols-2 gap-1 rounded-xl p-1">
      <router-link
        :to="{ name: 'Register' }"
        class="text-muted-foreground hover:text-foreground rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors"
      >{{ $t('auth.teacherRegister.studentTab') }}</router-link>
      <span class="bg-background text-foreground rounded-lg px-3 py-2 text-center text-sm font-semibold shadow-sm">
        {{ $t('auth.teacherRegister.teacherTab') }}
      </span>
    </div>

    <!-- How it works -->
    <div class="rounded-xl border border-primary/30 bg-primary/5 p-4">
      <p class="text-muted-foreground text-xs leading-relaxed">{{ $t('auth.teacherRegister.reviewNote') }}</p>
    </div>

    <div v-if="errorMessage" class="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      {{ errorMessage }}
    </div>

    <form class="animate-fade-in-up delay-100 space-y-4" novalidate @submit.prevent="submit">
      <!-- Name -->
      <div class="space-y-1.5">
        <label class="text-foreground text-sm font-medium" for="tr-name">{{ $t('auth.teacherRegister.name') }}</label>
        <input
          id="tr-name" v-model.trim="form.name" type="text" autocomplete="name"
          :placeholder="$t('auth.teacherRegister.namePlaceholder')" :class="inputClass"
        />
        <p v-if="errors.name" class="text-destructive text-xs">{{ errors.name }}</p>
      </div>

      <!-- Organization -->
      <div class="space-y-1.5">
        <label class="text-foreground text-sm font-medium" for="tr-org">{{ $t('auth.teacherRegister.organization') }}</label>
        <input
          id="tr-org" v-model.trim="form.organization" type="text" autocomplete="organization"
          :placeholder="$t('auth.teacherRegister.organizationPlaceholder')" :class="inputClass"
        />
        <p v-if="errors.organization" class="text-destructive text-xs">{{ errors.organization }}</p>
      </div>

      <!-- Email -->
      <div class="space-y-1.5">
        <label class="text-foreground text-sm font-medium" for="tr-email">{{ $t('auth.teacherRegister.email') }}</label>
        <input
          id="tr-email" v-model.trim="form.email" type="email" autocomplete="email"
          :placeholder="$t('auth.register.emailPlaceholder')" :class="inputClass"
        />
        <p v-if="errors.email" class="text-destructive text-xs">{{ errors.email }}</p>
      </div>

      <!-- Passwords -->
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <label class="text-foreground text-sm font-medium" for="tr-pass">{{ $t('auth.teacherRegister.password') }}</label>
          <input id="tr-pass" v-model="form.password" type="password" autocomplete="new-password" :class="inputClass" />
          <p v-if="errors.password" class="text-destructive text-xs">{{ errors.password }}</p>
        </div>
        <div class="space-y-1.5">
          <label class="text-foreground text-sm font-medium" for="tr-pass2">{{ $t('auth.teacherRegister.confirmPassword') }}</label>
          <input id="tr-pass2" v-model="form.confirm" type="password" autocomplete="new-password" :class="inputClass" />
          <p v-if="errors.confirm" class="text-destructive text-xs">{{ errors.confirm }}</p>
        </div>
      </div>

      <!-- Verification document -->
      <div class="space-y-1.5">
        <span class="text-foreground text-sm font-medium">{{ $t('auth.teacherRegister.document') }}</span>
        <p class="text-muted-foreground text-xs">{{ $t('auth.teacherRegister.documentHint') }}</p>
        <div class="border-border bg-background flex items-center gap-4 rounded-xl border border-dashed p-3">
          <img v-if="form.document" :src="form.document" alt="" class="h-16 w-24 rounded-lg border object-cover" />
          <div v-else class="bg-muted text-muted-foreground flex h-16 w-24 items-center justify-center rounded-lg text-2xl">🪪</div>
          <label class="bg-secondary text-foreground hover:bg-secondary/80 cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition-colors">
            {{ form.document ? $t('auth.teacherRegister.replaceFile') : $t('auth.teacherRegister.chooseFile') }}
            <input class="sr-only" type="file" accept="image/*" @change="onFile" />
          </label>
        </div>
        <p v-if="errors.document" class="text-destructive text-xs">{{ errors.document }}</p>
      </div>

      <Button
        type="submit"
        :disabled="isSubmitting"
        class="bg-primary text-primary-foreground hover:bg-primary/90 h-12 w-full cursor-pointer rounded-xl text-base font-semibold shadow-sm"
      >
        <Spinner v-if="isSubmitting" class="mr-2 h-5 w-5 animate-spin" />
        <span>{{ isSubmitting ? $t('auth.teacherRegister.submitting') : $t('auth.teacherRegister.submit') }}</span>
      </Button>
    </form>

    <p class="text-muted-foreground text-center text-sm">
      {{ $t('auth.teacherRegister.haveAccount') }}
      <router-link :to="{ name: 'Login' }" class="text-primary hover:text-primary/80 font-semibold">
        {{ $t('auth.register.signIn') }}
      </router-link>
    </p>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Button from '@/components/ui/button/Button.vue'
import Spinner from '@/components/ui/spinner/Spinner.vue'
import { useAuthStore } from '@/stores/auth.store'
import { fileToResizedDataUrl, ImageError } from '@/utils/image'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const inputClass =
  'border-input bg-background focus:border-primary focus:ring-primary/20 h-11 w-full rounded-xl border px-4 text-sm transition-all outline-none focus:ring-2'

const form = reactive({ name: '', organization: '', email: '', password: '', confirm: '', document: '' })
const errors = reactive({ name: '', organization: '', email: '', password: '', confirm: '', document: '' })
const errorMessage = ref('')
const isSubmitting = ref(false)

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // allow picking the same file again
  if (!file) return
  errors.document = ''
  try {
    form.document = await fileToResizedDataUrl(file)
  } catch (err) {
    errors.document = err instanceof ImageError && err.reason === 'type'
      ? t('auth.teacherRegister.errImage')
      : t('auth.teacherRegister.errImageRead')
  }
}

function validate(): boolean {
  errors.name = form.name.length >= 2 ? '' : t('auth.teacherRegister.errName')
  errors.organization = form.organization.length >= 2 ? '' : t('auth.teacherRegister.errOrganization')
  errors.email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email) ? '' : t('auth.register.errEmail')
  errors.password = form.password.length >= 8 ? '' : t('auth.register.errPasswordMin')
  errors.confirm = form.confirm === form.password ? '' : t('auth.register.errPasswordMatch')
  errors.document = form.document ? '' : t('auth.teacherRegister.errDocument')
  return Object.values(errors).every((m) => !m)
}

async function submit() {
  if (isSubmitting.value || !validate()) return
  isSubmitting.value = true
  errorMessage.value = ''
  const result = await authStore.registerTeacher({
    email: form.email,
    password: form.password,
    name: form.name,
    organization: form.organization,
    teacher_card_image: form.document,
  })
  isSubmitting.value = false
  if (result.success) {
    router.push(authStore.homePath) // → /teacher/pending
  } else {
    errorMessage.value = result.message || t('auth.teacherRegister.failed')
  }
}
</script>
