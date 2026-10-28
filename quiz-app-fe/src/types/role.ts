export enum UserRole {
  STUDENT = 1,
  TEACHER = 2,
  ADMIN = 3,
}

export interface Role {
  id: number
  name: string
  description?: string
}

export const ROLE_NAMES: Record<UserRole, string> = {
  [UserRole.STUDENT]: 'Student',
  [UserRole.TEACHER]: 'Teacher',
  [UserRole.ADMIN]: 'Admin',
}

export const isTeacher = (roleId?: number): boolean => roleId === UserRole.TEACHER
export const isAdmin = (roleId?: number): boolean => roleId === UserRole.ADMIN
export const isStudent = (roleId?: number): boolean => roleId === UserRole.STUDENT || !roleId

/** Teacher verification state: students/admins are 'none'; teachers go pending → approved/rejected. */
export type TeacherStatus = 'none' | 'pending' | 'approved' | 'rejected'
