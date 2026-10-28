import { createRouter, createWebHistory } from 'vue-router'

import MainLayout from '@/layouts/MainLayout.vue'
import DashboardPage from '@/pages/student/DashboardPage.vue'
import ProfilePage from '@/pages/student/ProfilePage.vue'
import { useAuthStore } from '@/stores/auth.store'
import { AUTH_ROUTES } from './auth.route'
import { UserRole } from '@/types/role'

// One shared portal for teachers and admins (/teacher/*). What a user may open is
// decided by the guard below: admins get /teacher/admin/*, approved teachers get the
// teaching pages, pending/rejected teachers only see /teacher/pending.
const TEACHER_ROUTES = {
  path: '/teacher',
  component: () => import('@/layouts/TeacherLayout.vue'),
  meta: { requiresAuth: true },
  children: [
    { path: '', redirect: () => useAuthStore().homePath },

    // Teacher application status (pending / rejected)
    { path: 'pending', name: 'TeacherPending', component: () => import('@/pages/teacher/TeacherPendingPage.vue') },

    // Teaching (approved teachers)
    { path: 'dashboard',  name: 'TeacherDashboard',  component: () => import('@/pages/teacher/TeacherDashboardPage.vue') },
    { path: 'classes',    name: 'TeacherClasses',    component: () => import('@/pages/teacher/ClassesPage.vue') },
    { path: 'classes/:id', name: 'TeacherClassDetail', component: () => import('@/pages/teacher/ClassDetailPage.vue') },
    { path: 'tests',      name: 'TeacherTests',      component: () => import('@/pages/teacher/TestsPage.vue') },
    { path: 'tests/new',  name: 'TeacherTestBuilder', component: () => import('@/pages/teacher/TestBuilderPage.vue') },
    { path: 'tests/:id/edit',    name: 'TeacherTestEdit',    component: () => import('@/pages/teacher/TestBuilderPage.vue') },
    { path: 'tests/:id/results', name: 'TeacherTestResults', component: () => import('@/pages/teacher/TestResultsPage.vue') },
    { path: 'students',   name: 'TeacherStudents',   component: () => import('@/pages/teacher/StudentsPage.vue') },
    { path: 'lessons',    name: 'TeacherLessons',    component: () => import('@/pages/teacher/LessonsPage.vue') },
    { path: 'vocabulary', name: 'TeacherVocabulary', component: () => import('@/pages/teacher/VocabularyPage.vue') },
    { path: 'analytics',  name: 'TeacherAnalytics',  component: () => import('@/pages/teacher/AnalyticsPage.vue') },

    // Administration (admins only)
    { path: 'admin', redirect: '/teacher/admin/overview' },
    { path: 'admin/overview',  name: 'AdminDashboard', component: () => import('@/pages/admin/AdminDashboardPage.vue') },
    { path: 'admin/approvals', name: 'AdminApprovals', component: () => import('@/pages/admin/AdminApprovalsPage.vue') },
    { path: 'admin/users',     name: 'AdminUsers',     component: () => import('@/pages/admin/AdminUsersPage.vue') },
    { path: 'admin/activity',  name: 'AdminActivity',  component: () => import('@/pages/admin/AdminActivityPage.vue') },
    { path: 'admin/ai',        name: 'AdminAI',        component: () => import('@/pages/admin/AdminAISettingsPage.vue') },
  ],
}

