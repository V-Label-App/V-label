/**
 * Simple logging utility with environment-based verbosity control
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
}

const currentLevel = (process.env.LOG_LEVEL || 'info') as LogLevel
const currentPriority = LOG_LEVEL_PRIORITY[currentLevel]

const shouldLog = (level: LogLevel) => LOG_LEVEL_PRIORITY[level] <= currentPriority

const formatTimestamp = () => new Date().toISOString()

export const logger = {
  // HTTP request logging
  http: (method: string, path: string, status: number, duration: number) => {
    if (!shouldLog('info')) return
    console.log(`[${formatTimestamp()}] ${method} ${path} ${status} ${duration}ms`)
  },

  // Server events
  server: (message: string) => {
    console.log(`[SERVER] ${message}`)
  },

  // Database logging
  database: (message: string, details?: any) => {
    if (!shouldLog('debug')) return
    if (details !== undefined) {
      console.log(`[DATABASE] ${message}`, details)
    } else {
      console.log(`[DATABASE] ${message}`)
    }
  },

  // Auth logging
  auth: (message: string, details?: any) => {
    if (!shouldLog('info')) return
    if (details !== undefined) {
      console.log(`[AUTH] ${message}`, details)
    } else {
      console.log(`[AUTH] ${message}`)
    }
  },

  // Debug logging
  debug: (source: string, message: string, data?: any) => {
    if (!shouldLog('debug')) return
    if (data !== undefined) {
      console.log(`[${source}] ${message}`, data)
    } else {
      console.log(`[${source}] ${message}`)
    }
  },

  // Info logging
  info: (source: string, message: string, details?: any) => {
    if (!shouldLog('info')) return
    if (details !== undefined) {
      console.log(`[${source}] ${message}`, details)
    } else {
      console.log(`[${source}] ${message}`)
    }
  },

  // Warning logging
  warn: (source: string, message: string, details?: any) => {
    if (!shouldLog('warn')) return
    if (details !== undefined) {
      console.warn(`[${source}] WARNING: ${message}`, details)
    } else {
      console.warn(`[${source}] WARNING: ${message}`)
    }
  },

  // Error logging
  error: (source: string, message: string, details?: any) => {
    if (details !== undefined) {
      console.error(`[${source}] ERROR: ${message}`, details)
    } else {
      console.error(`[${source}] ERROR: ${message}`)
    }
  },
}

export default logger
