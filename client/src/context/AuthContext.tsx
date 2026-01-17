import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authApi } from '../services/auth.api'
import { decodeToken, validateToken, type User } from '../utils/jwt.utils'

interface AuthContextType {
    user: User | null
    accessToken: string | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (email: string, password: string) => Promise<void>
    register: (email: string, password: string, fullName?: string) => Promise<void>
    devLogin: (role: 'ADMIN' | 'MANAGER' | 'REVIEWER' | 'ANNOTATOR') => Promise<void>
    loginWithGoogle: (idToken: string) => Promise<void>
    logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [accessToken, setAccessToken] = useState<string | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Initialize auth state from localStorage
    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('accessToken')

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
                        setAccessToken(null)
                        setUser(null)
                    }
                } else {
                    localStorage.removeItem('accessToken')
                }
            }
            setIsLoading(false)
        }

        initAuth()
    }, [])

    const handleAuthSuccess = (token: string) => {
        const decodedUser = decodeToken(token)

        if (!decodedUser) {
            throw new Error('Failed to decode token')
        }

        setAccessToken(token)
        setUser(decodedUser)
        localStorage.setItem('accessToken', token)
    }

    const login = async (email: string, password: string) => {
        try {
            const { accessToken } = await authApi.login({ email, password })
            handleAuthSuccess(accessToken)
        } catch (error) {
            console.error('Login failed:', error)
            throw error
        }
    }

    const register = async (email: string, password: string, fullName?: string) => {
        try {
            const { accessToken } = await authApi.register({ email, password, fullName })
            handleAuthSuccess(accessToken)
        } catch (error) {
            console.error('Registration failed:', error)
            throw error
        }
    }

    const devLogin = async (role: 'ADMIN' | 'MANAGER' | 'REVIEWER' | 'ANNOTATOR') => {
        try {
            const { accessToken } = await authApi.devLogin({ role })
            handleAuthSuccess(accessToken)
        } catch (error) {
            console.error('Dev login failed:', error)
            throw error
        }
    }

    const loginWithGoogle = async (idToken: string) => {
        try {
            const { accessToken } = await authApi.loginWithGoogle(idToken)
            handleAuthSuccess(accessToken)
        } catch (error) {
            console.error('Google login failed:', error)
            throw error
        }
    }

    const logout = () => {
        setUser(null)
        setAccessToken(null)
        localStorage.removeItem('accessToken')
        authApi.logout()
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
                logout,
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
