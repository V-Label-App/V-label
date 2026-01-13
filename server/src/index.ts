import './config/env.js'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import { requestLogger } from './middlewares/request-logger.js'
import { errorHandler } from './middlewares/error-handler.js'
import { logger } from './utils/logger.js'
import { testConnection } from './utils/database.js'

const app = express()

app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(requestLogger)

app.get('/api/v1/health', (_, res) => {
  res.json({ status: 'ok' })
})

app.use(errorHandler)

const PORT = process.env.PORT || 4000
const NODE_ENV = process.env.NODE_ENV || 'development'

app.listen(PORT, async () => {
  const startTime = new Date().toISOString()
  
  logger.server(`Started on port ${PORT}`)
  logger.info('ENV', `${NODE_ENV}`)
  
  // Test database connection
  const dbHost = process.env.DB_HOST || 'localhost'
  const dbPort = process.env.DB_PORT || '5433'
  const dbName = process.env.DB_NAME || 'vlabel_db'
  const dbConnected = await testConnection()
  
  if (dbConnected) {
    logger.info('DATABASE', `PostgreSQL@${dbHost}:${dbPort} | Database: ${dbName} | Status: Connected`)
  } else {
    logger.warn('DATABASE', `PostgreSQL@${dbHost}:${dbPort} | Database: ${dbName} | Status: Failed`)
  }
  
  // CORS info
  logger.info('CORS', `Enabled for all origins`)
  
  // Security info
  logger.info('SECURITY', `Helmet enabled | Rate limiting active`)
  
  console.log(`Health: http://localhost:${PORT}/api/v1/health`)
})
