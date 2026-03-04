import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt.utils.js'
import { JwtPayload } from 'jsonwebtoken'

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload | string
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Access token is missing or invalid',
    })
  }

  const token = authHeader.split(' ')[1] || ''
  const decoded = verifyToken(token)

  if (!decoded) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    })
  }

  req.user = decoded
  next()
}
