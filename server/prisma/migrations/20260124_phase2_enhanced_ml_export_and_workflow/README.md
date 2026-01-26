# Phase 2: Enhanced ML Export & Workflow Migration

**Created:** 2026-01-24
**Migration ID:** `20260124_phase2_enhanced_ml_export_and_workflow`
**Type:** Schema Enhancement (Additive + Modifications)

## 📋 Overview

This migration upgrades the V-Label database to **Phase 2: Production Ready** with enhanced features for:

- ✅ **ML Dataset Export** (YOLO, COCO, Pascal VOC formats)
- ✅ **Auto-Assignment** (Round-robin, least-busy, skill-based strategies)
- ✅ **Workload Management** (Real-time tracking and balancing)
- ✅ **Enhanced Workflow** (Rejection tracking, skip workflow, reassignment history)
- ✅ **Image Metadata** (Dimensions for coordinate normalization)
- ✅ **Annotation Consensus** (Merge multiple annotations for quality)

---

## 🎯 Changes Summary

### New Tables (8)
1. **`images`** - Stores image metadata with dimensions (width, height) for ML export
2. **`datasets`** - Groups images by upload batch
3. **`annotation_consensus`** - Final annotations for ML export after consensus
4. **`exports`** - Track ML dataset exports (YOLO, COCO, etc.)
5. **`ai_models`** - Track AI models used for assisted annotation
6. **`assignment_rules`** - Auto-assignment configuration per project
7. **`user_workload`** - Real-time workload tracking for load balancing
8. **`task_reassignments`** - Audit trail for task reassignments

### Modified Tables
- **`project_members`** - Added `project_role` (PROJECT_MANAGER, REVIEWER, ANNOTATOR)
- **`tasks`** - Added `image_id` (FK to images), `priority`, `deadline`, `difficulty_level`
- **`task_assignments`** - Added `ai_model_id`, `rejection_count`, `skip_reason`, `assigned_by`, `assignment_method`, etc.

### New Enums
- `ProjectRole` - PROJECT_MANAGER, REVIEWER, ANNOTATOR
- `TaskPriority` - LOW, MEDIUM, HIGH, URGENT
- `DifficultyLevel` - EASY, NORMAL, HARD, EXPERT_ONLY
- `AssignmentMethod` - MANUAL, AUTO_ROUND_ROBIN, AUTO_LEAST_BUSY, AUTO_SKILL_BASED, AUTO_RANDOM

---

## ⚠️ IMPORTANT: Pre-Migration Checklist

### 1. Backup Your Database

```bash
# PostgreSQL backup
pg_dump -h localhost -p 5433 -U your_user -d vlabel_db > backup_before_phase2_$(date +%Y%m%d_%H%M%S).sql

# Or using Prisma
cd server
npx prisma db pull --print
```

### 2. Verify Database State

```bash
# Check current migrations
npx prisma migrate status

# Verify database connection
psql -h localhost -p 5433 -U your_user -d vlabel_db -c "SELECT version();"
```

### 3. Stop Application

```bash
# Stop your backend server to prevent concurrent writes during migration
pkill -f "node.*server" # or use your process manager
```

---

## 🚀 Migration Steps

### Option A: Manual SQL Execution (Recommended for Production)

#### Step 1: Review the Migration

```bash
cat prisma/migrations/20260124_phase2_enhanced_ml_export_and_workflow/migration.sql
```

#### Step 2: Test in Staging First

```bash
# Connect to staging database
psql -h localhost -p 5433 -U your_user -d vlabel_db_staging

# Execute migration
\i prisma/migrations/20260124_phase2_enhanced_ml_export_and_workflow/migration.sql

# Verify tables created
\dt

# Check specific table
\d images
\d annotation_consensus
```

#### Step 3: Apply to Production

```bash
# Connect to production database
psql -h localhost -p 5433 -U your_user -d vlabel_db

# Execute migration
\i prisma/migrations/20260124_phase2_enhanced_ml_export_and_workflow/migration.sql

# Verify
SELECT COUNT(*) FROM images;
SELECT COUNT(*) FROM datasets;
```

#### Step 4: Mark Migration as Applied in Prisma

```bash
cd server
npx prisma migrate resolve --applied 20260124_phase2_enhanced_ml_export_and_workflow
```

---

### Option B: Prisma Migrate (Development Only)

⚠️ **Warning:** Only use this in development environment with disposable data.

```bash
cd server

# Option 1: Reset and re-apply all migrations (DELETES ALL DATA)
npx prisma migrate reset

# Option 2: Force apply (if you know what you're doing)
npx prisma migrate deploy
```

---

## 📊 Data Migration (If You Have Existing Data)

### Migrate Existing imageUrl to Image Table

If you have existing tasks with `image_url`, you need to migrate them to the new `images` table.

**Option 1: Use Default Dimensions (Quick)**

```sql
-- Insert images with default dimensions (1920x1080)
INSERT INTO "images" (project_id, original_filename, storage_url, width, height, uploaded_at)
SELECT DISTINCT
    t.project_id,
    'migrated_' || t.id || '.jpg' AS original_filename,
    t.image_url AS storage_url,
    1920 AS width,
    1080 AS height,
    NOW() AS uploaded_at
FROM tasks t
WHERE t.image_url IS NOT NULL AND t.image_url != '';

-- Update tasks to reference new images
UPDATE tasks t
SET image_id = i.id
FROM images i
WHERE i.storage_url = t.image_url;

-- Verify
SELECT COUNT(*) FROM tasks WHERE image_id IS NOT NULL;
```

**Option 2: Extract Real Dimensions (Better)**

If images are accessible, you can write a Node.js script to get real dimensions:

