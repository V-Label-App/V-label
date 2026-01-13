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
