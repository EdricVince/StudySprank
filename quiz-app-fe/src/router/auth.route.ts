import AuthLayout from '@/layouts/AuthLayout.vue'
import LoginPage from '@/pages/auth/LoginPage.vue'
import RegisterPage from '@/pages/auth/RegisterPage.vue'

export const AUTH_ROUTES = [
  {
    path: '/auth/callback',
    name: 'OAuthCallback',
    component: () => import('@/pages/auth/OAuthCallbackPage.vue'),
  },
  {
    path: '/',
    component: AuthLayout,
    children: [
      {
        path: 'login',
        name: 'Login',
        component: LoginPage,
        meta: { requiresGuest: true },
      },
      {
        path: 'register',
        name: 'Register',
        component: RegisterPage,
        meta: { requiresGuest: true },
      },
      {
        path: 'register/teacher',
        name: 'TeacherRegister',
        component: () => import('@/pages/auth/TeacherRegisterPage.vue'),
        meta: { requiresGuest: true },
      },
      {
        path: 'forgot-password',
        name: 'ForgotPassword',
        component: () => import('@/pages/auth/ForgotPasswordPage.vue'),
        meta: { requiresGuest: true },
      },
      {
        path: 'reset-password',
        name: 'ResetPassword',
        component: () => import('@/pages/auth/ResetPasswordPage.vue'),
        meta: { requiresGuest: true },
      },
    ],
  },
]
