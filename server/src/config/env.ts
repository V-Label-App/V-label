import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables (debug: false to hide promotional tips)
config({ debug: false })

// Validate required environment variables from .env.example
// Only require critical variables, others have defaults
const REQUIRED_VARS = ['JWT_SECRET'] // Only critical vars without safe defaults

try {
  const examplePath = join(__dirname, '../../.env.example')
  const exampleContent = readFileSync(examplePath, 'utf-8')
  const allVars = exampleContent
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => {
      const key = line.split('=')[0]?.trim()
      return key || ''
    })
    .filter(varName => varName !== '')

  // Only check required vars
  const missing = REQUIRED_VARS.filter(varName => !process.env[varName])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
} catch (error) {
  if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
    console.warn('Warning: .env.example not found, skipping validation')
  } else {
    throw error
  }
}

// Export configuration object
export default {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000'),

  // Database
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '5433'),
  DB_NAME: process.env.DB_NAME || 'vlabel_db',
  DB_USER: process.env.DB_USER || 'vlabel_user',
  DB_PASSWORD: process.env.DB_PASSWORD || 'vlabel_password',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-key-change-in-prod',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '10d',
}

