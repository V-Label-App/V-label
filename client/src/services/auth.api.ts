import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for cookies (refresh token)
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor to attach token
apiClient.interceptors.request.use(
  (config) => {
    // Check both localStorage and sessionStorage for token
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Add response interceptor to debug
apiClient.interceptors.response.use(
  (response) => {
    // console.log('✅ API Response:', response.config.url, response.data)
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      // List of API endpoints that should NOT trigger automatic session clearing on 401
      // For example: wrong password on login, or wrong code on verify-otp
      const authEndpointPrefixes = ['/auth/login', '/auth/verify-otp', '/auth/register', '/auth/forgot-password', '/auth/reset-password']
      const apiUrl = error.config?.url || ''
      const isAuthApi = authEndpointPrefixes.some(prefix => apiUrl.includes(prefix))

      if (!isAuthApi) {
        console.warn('Unauthorized - Clearing session due to expired or invalid token')
        localStorage.removeItem('accessToken')
        sessionStorage.removeItem('accessToken')

        // Prevent redirect loop on public pages
        const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password']
        const currentPath = window.location.pathname
        const isPublicPage = publicPaths.some(path => currentPath.startsWith(path))

        if (!isPublicPage) {
          window.location.href = '/login'
        }
      } else {
        // If it's an auth API, we just let the error pass to the UI (e.g. "Invalid code")
        // without clearing the current session if any
        console.warn(`Auth Error (${error.response.status}): ${apiUrl}`)
      }
    }
    console.error('❌ API Error:', error.config?.url, error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export interface LoginCredentials {
  email: string
  password: string
}

export interface DevLoginRequest {
  role: 'ADMIN' | 'MANAGER' | 'REVIEWER' | 'ANNOTATOR'
}

export interface RegisterCredentials {
  email: string
  password: string
  fullName?: string
}

export interface AuthResponse {
  otpRequired: boolean
  otpToken?: string
  accessToken?: string
  user?: {
    id: string
    email: string
    role: string
    fullName: string | null
    avatarUrl?: string | null
  }
  message?: string
}

export interface PerformanceStats {
  weeklyActivity: { name: string; completed: number; rejected: number }[]
  taskDistribution: { name: string; value: number; color: string }[]
  dailyProgress: { time: string; tasks: number }[]
}

export const authApi = {
  /**
   * Get current user profile
   */
  getMe: async (): Promise<{ user: AuthResponse['user'] }> => {
    const response = await apiClient.get<{ id: string; email: string; fullName: string | null; role: string; avatarUrl?: string }>('/users/me')
    // Transform response to match AuthResponse.user structure if needed, or just return it
    // The backend returns the User object directly
    return { user: response.data }
  },

  /**
   * Standard email/password login
   */
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials)
    return response.data
  },

  /**
   * Verify OTP code (Step 2 of login)
   */
  verifyOtp: async (otpToken: string, code: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/verify-otp', { otpToken, code })
    return response.data
  },

  /**
   * Login with Google (Firebase)
   */
  loginWithGoogle: async (idToken: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/google', { idToken })
    return response.data
  },

  /**
   * Developer bypass login (dev only)
   */
  devLogin: async (request: DevLoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/dev/login', request)
    return response.data
  },

  /**
   * User registration
   */
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', credentials)
    return response.data
  },

  /**
   * Logout (clear tokens)
   */
  logout: async (): Promise<void> => {
    // Future implementation
    localStorage.removeItem('accessToken')
  },

  // --- Admin API ---

  /**
   * Get all users (Admin only)
   */
  getAllUsers: async (): Promise<AuthResponse['user'][]> => {
    const response = await apiClient.get<AuthResponse['user'][]>('/users')
    return response.data
  },

  /**
   * Get single user (Admin only)
   */
  getUserById: async (id: string): Promise<AuthResponse['user']> => {
    // We are reusing the User interface from jwt.utils or defining a compatible one
    // The backend returns the user object directly
    const response = await apiClient.get<AuthResponse['user']>(`/users/${id}`)
    return response.data
  },

  /**
   * Create new user (Admin only)
   */
  createUser: async (data: any): Promise<AuthResponse['user']> => {
    const response = await apiClient.post<AuthResponse['user']>('/users', data)
    return response.data
  },

  /**
   * Update user details (Admin only)
   */
  updateUser: async (id: string, data: any): Promise<AuthResponse['user']> => {
    const response = await apiClient.put<AuthResponse['user']>(`/users/${id}`, data)
    return response.data
  },

  /**
   * Delete user (Admin only)
   */
  deleteUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/users/${id}`)
  },
  /**
   * Impersonate User (Admin only)
   */
  impersonate: async (userId: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>(`/auth/impersonate/${userId}`)
    return response.data
  },

  /**
   * Get System Logs (Admin only)
   */
  getSystemLogs: async (): Promise<any[]> => {
    const response = await apiClient.get<any[]>('/auth/logs')
    return response.data
  },

  /**
   * Get Audit Log Retention Policy
   */
  getAuditLogConfig: async (): Promise<{ retentionDays: number }> => {
    const response = await apiClient.get<{ retentionDays: number }>('/admin/config/audit-log');
    return response.data;
  },

  /**
   * Update Audit Log Retention Policy
   */
  updateAuditLogConfig: async (config: { retentionDays: number }): Promise<{ retentionDays: number }> => {
    const response = await apiClient.put<{ retentionDays: number }>('/admin/config/audit-log', config);
    return response.data;
  },

  /**
   * Manually cleanup old logs
   */
  cleanUpLogs: async (): Promise<{ deletedCount: number }> => {
    const response = await apiClient.post<{ deletedCount: number }>('/admin/logs/cleanup');
    return response.data;
  },

  /**
   * Request password reset email
   */
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/forgot-password', { email });
    return response.data;
  },

  /**
   * Verify if password reset token is valid
   */
  verifyResetToken: async (token: string): Promise<{ valid: boolean; email?: string; error?: string }> => {
    const response = await apiClient.get<{ valid: boolean; email?: string; error?: string }>(`/auth/verify-reset-token/${token}`);
    return response.data;
  },

  /**
   * Reset password using token
   */
  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/reset-password', { token, newPassword });
    return response.data;
  },

  /**
   * Upload user avatar
   */
  uploadAvatar: async (file: File): Promise<AuthResponse['user']> => {
    const formData = new FormData()
    formData.append('avatar', file)
    const response = await apiClient.post<AuthResponse['user']>('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  /**
   * Get performance stats
   */
  getPerformanceStats: async (): Promise<PerformanceStats> => {
    const response = await apiClient.get<PerformanceStats>('/users/me/performance')
    return response.data
  },

  /**
   * Change password
   */
  changePassword: async (data: {
    oldPassword: string
    newPassword: string
    confirmNewPassword: string
  }): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>('/auth/change-password', data)
    return response.data
  },
}