```javascript
// server/scripts/migrate-images.ts
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp'; // npm install sharp
import axios from 'axios';

const prisma = new PrismaClient();

async function migrateImages() {
  const tasks = await prisma.task.findMany({
    where: { imageUrl: { not: null } },
    select: { id: true, projectId: true, imageUrl: true },
  });

  for (const task of tasks) {
    try {
      // Download image
      const response = await axios.get(task.imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);

      // Extract dimensions
      const metadata = await sharp(buffer).metadata();

      // Create image record
      const image = await prisma.image.create({
        data: {
          projectId: task.projectId,
          originalFilename: `migrated_${task.id}.${metadata.format}`,
          storageUrl: task.imageUrl,
          width: metadata.width,
          height: metadata.height,
          channels: metadata.channels || 3,
          format: metadata.format,
        },
      });

      // Update task
      await prisma.task.update({
        where: { id: task.id },
        data: { imageId: image.id },
      });

      console.log(`✅ Migrated task ${task.id}`);
    } catch (error) {
      console.error(`❌ Failed to migrate task ${task.id}:`, error.message);
    }
  }
}

migrateImages().then(() => process.exit(0));
```

Run it:

```bash
cd server
npx ts-node scripts/migrate-images.ts
```

---

## ✅ Post-Migration Verification

### 1. Verify Schema

```sql
-- Check all new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
    'images',
    'datasets',
    'annotation_consensus',
    'exports',
    'ai_models',
    'assignment_rules',
    'user_workload',
    'task_reassignments'
);

-- Check enums
SELECT enumlabel FROM pg_enum
WHERE enumtypid = 'ProjectRole'::regtype::oid;
```

### 2. Verify Data Integrity

```sql
-- Check project_members have project_role
SELECT COUNT(*) FROM project_members WHERE project_role IS NULL;
-- Should be 0

-- Check tasks with images
SELECT
    COUNT(*) FILTER (WHERE image_id IS NOT NULL) as with_image_id,
    COUNT(*) FILTER (WHERE image_url IS NOT NULL) as with_image_url,
    COUNT(*) as total
FROM tasks;
```

### 3. Test Application

```bash
# Regenerate Prisma Client
cd server
npx prisma generate

# Start application
npm run dev

# Test endpoints:
# - POST /api/projects/{id}/images (upload)
# - POST /api/projects/{id}/export (export to YOLO)
# - GET /api/assignments/my-tasks
```

---

## 🔄 Rollback Plan

### If Migration Fails

```bash
# Restore from backup
psql -h localhost -p 5433 -U your_user -d vlabel_db < backup_before_phase2_YYYYMMDD_HHMMSS.sql

# Or manual rollback (reverse order)
psql -h localhost -p 5433 -U your_user -d vlabel_db

-- Drop new tables
DROP TABLE IF EXISTS task_reassignments CASCADE;
DROP TABLE IF EXISTS user_workload CASCADE;
DROP TABLE IF EXISTS assignment_rules CASCADE;
DROP TABLE IF EXISTS ai_models CASCADE;
DROP TABLE IF EXISTS exports CASCADE;
DROP TABLE IF EXISTS annotation_consensus CASCADE;
DROP TABLE IF EXISTS datasets CASCADE;
DROP TABLE IF EXISTS images CASCADE;

-- Drop enums
DROP TYPE IF EXISTS AssignmentMethod;
DROP TYPE IF EXISTS DifficultyLevel;
DROP TYPE IF EXISTS TaskPriority;
DROP TYPE IF EXISTS ProjectRole;

-- Revert table changes
ALTER TABLE task_assignments
    DROP COLUMN IF EXISTS ai_model_id,
    DROP COLUMN IF EXISTS ai_confidence,
    DROP COLUMN IF EXISTS rejection_count,
    DROP COLUMN IF EXISTS max_rejections,
    DROP COLUMN IF EXISTS skip_reason,
    DROP COLUMN IF EXISTS estimated_time_minutes,
    DROP COLUMN IF EXISTS actual_time_seconds,
    DROP COLUMN IF EXISTS assigned_by,
    DROP COLUMN IF EXISTS assignment_method;

ALTER TABLE tasks
    DROP COLUMN IF EXISTS image_id,
    DROP COLUMN IF EXISTS priority,
    DROP COLUMN IF EXISTS deadline,
    DROP COLUMN IF EXISTS difficulty_level,
    ALTER COLUMN image_url SET NOT NULL;

ALTER TABLE project_members
    DROP COLUMN IF EXISTS project_role;
```

---

## 📝 Next Steps After Migration

1. **Run Seed Data** (see `server/prisma/seed-phase2.ts`)
   ```bash
   npx ts-node prisma/seed-phase2.ts
   ```

2. **Update Backend Services**
   - Implement export service (`/api/exports`)
   - Implement auto-assignment logic
   - Update image upload to extract dimensions

3. **Update Frontend**
   - Add export UI
   - Update annotation canvas to calculate normalized coordinates
   - Add workload dashboard

---

## 📞 Support

If you encounter issues:

1. Check migration logs: `cat server/logs/migration.log`
2. Verify Prisma Client is regenerated: `npx prisma generate`
3. Check database connection: `npx prisma db push --preview-feature`

For questions, contact the tech lead or create an issue.

---

## 📄 Related Documentation

- [Database Design Documentation](../../../docs/04_database.md)
- [API Documentation](../../../docs/swagger.yaml)
- [Export Service Guide](../../../docs/export_service.md)

---

**Migration Status:** ⏳ Pending Manual Execution
**Estimated Duration:** 5-10 minutes (depending on data volume)
**Downtime Required:** Yes (recommend maintenance window)
