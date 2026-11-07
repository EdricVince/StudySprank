export interface SocialLinkData {
  platform: string
  url: string
}

/** Settings kept per account; a missing key means "use the default". */
export interface PreferencesData {
  study?: { cardsPerDay?: number; studyMinutes?: number }
  notifications?: {
    email?: boolean
    streakReminder?: boolean
    achievements?: boolean
    weeklyReport?: boolean
    reminderTime?: string
    timezone?: string
  }
  privacy?: {
    publicProfile?: boolean
    showStreak?: boolean
    showAchievements?: boolean
    analytics?: boolean
  }
}

/** The profile card and settings of the signed-in account (as the API returns it). */
export interface AccountProfileData {
  username: string
  phone: string
  title: string
  location: string
  bio: string
  social_links: SocialLinkData[]
  preferences: PreferencesData
}

/** What can be saved: only the fields that are sent are changed. */
export type AccountProfileUpdate = Partial<Omit<AccountProfileData, 'preferences'>> & {
  preferences?: PreferencesData
}

export interface StudyPlanData {
  id: string
  name: string
  form: Record<string, unknown>
  plan: Record<string, unknown>
  created_at: string
  updated_at: string
}
