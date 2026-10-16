import { createRouter, createWebHistory } from 'vue-router'

import MainLayout from '@/layouts/MainLayout.vue'
import DashboardPage from '@/pages/student/DashboardPage.vue'
import ProfilePage from '@/pages/student/ProfilePage.vue'
import { useAuthStore } from '@/stores/auth.store'
import { useAdminStore } from '@/stores/admin.store'
import { AUTH_ROUTES } from './auth.route'
import { UserRole } from '@/types/role'

// Admin routes (separate portal, key-based auth)
const ADMIN_ROUTES = {
  path: '/admin',
  children: [
    { path: '', redirect: '/admin/dashboard' },
    { path: 'login', name: 'AdminLogin', component: () => import('@/pages/admin/AdminLoginPage.vue'), meta: { isAdminLogin: true } },
    {
      path: '',
      component: () => import('@/layouts/AdminLayout.vue'),
      meta: { requiresAdminAuth: true },
      children: [
        { path: 'dashboard', name: 'AdminDashboard', component: () => import('@/pages/admin/AdminDashboardPage.vue') },
        { path: 'users',     name: 'AdminUsers',     component: () => import('@/pages/admin/AdminUsersPage.vue') },
        { path: 'students',  name: 'AdminStudents',  component: () => import('@/pages/admin/AdminUsersPage.vue') },
        { path: 'teachers',  name: 'AdminTeachers',  component: () => import('@/pages/admin/AdminUsersPage.vue') },
        { path: 'ai',        name: 'AdminAI',        component: () => import('@/pages/admin/AdminAISettingsPage.vue') },
      ],
    },
  ],
}

// Teacher routes
const TEACHER_ROUTES = {
  path: '/teacher',
  component: () => import('@/layouts/TeacherLayout.vue'),
  meta: { requiresAuth: true },
  children: [
    { path: '', redirect: '/teacher/dashboard' },
    { path: 'dashboard',  name: 'TeacherDashboard',  component: () => import('@/pages/teacher/TeacherDashboardPage.vue') },
    { path: 'classes',    name: 'TeacherClasses',    component: () => import('@/pages/teacher/ClassesPage.vue') },
    { path: 'classes/:id', name: 'TeacherClassDetail', component: () => import('@/pages/teacher/ClassDetailPage.vue') },
    { path: 'videos',     name: 'TeacherVideos',     component: () => import('@/pages/teacher/VideosPage.vue') },
    { path: 'tests',      name: 'TeacherTests',      component: () => import('@/pages/teacher/TestsPage.vue') },
    { path: 'tests/new',  name: 'TeacherTestBuilder', component: () => import('@/pages/teacher/TestBuilderPage.vue') },
    { path: 'tests/:id/edit',    name: 'TeacherTestEdit',    component: () => import('@/pages/teacher/TestBuilderPage.vue') },
    { path: 'tests/:id/results', name: 'TeacherTestResults', component: () => import('@/pages/teacher/TestResultsPage.vue') },
    { path: 'students',   name: 'TeacherStudents',   component: () => import('@/pages/teacher/StudentsPage.vue') },
    { path: 'lessons',    name: 'TeacherLessons',    component: () => import('@/pages/teacher/LessonsPage.vue') },
    { path: 'vocabulary', name: 'TeacherVocabulary', component: () => import('@/pages/teacher/VocabularyPage.vue') },
    { path: 'live',       name: 'TeacherLiveQuiz',   component: () => import('@/pages/teacher/LiveQuizPage.vue') },
    { path: 'analytics',  name: 'TeacherAnalytics',  component: () => import('@/pages/teacher/AnalyticsPage.vue') },
  ],
}

const routes = [
  { path: '/', redirect: '/dashboard' },
  ...AUTH_ROUTES,
  ADMIN_ROUTES,
  TEACHER_ROUTES,
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      { path: 'dashboard',  name: 'Dashboard',  component: DashboardPage },
      { path: 'profile',    name: 'Profile',    component: ProfilePage },

      // Courses
      { path: 'courses',         name: 'Courses',        component: () => import('@/pages/student/MyCoursesPage.vue') },
      { path: 'courses/explore', name: 'ExploreCourses', component: () => import('@/pages/student/CourseExplorePage.vue') },
      { path: 'courses/:id',     name: 'CourseDetail',   component: () => import('@/pages/student/CourseDetailPage.vue') },
      { path: 'courses/:courseId/lessons/:lessonId', name: 'Lesson', component: () => import('@/pages/student/LessonPage.vue') },

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

      // Online Learning
      { path: 'classroom', name: 'Classroom', component: () => import('@/pages/student/ClassroomPage.vue') },
      { path: 'live-quiz',  name: 'LiveQuiz',  component: () => import('@/pages/student/LiveQuizPage.vue') },

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
  const adminStore = useAdminStore()

  // Admin portal guard
  if (to.meta.requiresAdminAuth) {
    const key = sessionStorage.getItem('admin_key')
    if (!key) {
      next('/admin/login')
      return
    }
    // Mark as authenticated (key presence check — full verify done on login)
    if (!adminStore.isAuthenticated) adminStore.isAuthenticated = true
    next()
    return
  }

  // Redirect away from login if already authenticated
  if (to.meta.isAdminLogin && sessionStorage.getItem('admin_key')) {
    next('/admin/dashboard')
    return
  }

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login')
    return
  }

  if (to.meta.requiresGuest && authStore.isAuthenticated) {
    next(authStore.isTeacher ? '/teacher/dashboard' : '/dashboard')
    return
  }

  if (to.path.startsWith('/teacher')) {
    if (!authStore.isTeacher) {
      next('/dashboard')
      return
    }
  }

  if (to.meta.requiredRole) {
    const requiredRole = to.meta.requiredRole as number
    const userRole = authStore.userRole
    if (userRole !== requiredRole) {
      next(userRole === UserRole.TEACHER ? '/teacher/dashboard' : '/dashboard')
      return
    }
  }

  next()
})

export default router
