/**
 * Manually apply Phase 2 migration
 *
 * Usage: npx ts-node scripts/apply-phase2-migration.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function applyMigration() {
  console.log('🚀 Starting Phase 2 migration...\n');

  try {
    // Read migration SQL file
    const migrationPath = path.join(
      __dirname,
      '../prisma/migrations/20260124_phase2_enhanced_ml_export_and_workflow/migration.sql'
    );

    console.log(`📄 Reading migration file: ${migrationPath}`);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📊 Executing migration SQL...\n');

    // Execute the migration SQL
    // Note: Prisma $executeRawUnsafe doesn't support multiple statements well
    // So we need to split by semicolon and execute one by one

    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip comments and empty statements
      if (!statement || statement.startsWith('--')) continue;

      try {
        await prisma.$executeRawUnsafe(statement);
        successCount++;

        // Show progress for long migrations
        if ((i + 1) % 10 === 0) {
          console.log(`✅ Executed ${i + 1}/${statements.length} statements...`);
        }
      } catch (error: any) {
        // Some errors are OK (like "extension already exists")
        if (
          error.message?.includes('already exists') ||
          error.message?.includes('duplicate')
        ) {
          console.log(`⚠️  Skipped (already exists): ${statement.substring(0, 50)}...`);
        } else {
          console.error(`❌ Error executing statement:`, statement.substring(0, 100));
          console.error(`   Error: ${error.message}`);
          errorCount++;
        }
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   ✅ Success: ${successCount} statements`);
    console.log(`   ❌ Errors: ${errorCount} statements`);

    // Verify tables created
    console.log('\n🔍 Verifying new tables...');

    const newTables = [
      'images',
      'datasets',
      'annotation_consensus',
      'exports',
      'ai_models',
      'assignment_rules',
      'user_workload',
      'task_reassignments'
    ];

    for (const tableName of newTables) {
      const result = await prisma.$queryRawUnsafe<any[]>(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = '${tableName}'
        )`
      );

      const exists = result[0]?.exists;
      console.log(`   ${exists ? '✅' : '❌'} Table "${tableName}": ${exists ? 'Created' : 'Missing'}`);
    }

    // Mark migration as applied in Prisma
    console.log('\n📝 Marking migration as applied in Prisma...');
    await prisma.$executeRawUnsafe(`
      INSERT INTO "_prisma_migrations" (
        id,
        checksum,
        finished_at,
        migration_name,
        logs,
        rolled_back_at,
        started_at,
        applied_steps_count
      ) VALUES (
        gen_random_uuid(),
        'phase2_manual_apply',
        NOW(),
        '20260124_phase2_enhanced_ml_export_and_workflow',
        'Manually applied via script',
        NULL,
        NOW(),
        1
      )
      ON CONFLICT (migration_name) DO NOTHING
    `);

    console.log('\n✅ Phase 2 migration completed successfully!');
    console.log('\n🎉 Next steps:');
    console.log('   1. Run: npx prisma generate');
    console.log('   2. Run: npx ts-node prisma/seed-phase2.ts');
    console.log('   3. Restart your server\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

applyMigration();