const routes = [
  { path: '/', redirect: () => useAuthStore().homePath },
  // The old standalone admin portal now lives inside the shared portal.
  { path: '/admin/:rest(.*)*', redirect: '/teacher/admin/overview' },
  ...AUTH_ROUTES,
  TEACHER_ROUTES,
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      { path: 'dashboard',  name: 'Dashboard',  component: DashboardPage },
      { path: 'profile',    name: 'Profile',    component: ProfilePage },

      // My classes (joined with the teacher's code)
      { path: 'classes',     name: 'MyClasses', component: () => import('@/pages/student/MyClassesPage.vue') },
      { path: 'classes/:id', name: 'ClassPage', component: () => import('@/pages/student/ClassPage.vue') },

      // Courses
      { path: 'courses',         name: 'Courses',        component: () => import('@/pages/student/MyCoursesPage.vue') },
      { path: 'courses/explore', name: 'ExploreCourses', component: () => import('@/pages/student/CourseExplorePage.vue') },
      { path: 'courses/:id',     name: 'CourseDetail',   component: () => import('@/pages/student/CourseDetailPage.vue') },

      // Flashcards
      { path: 'flashcards',                name: 'Flashcards',           component: () => import('@/pages/student/FlashcardsPage.vue') },
      { path: 'flashcards/:id',            name: 'FlashcardDeck',        component: () => import('@/pages/student/FlashcardDeckPage.vue') },
      { path: 'flashcards/vocab-practice', name: 'FlashcardVocabPractice', component: () => import('@/pages/student/FlashcardStudyPage.vue') },
      { path: 'flashcards/vocab-set/:id/study', name: 'FlashcardVocabSetStudy', component: () => import('@/pages/student/FlashcardStudyPage.vue') },
      { path: 'flashcards/:id/study',      name: 'FlashcardStudy',       component: () => import('@/pages/student/FlashcardStudyPage.vue') },

      // Quizzes
      { path: 'quizzes',                   name: 'Quizzes',           component: () => import('@/pages/student/QuizzesPage.vue') },
      { path: 'quizzes/multiple-choice',   name: 'MultipleChoiceQuiz', component: () => import('@/pages/quiz/MultipleChoiceQuiz.vue') },
      { path: 'quizzes/word-scramble',     name: 'WordScrambleQuiz',  component: () => import('@/pages/quiz/WordScrambleQuiz.vue') },
      { path: 'quizzes/matching-pairs',    name: 'MatchingPairsQuiz', component: () => import('@/pages/quiz/MatchingPairsQuiz.vue') },
      { path: 'quizzes/speed-round',       name: 'SpeedRoundQuiz',    component: () => import('@/pages/quiz/SpeedRoundQuiz.vue') },
      { path: 'quizzes/typing-challenge',  name: 'TypingChallengeQuiz', component: () => import('@/pages/quiz/TypingChallengeQuiz.vue') },
      { path: 'quizzes/true-false',        name: 'TrueFalseQuiz',     component: () => import('@/pages/quiz/TrueFalseQuiz.vue') },
      { path: 'quizzes/idiom-quiz',        name: 'IdiomQuiz',         component: () => import('@/pages/quiz/IdiomQuiz.vue') },
      { path: 'quizzes/battle',            name: 'BattleMode',        component: () => import('@/pages/quiz/BattleMode.vue') },
      { path: 'quizzes/test/:id',          name: 'TakeTest',          component: () => import('@/pages/student/TakeTestPage.vue') },

      // Progress & Personal
      { path: 'goals',        name: 'Goals',        component: () => import('@/pages/student/GoalsPage.vue') },
      { path: 'achievements', name: 'Achievements', component: () => import('@/pages/student/AchievementsPage.vue') },
      { path: 'statistics',   name: 'Statistics',   component: () => import('@/pages/student/StatisticsPage.vue') },
      { path: 'settings',     name: 'Settings',     component: () => import('@/pages/student/SettingsPage.vue') },


      // New Features
      { path: 'entrance-exam',          name: 'EntranceExam',   component: () => import('@/pages/student/EntranceExamPage.vue') },
      { path: 'entrance-exam/session',  name: 'ExamSession',    component: () => import('@/pages/student/ExamSessionPage.vue') },
      { path: 'schedule',               name: 'Schedule',       component: () => import('@/pages/student/SchedulePage.vue') },

      // Skills Practice
      { path: 'skills',          name: 'SkillsHub',  component: () => import('@/pages/student/SkillsHubPage.vue') },
      { path: 'skills/reading',  name: 'Reading',    component: () => import('@/pages/student/ReadingPage.vue') },
      { path: 'skills/listening',name: 'Listening',  component: () => import('@/pages/student/ListeningPage.vue') },
      { path: 'skills/writing',  name: 'Writing',    component: () => import('@/pages/student/WritingPage.vue') },
      { path: 'skills/speaking', name: 'Speaking',   component: () => import('@/pages/student/SpeakingPage.vue') },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
    return
  }

  // Signed-in users never see the login/register pages: send them to their own home.
  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next(authStore.homePath)
    return
  }

  if (to.path.startsWith('/teacher')) {
    // Students have no business in the teacher/admin portal.
    if (!authStore.canAccessTeacher) {
      next('/dashboard')
      return
    }
    const inAdminArea = to.path.startsWith('/teacher/admin')
    if (authStore.isAdmin) {
      // Admins administer; they have no classes of their own to teach.
      if (!inAdminArea) {
        next('/teacher/admin/overview')
        return
      }
    } else {
      if (inAdminArea) {
        next(authStore.homePath)
        return
      }
      // A teacher works only after an admin has approved the account.
      const onPending = to.path === '/teacher/pending'
      if (!authStore.isTeacherApproved && !onPending) {
        next('/teacher/pending')
        return
      }
      if (authStore.isTeacherApproved && onPending) {
        next('/teacher/dashboard')
        return
      }
    }
  }

  if (to.meta.requiredRole) {
    const requiredRole = to.meta.requiredRole as number
    const userRole = authStore.userRole
    if (userRole !== requiredRole) {
      next(userRole === UserRole.STUDENT ? '/dashboard' : authStore.homePath)
      return
    }
  }

  next()
})

export default router
