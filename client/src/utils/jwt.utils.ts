import { jwtDecode } from 'jwt-decode'

export interface JwtPayload {
  sub: string // User ID (standard JWT claim)
  email: string
  role: string
  fullName?: string | null
  iat?: number
  exp?: number
}

export interface User {
  id: string
  email: string
  role: string
  fullName: string | null
}

/**
 * Decode JWT token and extract user information
 */
export const decodeToken = (token: string): User | null => {
  try {
    const decoded = jwtDecode<JwtPayload>(token)
    
    return {
      id: decoded.sub, // Map 'sub' to 'id'
      email: decoded.email,
      role: decoded.role,
      fullName: decoded.fullName ?? null,
    }
  } catch (error) {
    console.error('Failed to decode JWT token:', error)
    return null
  }
}

/**
 * Check if JWT token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = jwtDecode<JwtPayload>(token)
    
    if (!decoded.exp) {
      return false // If no expiration, assume not expired
    }
    
    const currentTime = Date.now() / 1000
    return decoded.exp < currentTime
  } catch (error) {
    console.error('Failed to check token expiration:', error)
    return true // If can't decode, consider it expired
  }
}

/**
 * Validate JWT token (decode and check expiration)
 */
export const validateToken = (token: string): boolean => {
  try {
    const decoded = jwtDecode<JwtPayload>(token)
    
    // Check if token has required fields
    if (!decoded.sub || !decoded.email || !decoded.role) {
      return false
    }
    
    // Check expiration
    if (isTokenExpired(token)) {
      return false
    }
    
    return true
  } catch (error) {
    console.error('Token validation failed:', error)
    return false
  }
}
