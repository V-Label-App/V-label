import { prisma } from '../utils/database.js'
import { comparePassword } from '../utils/password.utils.js'
import { signAccessToken, signRefreshToken } from '../utils/jwt.utils.js'
import { UserRole } from '@prisma/client'

interface LoginResult {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    role: UserRole
    fullName: string | null
  }
}

export class AuthService {
  /**
   * Standard login with email and password
   */
  static async login(email: string, password: string): Promise<LoginResult | null> {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        fullName: true,
        isActive: true,
        provider: true,
      },
    })

    // User not found or not LOCAL provider
    if (!user || user.provider !== 'LOCAL') {
      return null
    }

    // Check if account is active
    if (!user.isActive) {
      return null
    }

    // Verify password
    if (!user.passwordHash) {
      return null
    }

    const isValidPassword = await comparePassword(password, user.passwordHash)
    if (!isValidPassword) {
      return null
    }

    // Generate tokens
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    }

    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      },
    }
  }

  /**
   * Developer bypass login - only works in development
   */
  static async devLogin(role: UserRole): Promise<LoginResult | null> {
    // Security: Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return null
    }

    // Find a user with this role
    const user = await prisma.user.findFirst({
      where: {
        role,
        provider: 'LOCAL',
      },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
      },
    })

    if (!user) {
      return null
    }

    // Generate tokens
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    }

    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
      },
    }
  }

  /**
   * Register a new user with email and password
   */
  static async register(
    email: string,
    password: string,
    fullName?: string
  ): Promise<LoginResult | null> {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return null // Email already taken
    }

    // Hash password
    const { hashPassword } = await import('../utils/password.utils.js')
    const passwordHash = await hashPassword(password)

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName: fullName || null,
        provider: 'LOCAL',
        role: 'ANNOTATOR', // Default role for new users
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
      },
    })

    // Generate tokens
    const payload = {
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
    }

    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    return {
      accessToken,
      refreshToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        fullName: newUser.fullName,
      },
    }
  }
}
