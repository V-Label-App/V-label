import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1'

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for cookies (refresh token)
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add response interceptor to debug
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.config.url, response.data)
    return response
  },
  (error) => {
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
  accessToken: string
  user?: {
    id: string
    email: string
    role: string
    fullName: string | null
    avatarUrl?: string | null
  }
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
}
