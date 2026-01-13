import type { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger.js'

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now()
  res.on('finish', () => {
    logger.http(
      req.method,
      req.originalUrl,
      res.statusCode,
      Date.now() - start
    )
  })
  next()
}
