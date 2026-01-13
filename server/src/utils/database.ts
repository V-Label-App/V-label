import pkg from 'pg'
import { logger } from './logger.js'

const { Pool } = pkg

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'vlabel_db',
  user: process.env.DB_USER || 'vlabel_user',
  password: process.env.DB_PASSWORD || 'vlabel_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

// Test connection
export const testConnection = async () => {
  try {
    const client = await pool.connect()
    const result = await client.query('SELECT NOW()')
    client.release()
    logger.database(`Connection successful | Time: ${result.rows[0]?.now}`)
    return true
  } catch (error) {
    logger.error('DATABASE', 'Connection failed', error)
    return false
  }
}

// Query helper
export const query = async (text: string, params?: any[]) => {
  const start = Date.now()
  try {
    const result = await pool.query(text, params)
    const duration = Date.now() - start
    logger.debug('DATABASE', `Query executed in ${duration}ms`, { text })
    return result
  } catch (error) {
    logger.error('DATABASE', 'Query failed', { text, error })
    throw error
  }
}

export default pool
