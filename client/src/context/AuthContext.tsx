import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authApi } from '../services/auth.api'

// Define locally to avoid runtime import errors
interface AuthResponse {
    accessToken: string
    user: {
        id: string
        email: string
        role: string
        fullName: string | null
    }
}

interface User {
    id: string
    email: string
    role: string
    fullName: string | null
}

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
    const [user, setUser] = useState<User | null>(null)
    const [accessToken, setAccessToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Initialize auth state from localStorage
    useEffect(() => {
        const storedToken = localStorage.getItem('accessToken')
        const storedUser = localStorage.getItem('user')

        if (storedToken && storedUser) {
            setAccessToken(storedToken)
            setUser(JSON.parse(storedUser))
        }
        setIsLoading(false)
    }, [])

    const handleAuthSuccess = (data: AuthResponse) => {
        console.log('🔐 handleAuthSuccess called with:', data)
        setAccessToken(data.accessToken)
        setUser(data.user)
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('user', JSON.stringify(data.user))
        console.log('💾 Saved to localStorage:', {
            accessToken: localStorage.getItem('accessToken'),
            user: localStorage.getItem('user')
        })
    }

    const login = async (email: string, password: string) => {
        try {
            const data = await authApi.login({ email, password })
            handleAuthSuccess(data)
        } catch (error) {
            console.error('Login failed:', error)
            throw error
        }
    }

    const devLogin = async (role: 'ADMIN' | 'MANAGER' | 'REVIEWER' | 'ANNOTATOR') => {
        try {
            const data = await authApi.devLogin({ role })
            handleAuthSuccess(data)
        } catch (error) {
            console.error('Dev login failed:', error)
            throw error
        }
    }

    const logout = () => {
        setUser(null)
        setAccessToken(null)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('user')
        authApi.logout()
    }

    return (
        <AuthContext.Provider
            value={{
                user,
                accessToken,
                isAuthenticated: !!user,
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
