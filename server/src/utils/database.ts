import { PrismaClient } from '@prisma/client'
import { logger } from './logger.js'

// Prevent multiple instances in development (Hot Module Replacement)
declare global {
  var prisma: PrismaClient | undefined
}

export const prisma = global.prisma || new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'info', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
    { level: 'error', emit: 'stdout' },
  ],
})

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

// Log queries if desired (uncomment to enable)
prisma.$on('query', (e: any) => {
  logger.debug('DATABASE', `Query: ${e.query} | Duration: ${e.duration}ms`)
})

export const testConnection = async () => {
  try {
    await prisma.$connect()
    // Simple query to verify
    await prisma.$queryRaw`SELECT 1`
    logger.database('Prisma connection successful')
    return true
  } catch (error) {
    logger.error('DATABASE', 'Prisma connection failed', error)
    return false
  }
}

export default prisma
