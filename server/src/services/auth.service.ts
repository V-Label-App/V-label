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
    avatarUrl: string | null
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
        avatarUrl: true,
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
        avatarUrl: user.avatarUrl,
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
        avatarUrl: true,
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
        avatarUrl: user.avatarUrl,
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

      },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        avatarUrl: true,
      },
    })

    // Generate tokens
    const payload = {
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
      fullName: newUser.fullName,
      avatarUrl: newUser.avatarUrl,
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
        avatarUrl: newUser.avatarUrl,
      },
    }
  }

  /**
   * Login with Google (Firebase)
   */
  static async loginWithGoogle(idToken: string): Promise<LoginResult | null> {
    const { verifyFirebaseToken } = await import('./firebaseAuth.service.js')
    
    // Verify token with Firebase Admin
    const decodedToken = await verifyFirebaseToken(idToken)
    const { uid, email, name, picture } = decodedToken

    if (!email) {
      throw new Error('Google account must have an email address')
    }

    // Find user by googleId
    let user = await prisma.user.findUnique({
      where: { googleId: uid },
    })

    if (user) {
      // Update latest info from Google
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          avatarUrl: picture || user.avatarUrl,
          fullName: name || user.fullName,
        }
      })
    }

    // If not found by googleId, try by email (Account Linking)
    if (!user) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        // Link account
        user = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            googleId: uid,
            avatarUrl: picture || existingUser.avatarUrl,
            // provider: 'GOOGLE', // Optional: Keep LOCAL or switch to GOOGLE? Let's keep original for now or support multiple. 
            // Prisma schema has single provider enum. Let's switch to GOOGLE if they login via Google to reflect latest method, 
            // OR we treat provider as "Registration Method". Let's update to GOOGLE to authorize future google logins easily.
            provider: 'GOOGLE' 
          },
        })
      } else {
        // Create new user
        user = await prisma.user.create({
          data: {
            email,
            googleId: uid,
            fullName: name || 'Google User',
            avatarUrl: picture,
            provider: 'GOOGLE',
            role: 'ANNOTATOR',

          },
        })
      }
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
        avatarUrl: user.avatarUrl,
      },
    }
  }
}
