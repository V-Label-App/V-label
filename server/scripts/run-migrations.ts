#!/usr/bin/env tsx

/**
 * Database Migration Runner
 * Runs SQL migration files in order, tracking which have been applied
 */

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import pkg from 'pg'
import { config } from 'dotenv'

const { Pool } = pkg

config()

const MIGRATIONS_DIR = join(process.cwd(), 'src', 'migrations')

async function runMigrations() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    database: process.env.DB_NAME || 'vlabel_db',
    user: process.env.DB_USER || 'vlabel_user',
    password: process.env.DB_PASSWORD || 'vlabel_password',
  })

  try {
    // Test connection
    await pool.query('SELECT NOW()')
    console.log('✅ Database connection established')

    // Create migrations tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `)

    // Get applied migrations
    const appliedResult = await pool.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    )
    const applied = new Set(appliedResult.rows.map((r) => r.version))

    // Read migration files
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql') && f !== 'README.md')
      .sort()

    console.log(`\n📋 Found ${files.length} migration file(s)`)

    let appliedCount = 0
    let skippedCount = 0

    for (const file of files) {
      const version = file.replace('.sql', '')
      
      if (applied.has(version)) {
        console.log(`⏭️  Skipping ${file} (already applied)`)
        skippedCount++
        continue
      }

      console.log(`\n🔄 Running migration: ${file}`)
      const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8')

      try {
        // Run in transaction
        const client = await pool.connect()
        try {
          await client.query('BEGIN')
          await client.query(sql)
          await client.query(
            'INSERT INTO schema_migrations (version) VALUES ($1)',
            [version]
          )
          await client.query('COMMIT')
          console.log(`✅ Migration ${file} applied successfully`)
          appliedCount++
        } catch (err: any) {
          await client.query('ROLLBACK')
          throw err
        } finally {
          client.release()
        }
      } catch (err: any) {
        console.error(`❌ Error applying migration ${file}:`, err.message)
        process.exit(1)
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log(`✅ Migration process completed`)
    console.log(`   Applied: ${appliedCount} | Skipped: ${skippedCount} | Total: ${files.length}`)
    console.log('='.repeat(60) + '\n')
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigrations()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration process failed:', error)
    process.exit(1)
  })
