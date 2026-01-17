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
  } catch (error) {
    return null
  }
}
