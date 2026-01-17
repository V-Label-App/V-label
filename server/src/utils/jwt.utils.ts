import jwt from 'jsonwebtoken'
import config from '../config/env.js'

export const signAccessToken = (payload: object) => {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as any,
  })
}

export const signRefreshToken = (payload: object) => {
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN as any,
  })
}

export const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, config.JWT_SECRET)
  } catch (error: any) {
    console.log('[AUTH_DEBUG] Config Secret Length:', config.JWT_SECRET.length)
    console.log('[AUTH_DEBUG] Token:', token.substring(0, 10) + '...')
    
    if (error.name === 'TokenExpiredError') {
      console.log('[AUTH] Token expired at', error.expiredAt)
    } else {
      console.error('[AUTH] Token verification failed:', error.message)
    }
    return null
  }
}
