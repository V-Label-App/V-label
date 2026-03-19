import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authApi, type AuthResponse } from '../services/auth.api'
import { decodeToken, validateToken, type User } from '../utils/jwt.utils'

interface AuthContextType {
    user: User | null
    accessToken: string | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (email: string, password: string, remember?: boolean) => Promise<AuthResponse>
    register: (email: string, password: string, fullName?: string) => Promise<void>
    devLogin: (role: 'ADMIN' | 'MANAGER' | 'REVIEWER' | 'ANNOTATOR') => Promise<void>
    loginWithGoogle: (idToken: string) => Promise<void>
    logout: () => void
    refreshUserProfile: () => Promise<void>
    verifyOtp: (otpToken: string, code: string, remember?: boolean) => Promise<void>
    impersonateUser: (userId: string) => Promise<void>
    stopImpersonation: () => Promise<void>
    isImpersonating: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [accessToken, setAccessToken] = useState<string | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Initialize auth state from localStorage or sessionStorage
    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')

            if (storedToken) {
                if (validateToken(storedToken)) {
                    setAccessToken(storedToken)
                    // Optimistic update
                    const decoded = decodeToken(storedToken)
                    if (decoded) setUser(decoded)

                    try {
                        // Fetch full profile
                        const { user: userProfile } = await authApi.getMe()
                        // Ensure the type matches, or cast/merge if needed. 
                        // Assuming authApi.getMe returns compatible User object
                        setUser(userProfile as User)
                    } catch (error) {
                        console.error('Failed to fetch profile:', error)
                        // If token is invalid/expired according to server
                        localStorage.removeItem('accessToken')
                        sessionStorage.removeItem('accessToken')
                        setAccessToken(null)
                        setUser(null)
                    }
                } else {
                    localStorage.removeItem('accessToken')
                    sessionStorage.removeItem('accessToken')
                }
            }
            setIsLoading(false)
        }

        initAuth()
    }, [])

    const handleAuthSuccess = async (token: string, remember: boolean = true) => {
        const decodedUser = decodeToken(token)

        if (!decodedUser) {
            throw new Error('Failed to decode token')
        }

        setAccessToken(token)

        if (remember) {
            localStorage.setItem('accessToken', token)
            sessionStorage.removeItem('accessToken')
        } else {
            sessionStorage.setItem('accessToken', token)
            localStorage.removeItem('accessToken')
        }

        // Optimistic update
        setUser(decodedUser)

        try {
            const { user: fullUser } = await authApi.getMe()
            setUser(fullUser as User)
        } catch (error) {
            console.error('Failed to update profile after login:', error)
            // Don't fail the login if profile fetch fails, we have the token
        }
    }

    const login = async (email: string, password: string, remember: boolean = false): Promise<AuthResponse> => {
        // Clear any existing session first to prevent state pollution
        localStorage.removeItem('accessToken');
        sessionStorage.removeItem('accessToken');
        setAccessToken(null);
        setUser(null);

        try {
            const response = await authApi.login({ email, password })

            // Handle Remember Me (Email persistence)
            if (remember) {
                localStorage.setItem('rememberedEmail', email)
            } else {
                localStorage.removeItem('rememberedEmail')
            }

            // Only complete auth if OTP is NOT required
            if (!response.otpRequired && response.accessToken) {
                await handleAuthSuccess(response.accessToken, remember)
            }

            return response
        } catch (error) {
            console.error('Login failed:', error)
            throw error
        }
    }

    const verifyOtp = async (otpToken: string, code: string, remember: boolean = false) => {
        try {
            const response = await authApi.verifyOtp(otpToken, code)
            
            if (response.accessToken) {
                await handleAuthSuccess(response.accessToken, remember)
            } else {
                throw new Error('Verification successful but no token received')
            }
        } catch (error) {
            console.error('OTP Verification failed:', error)
            throw error
        }
    }

    const register = async (email: string, password: string, fullName?: string) => {
        try {
            const { accessToken } = await authApi.register({ email, password, fullName })
            if (accessToken) {
                await handleAuthSuccess(accessToken, true) // Default to remember me for registration
            }
        } catch (error) {
            console.error('Registration failed:', error)
            throw error
        }
    }

    const devLogin = async (role: 'ADMIN' | 'MANAGER' | 'REVIEWER' | 'ANNOTATOR') => {
        try {
            const { accessToken } = await authApi.devLogin({ role })
            if (accessToken) {
                await handleAuthSuccess(accessToken, true) // Default true for dev login
            }
        } catch (error) {
            console.error('Dev login failed:', error)
            throw error
        }
    }

    const loginWithGoogle = async (idToken: string) => {
        try {
            const { accessToken } = await authApi.loginWithGoogle(idToken)
            if (accessToken) {
                await handleAuthSuccess(accessToken, true) // Default to remember me for Google
            }
        } catch (error) {
            console.error('Google login failed:', error)
            throw error
        }
    }

    const logout = () => {
        setUser(null)
        setAccessToken(null)
        localStorage.removeItem('accessToken')
        sessionStorage.removeItem('accessToken')
        authApi.logout()
    }

    const refreshUserProfile = async () => {
        try {
            const { user: userProfile } = await authApi.getMe()
            setUser(userProfile as User)
        } catch (error) {
            console.error('Failed to refresh profile:', error)
        }
    }

    const impersonateUser = async (userId: string) => {
        try {
            const { accessToken: newAccessToken } = await authApi.impersonate(userId)

            // Store original token
            const currentToken = accessToken
            if (currentToken) {
                localStorage.setItem('originalAccessToken', currentToken)
            }

            // Switch to new token
            if (newAccessToken) {
                await handleAuthSuccess(newAccessToken, true)
            }
        } catch (error) {
            console.error('Impersonation failed:', error)
            throw error
        }
    }

    const stopImpersonation = async () => {
        const originalToken = localStorage.getItem('originalAccessToken')
        if (originalToken) {
            // Restore original token
            await handleAuthSuccess(originalToken, true)
            localStorage.removeItem('originalAccessToken')
        }
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                accessToken,
                isAuthenticated: !!user && !!accessToken,
                isLoading,
                login,
                register,
                devLogin,
                loginWithGoogle,
                verifyOtp,
                logout,
                refreshUserProfile,
                impersonateUser,
                stopImpersonation,
                isImpersonating: !!localStorage.getItem('originalAccessToken')
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}
