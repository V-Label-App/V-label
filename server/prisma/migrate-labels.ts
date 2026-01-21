/**
 * Migration Script: JSONB label_config → Relational Tables
 *
 * This script migrates existing label data from projects.label_config (JSONB)
 * to the new relational tables: labels, project_labels
 *
 * Run: npx tsx prisma/migrate-labels.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface LegacyLabel {
  id: string;
  name: string;
  color: string;
  type?: string;
  hotkey?: string;
}

async function migrateLabels() {
  console.log('🚀 Starting label migration...\n');

  // Get all projects with label_config
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
      labelConfig: true,
    },
  });

  console.log(`📦 Found ${projects.length} projects to process\n`);

  // Track created labels to avoid duplicates
  const labelMap = new Map<string, string>(); // name -> labelId

  let totalLabels = 0;
  let totalProjectLabels = 0;

  for (const project of projects) {
    const labelConfig = project.labelConfig as LegacyLabel[] | null;

    if (!labelConfig || !Array.isArray(labelConfig) || labelConfig.length === 0) {
      console.log(`⏭️  Project "${project.name}" has no labels, skipping`);
      continue;
    }

    console.log(`📂 Processing project: "${project.name}" (${labelConfig.length} labels)`);

    for (const legacyLabel of labelConfig) {
      // Validate legacy label data
      if (!legacyLabel.name || !legacyLabel.color) {
        console.log(`  ⚠️  Invalid label data, skipping:`, legacyLabel);
        continue;
      }

      const labelKey = legacyLabel.name.toLowerCase().trim();

      // Check if label already exists (by name)
      let labelId = labelMap.get(labelKey);

      if (!labelId) {
        // Check database for existing label
        const existingLabel = await prisma.label.findFirst({
          where: {
            name: {
              equals: legacyLabel.name,
              mode: 'insensitive',
            },
          },
        });

        if (existingLabel) {
          labelId = existingLabel.id;
          labelMap.set(labelKey, labelId);
          console.log(`  ♻️  Using existing label: "${legacyLabel.name}"`);
        } else {
          // Create new label (as global by default for migrated labels)
          // We need a creator - use the first admin user
          const adminUser = await prisma.user.findFirst({
            where: { role: 'ADMIN' },
          });

          if (!adminUser) {
            console.log(`  ❌ No admin user found, cannot create label "${legacyLabel.name}"`);
            continue;
          }

          const newLabel = await prisma.label.create({
            data: {
              name: legacyLabel.name,
              color: legacyLabel.color,
              isGlobal: true, // Migrated labels are global
              createdBy: adminUser.id,
            },
          });

          labelId = newLabel.id;
          labelMap.set(labelKey, labelId);
          totalLabels++;
          console.log(`  ✅ Created new label: "${legacyLabel.name}" (${legacyLabel.color})`);
        }
      }

      // Create project_label association
      const existingAssociation = await prisma.projectLabel.findUnique({
        where: {
          projectId_labelId: {
            projectId: project.id,
            labelId: labelId,
          },
        },
      });

      if (!existingAssociation) {
        await prisma.projectLabel.create({
          data: {
            projectId: project.id,
            labelId: labelId,
          },
        });
        totalProjectLabels++;
        console.log(`  🔗 Linked label "${legacyLabel.name}" to project`);
      } else {
        console.log(`  ♻️  Label "${legacyLabel.name}" already linked to project`);
      }
    }

    console.log('');
  }

  console.log('═'.repeat(50));
  console.log('📊 Migration Summary:');
  console.log(`   - New labels created: ${totalLabels}`);
  console.log(`   - Project-label associations: ${totalProjectLabels}`);
  console.log('═'.repeat(50));
  console.log('\n✅ Migration completed successfully!');
  console.log('\n⚠️  Note: The label_config column is preserved for backup.');
  console.log('   You can remove it manually after verifying the migration.');
}

async function main() {
  try {
    await migrateLabels();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
