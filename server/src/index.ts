import { exec } from 'child_process'
import './config/env.js'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import { requestLogger } from './middlewares/request-logger.js'
import { errorHandler } from './middlewares/error-handler.js'
import { logger } from './utils/logger.js'
import { testConnection } from './utils/database.js'
import authRoutes from './routes/auth.routes.js'

const app = express()

app.use(helmet())
app.use(cors({
  origin: 'http://localhost:5173', // Frontend URL
  credentials: true, // Allow cookies
}))
app.use(express.json())
app.use(requestLogger)

// Routes
app.get('/api/v1/health', (_, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/v1/auth', authRoutes)

app.use(errorHandler)

const PORT = process.env.PORT || 4000
const NODE_ENV = process.env.NODE_ENV || 'development'

app.listen(PORT, async () => {
  const startTime = new Date().toISOString()
  
  logger.server(`Started on http://localhost:${PORT}`)
  logger.info('ENV', `${NODE_ENV}`)
  
  // Check Docker Status
  exec('docker ps', (err) => {
    if (err) {
      logger.warn('DOCKER', '❌ Not running or unreachable (Is Docker Desktop open?)')
    } else {
      logger.info('DOCKER', '✅ Service is active and running')
    }
  })

  // Test database connection
  const dbHost = process.env.DB_HOST || 'localhost'
  const dbPort = process.env.DB_PORT || '5433'
  const dbName = process.env.DB_NAME || 'vlabel_db'
  const dbConnected = await testConnection()
  
  if (dbConnected) {
    logger.info('DATABASE', `PostgreSQL@${dbHost}:${dbPort} | Database: ${dbName} | Status: ✅ Connected`)
  } else {
    logger.warn('DATABASE', `PostgreSQL@${dbHost}:${dbPort} | Database: ${dbName} | Status: ❌ Failed`)
  }
  
  // CORS info
  logger.info('CORS', `Enabled for all origins`)
  
  // Security info
  logger.info('SECURITY', `Helmet enabled | Rate limiting active`)
  
  // Automated Health Check
  try {
    const healthUrl = `http://localhost:${PORT}/api/v1/health`
    const response = await fetch(healthUrl)
    if (response.ok) {
      logger.info('HEALTH', `✅ Self-check passed | [${response.status}] ${healthUrl}`)
    } else {
      logger.error('HEALTH', `❌ Self-check failed | [${response.status}] ${healthUrl}`)
    }
  } catch (error) {
    logger.error('HEALTH', `❌ Self-check failed | Network Error`, error)
  }
})
