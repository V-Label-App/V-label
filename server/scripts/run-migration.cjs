/**
 * Simple migration runner using pg library
 * Run: node scripts/run-migration.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Database connection from .env
  require('dotenv').config();

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5433,
    user: process.env.DB_USER || 'vlabel_user',
    password: process.env.DB_PASSWORD || 'vlabel_password',
    database: process.env.DB_NAME || 'vlabel_db',
  });

  console.log(`📍 Database: ${client.user}@${client.host}:${client.port}/${client.database}`);

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');

    // Read migration file
    const migrationPath = path.join(
      __dirname,
      '../prisma/migrations/20260124_phase2_enhanced_ml_export_and_workflow/migration.sql'
    );

    console.log('📄 Reading migration file...');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Executing migration...\n');

    // Execute entire migration as one transaction
    await client.query('BEGIN');

    try {
      await client.query(migrationSQL);
      await client.query('COMMIT');

      console.log('✅ Migration executed successfully!');

      // Verify tables
      console.log('\n🔍 Verifying tables...');
      const tables = [
        'images',
        'datasets',
        'annotation_consensus',
        'exports',
        'ai_models',
        'assignment_rules',
        'user_workload',
        'task_reassignments'
      ];

      for (const table of tables) {
        const result = await client.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = $1
          )`,
          [table]
        );
        const exists = result.rows[0].exists;
        console.log(`   ${exists ? '✅' : '❌'} ${table}`);
      }

      console.log('\n✅ Phase 2 migration completed!\n');
      console.log('📝 Next steps:');
      console.log('   1. npx prisma generate');
      console.log('   2. npx ts-node prisma/seed-phase2.ts');
      console.log('   3. Restart server\n');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n💡 Try running SQL manually using a database tool (TablePlus, DBeaver, pgAdmin)');
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
