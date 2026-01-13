import type { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger.js'

export const errorHandler = (
  err: Error,
  _: Request,
  res: Response,
  __: NextFunction
) => {
  logger.error('ERROR', err.message, { stack: err.stack })
  res.status(500).json({ success: false, error: 'Internal server error' })
}
