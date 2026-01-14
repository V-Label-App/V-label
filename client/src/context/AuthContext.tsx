import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { authApi } from '../services/auth.api'
import { decodeToken, validateToken, type User } from '../utils/jwt.utils'

interface AuthContextType {
    user: User | null
    accessToken: string | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (email: string, password: string) => Promise<void>
    devLogin: (role: 'ADMIN' | 'MANAGER' | 'REVIEWER' | 'ANNOTATOR') => Promise<void>
    logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [accessToken, setAccessToken] = useState<string | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Initialize auth state from localStorage
    useEffect(() => {
        const storedToken = localStorage.getItem('accessToken')

        if (storedToken) {
            // Validate token before using it
            if (validateToken(storedToken)) {
                const decodedUser = decodeToken(storedToken)
                if (decodedUser) {
                    setAccessToken(storedToken)
                    setUser(decodedUser)
                } else {
                    // Token is invalid, clear it
                    localStorage.removeItem('accessToken')
                }
            } else {
                // Token is expired or invalid, clear it
                console.log('Stored token is invalid or expired, clearing...')
                localStorage.removeItem('accessToken')
            }
        }
        setIsLoading(false)
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

    const devLogin = async (role: 'ADMIN' | 'MANAGER' | 'REVIEWER' | 'ANNOTATOR') => {
        try {
            const { accessToken } = await authApi.devLogin({ role })
            handleAuthSuccess(accessToken)
        } catch (error) {
            console.error('Dev login failed:', error)
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
                devLogin,
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
