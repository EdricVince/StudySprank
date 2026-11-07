<template>
  <div class="p-6 lg:p-8">
    <!-- Header -->
    <div class="animate-fade-in-down mb-8">
      <h1 class="text-foreground text-2xl font-bold tracking-tight lg:text-3xl">
        {{ $t('settings.title') }}
      </h1>
      <p class="text-muted-foreground mt-2 text-base">
        {{ $t('settings.subtitle') }}
      </p>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Sidebar Navigation -->
      <div class="animate-fade-in-up lg:col-span-1">
        <SettingsNavigation
          :sections="settingsSections"
          :active-section="activeSection"
          @update:active-section="activeSection = $event"
        />
      </div>

      <!-- Settings Content -->
      <div class="animate-fade-in-up delay-100 lg:col-span-2">
        <!-- Account Settings -->
        <AccountSettings
          v-show="activeSection === 'account'"
          :account="accountSettings"
          :password="passwordForm"
          @update:account="Object.assign(accountSettings, $event)"
          @update:password="Object.assign(passwordForm, $event)"
          @save="saveAccountSettings"
          @change-password="changePassword"
        />

        <!-- Appearance Settings -->
        <AppearanceSettings
          v-show="activeSection === 'appearance'"
          :appearance="appearanceSettings"
          @update:appearance="Object.assign(appearanceSettings, $event)"
          @set-theme="updateTheme"
        />

        <!-- Notification Settings -->
        <NotificationSettings
          v-show="activeSection === 'notifications'"
          :notifications="notificationSettings"
          @update:notifications="Object.assign(notificationSettings, $event)"
        />

        <!-- Study Preferences -->
        <StudyPreferencesSettings
          v-show="activeSection === 'study'"
          :study="studySettings"
          @update:study="Object.assign(studySettings, $event)"
        />

        <!-- Privacy Settings -->
        <PrivacySettings
          v-show="activeSection === 'privacy'"
          :privacy="privacySettings"
          @update:privacy="Object.assign(privacySettings, $event)"
          @export="exportUserData"
          @show-delete-modal="showDeleteConfirm = true"
        />
      </div>
    </div>

    <!-- Delete Account Modal -->
    <DeleteAccountModal
      :show="showDeleteConfirm"
      :busy="deleting"
      :error="deleteError"
      @close="showDeleteConfirm = false"
      @confirm="deleteAccount"
    />

    <!-- Toast Notification -->
    <SettingsToast :show="toast.isVisible.value" :message="toast.message.value" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { User, Palette, Bell, Target, Shield } from '@/components/icons'

import SettingsNavigation, { type SettingsSection } from '@/components/settings/SettingsNavigation.vue'
import AccountSettings from '@/components/settings/AccountSettings.vue'
import AppearanceSettings from '@/components/settings/AppearanceSettings.vue'
import NotificationSettings from '@/components/settings/NotificationSettings.vue'
import StudyPreferencesSettings from '@/components/settings/StudyPreferencesSettings.vue'
import PrivacySettings from '@/components/settings/PrivacySettings.vue'
import DeleteAccountModal from '@/components/settings/DeleteAccountModal.vue'
import SettingsToast from '@/components/settings/SettingsToast.vue'

import { useSettings, useToast } from '@/composables'

// Use composables
const {
  accountSettings,
  passwordForm,
  appearanceSettings,
  notificationSettings,
  studySettings,
  privacySettings,
  showDeleteConfirm,
  deleting,
  deleteError,
  saveAccountSettings,
  changePassword,
  updateTheme,
  exportUserData,
  deleteAccount,
} = useSettings()

const toast = useToast()

const { t } = useI18n()

// Active section
const activeSection = ref('account')

// Settings sections for navigation
const settingsSections = computed((): SettingsSection[] => [
  { id: 'account', label: t('settings.sections.account'), icon: User },
  { id: 'appearance', label: t('settings.sections.appearance'), icon: Palette },
  { id: 'notifications', label: t('settings.sections.notifications'), icon: Bell },
  { id: 'study', label: t('settings.sections.study'), icon: Target },
  { id: 'privacy', label: t('settings.sections.privacy'), icon: Shield },
])
</script>
