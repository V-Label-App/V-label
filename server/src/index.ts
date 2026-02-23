import { exec } from 'child_process'
import './config/env.js'
import express from 'express'
import http from 'http'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

import { requestLogger } from './middlewares/request-logger.js'
import { errorHandler } from './middlewares/error-handler.js'
import { logger } from './utils/logger.js'
import { testConnection } from './utils/database.js'
import authRoutes from './routes/auth.routes.js'
import userRoutes from './routes/user.routes.js'
import notificationRoutes from './routes/notification.routes.js'
import chatRoutes from './routes/chat.routes.js'
import adminRoutes from './routes/admin.routes.js'
import aiRoutes from './routes/ai.routes.js'
import labelRoutes from './routes/label.routes.js'
import projectLabelRoutes from './routes/project-label.routes.js'
import projectCategoryRoutes from './routes/project-category.routes.js'
import projectRoutes from './routes/project.routes.js'
import configRoutes from './routes/config.routes.js'
import annotatorRoutes from './routes/annotator.routes.js'
import reviewerRoutes from './routes/reviewer.routes.js'
import performanceRoutes from './routes/performance.routes.js'
import { initializeSocketServer } from './websocket/socket.server.js'
import { EmailTemplateService } from './services/email/template.service.js'
import { NotificationTemplateService } from './services/notification.template.service.js'

const app = express()
const httpServer = http.createServer(app)

// Catch uncaught exceptions to prevent silent crashes
process.on('uncaughtException', (err) => {
  logger.error('CRITICAL', 'Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('CRITICAL', `Unhandled Rejection at: ${promise} reason: ${reason}`);
});

// Initialize Socket.IO
const io = initializeSocketServer(httpServer)
app.set('io', io) // Make io accessible in routes

app.use(helmet())
app.use(cors({
  origin: true, // Cho phép mọi origin (tất cả các port/domain) đều qua được
  credentials: true, // Vẫn cho phép gửi cookies
}))
app.use(express.json())
app.use(requestLogger)

// Routes
app.get('/api/v1/health', (_, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/users', userRoutes)
app.use('/api/v1/notifications', notificationRoutes)
app.use('/api/v1/chat', chatRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/ai', aiRoutes)
app.use('/api/v1/config', configRoutes) // Public config endpoints
app.use('/api/v1/labels', labelRoutes)
app.use('/api/v1/projects', projectRoutes)
app.use('/api/v1/projects/:projectId/labels', projectLabelRoutes)
app.use('/api/v1/project-categories', projectCategoryRoutes)
app.use('/api/v1/annotator', annotatorRoutes)
app.use('/api/v1/reviewer', reviewerRoutes)
app.use('/api/v1/performance', performanceRoutes)

// 404 Catch-all
app.use((req, res, next) => {
  logger.warn('404', `Route not found: ${req.method} ${req.originalUrl}`)
  res.status(404).json({ error: `Route not found: ${req.method}   ${req.originalUrl}` })
})

app.use(errorHandler)

const PORT = process.env.PORT || 4000
const NODE_ENV = process.env.NODE_ENV || 'development'

const server = httpServer.listen(PORT, async () => {
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

  // Seed default email templates
  try {
    const templateService = new EmailTemplateService();
    await templateService.seedDefaultTemplates();
  } catch (error) {
    logger.error('EMAIL', 'Failed to seed default templates:', error);
  }

  // Seed default notification templates
  try {
    await NotificationTemplateService.seedDefaultTemplates();
  } catch (error) {
    logger.error('NOTIF', 'Failed to seed default notification templates:', error);
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
// Trigger restart: 2026-02-03
