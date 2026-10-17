/**
 * Generic API Response wrapper (matches BE ResponseBase)
 */
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

/**
 * API Error Response
 */
export interface ApiErrorResponse {
  code: string
  message: string
  status_code: number
  details?: unknown
}

/**
 * Empty success response
 */
export interface SuccessResponse {
  code: number
  message: string
}

/**
 * Login Request
 */
export interface LoginRequest {
  email: string
  password: string
}

/**
 * Login Response Data
 */
export interface LoginResponseData {
  access_token: string
  refresh_token: string
  user: UserOut
}

/**
 * Register Request (matches BE UserCreate)
 */
export interface RegisterRequest {
  email: string
  password: string
}

/**
 * User Output from BE (matches BE UserOut)
 */
export interface UserOut {
  id: number
  email: string
  is_active: boolean
  role_id: number
}

/**
 * Refresh Token Request
 */
export interface RefreshTokenRequest {
  refresh_token: string
}

/**
 * Refresh Token Response Data
 */
export interface RefreshTokenResponseData {
  access_token: string
  refresh_token: string
}

/**
 * User Profile Data
 */
export interface UserProfileData {
  id: number
  email: string
  name?: string
  avatar?: string
  is_active?: boolean
  role_id?: number
  created_at?: string
  updated_at?: string
}
