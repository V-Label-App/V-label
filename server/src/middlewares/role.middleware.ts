import { Request, Response, NextFunction } from 'express'
import logger from '../utils/logger.js'

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userPayload = req.user as any

    if (!userPayload || !userPayload.role) {
      logger.warn('AUTH', 'Access denied: No role found in user payload')
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: Insufficient permissions'
      })
    }

    const normalizedUserRole = userPayload.role.toUpperCase()
    const normalizedAllowedRoles = roles.map(r => r.toUpperCase())

    if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
      logger.warn('AUTH', `Access denied: User role ${userPayload.role} not in allowed roles: ${roles.join(', ')}`)
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied: Insufficient permissions'
      })
    }

    next()
  }
}
