-- Phase 2: Enhanced ML Export & Workflow Migration
-- This migration adds support for ML dataset export, auto-assignment, and enhanced workflow management

-- ==========================================================================
-- STEP 0: ENABLE REQUIRED EXTENSIONS
-- ==========================================================================

-- Enable UUID generation (required for uuid_generate_v4())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable JSONB GIN indexing (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ==========================================================================
-- STEP 1: CREATE NEW ENUMS
-- ==========================================================================

-- Project-specific roles (different from global UserRole)
CREATE TYPE "ProjectRole" AS ENUM ('MANAGER', 'REVIEWER', 'ANNOTATOR');

-- Task priority and difficulty
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'NORMAL', 'HARD', 'EXPERT_ONLY');

-- Assignment method tracking
CREATE TYPE "AssignmentMethod" AS ENUM ('MANUAL', 'AUTO_ROUND_ROBIN', 'AUTO_LEAST_BUSY', 'AUTO_SKILL_BASED', 'AUTO_RANDOM');


-- ==========================================================================
-- STEP 2: ALTER EXISTING TABLES
-- ==========================================================================

-- 2.1 Add project_role to project_members
ALTER TABLE "project_members"
    ADD COLUMN "project_role" "ProjectRole" DEFAULT 'ANNOTATOR'::"ProjectRole";

CREATE INDEX "project_members_project_role_idx" ON "project_members"("project_role");


-- 2.2 Enhance Task table
ALTER TABLE "tasks"
    -- Make imageUrl nullable for backward compatibility
    ALTER COLUMN "image_url" DROP NOT NULL,

    -- Add reference to Image table
    ADD COLUMN "image_id" UUID,

    -- Add task management fields
    ADD COLUMN "priority" "TaskPriority" DEFAULT 'MEDIUM'::"TaskPriority",
    ADD COLUMN "deadline" TIMESTAMP,
    ADD COLUMN "difficulty_level" "DifficultyLevel" DEFAULT 'NORMAL'::"DifficultyLevel";

CREATE INDEX "tasks_image_id_idx" ON "tasks"("image_id");
CREATE INDEX "tasks_priority_deadline_idx" ON "tasks"("priority", "deadline");


-- 2.3 Enhance TaskAssignment table
ALTER TABLE "task_assignments"
    -- AI model tracking
    ADD COLUMN "ai_model_id" UUID,
    ADD COLUMN "ai_confidence" DOUBLE PRECISION,

    -- Enhanced workflow tracking
    ADD COLUMN "rejection_count" INTEGER DEFAULT 0 NOT NULL,
    ADD COLUMN "max_rejections" INTEGER DEFAULT 3 NOT NULL,
    ADD COLUMN "skip_reason" TEXT,
    ADD COLUMN "estimated_time_minutes" INTEGER,
    ADD COLUMN "actual_time_seconds" INTEGER,

    -- Assignment tracking
    ADD COLUMN "assigned_by" UUID,
    ADD COLUMN "assignment_method" "AssignmentMethod" DEFAULT 'MANUAL'::"AssignmentMethod";

CREATE INDEX "task_assignments_ai_model_id_idx" ON "task_assignments"("ai_model_id");


-- ==========================================================================
-- STEP 3: CREATE NEW TABLES
-- ==========================================================================

-- 3.1 Images table (replace imageUrl string with structured metadata)
CREATE TABLE "images" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "project_id" UUID NOT NULL,
    "dataset_id" UUID,

    -- File information
    "original_filename" VARCHAR(255) NOT NULL,
    "storage_url" TEXT NOT NULL,
    "storage_path" TEXT,

    -- CRITICAL: Image dimensions for ML export normalization
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "channels" INTEGER DEFAULT 3 NOT NULL,

    -- File metadata
    "file_size_bytes" BIGINT,
    "format" VARCHAR(10),
    "checksum" VARCHAR(64),

    -- Upload tracking
    "uploaded_by" UUID,
    "uploaded_at" TIMESTAMP DEFAULT NOW() NOT NULL,

    CONSTRAINT "images_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
    CONSTRAINT "images_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id"),
    CONSTRAINT "images_project_id_checksum_key" UNIQUE("project_id", "checksum")
);

CREATE INDEX "images_project_id_idx" ON "images"("project_id");
CREATE INDEX "images_dataset_id_idx" ON "images"("dataset_id");
CREATE INDEX "images_checksum_idx" ON "images"("checksum");


-- 3.2 Datasets table (group images by upload batch)
CREATE TABLE "datasets" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "project_id" UUID NOT NULL,

    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,

    -- Source tracking
    "source" VARCHAR(100),
    "source_metadata" JSONB,

    -- Statistics
    "total_images" INTEGER DEFAULT 0 NOT NULL,
    "processed_images" INTEGER DEFAULT 0 NOT NULL,

    -- Upload info
    "uploaded_by" UUID,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,

    CONSTRAINT "datasets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
    CONSTRAINT "datasets_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id")
);

CREATE INDEX "datasets_project_id_idx" ON "datasets"("project_id");


-- 3.3 Annotation Consensus table (final annotation for ML export)
CREATE TABLE "annotation_consensus" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "task_id" UUID NOT NULL UNIQUE,

    -- Final annotation to export (after consensus/merge)
    "final_annotations" JSONB NOT NULL,

    -- Consensus metadata
    "consensus_method" VARCHAR(50) NOT NULL,
    "source_assignment_ids" UUID[] NOT NULL,
    "agreement_score" DOUBLE PRECISION,

    -- Quality verification
    "is_verified" BOOLEAN DEFAULT false NOT NULL,
    "verified_by" UUID,
    "verified_at" TIMESTAMP,

    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,

    CONSTRAINT "annotation_consensus_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE,
    CONSTRAINT "annotation_consensus_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id")
);

CREATE INDEX "annotation_consensus_is_verified_idx" ON "annotation_consensus"("is_verified");


-- 3.4 Exports table (track ML dataset exports)
CREATE TABLE "exports" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "project_id" UUID NOT NULL,

    -- Export configuration
    "format" VARCHAR(50) NOT NULL,
    "version" INTEGER DEFAULT 1 NOT NULL,

    -- Split configuration
    "split_type" VARCHAR(50),
    "split_ratio" JSONB,

    -- Filter criteria
    "filter_criteria" JSONB,

    -- Statistics
    "total_images" INTEGER,
    "total_annotations" INTEGER,
    "class_distribution" JSONB,

    -- File information
    "file_url" TEXT NOT NULL,
    "file_size_bytes" BIGINT,
    "checksum" VARCHAR(64),

    -- Metadata
    "exported_by" UUID NOT NULL,
    "download_count" INTEGER DEFAULT 0 NOT NULL,
    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,

    -- Config snapshot (preserve label_config at export time)
    "label_config_snapshot" JSONB,

    CONSTRAINT "exports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
    CONSTRAINT "exports_exported_by_fkey" FOREIGN KEY ("exported_by") REFERENCES "users"("id")
);

CREATE INDEX "exports_project_id_idx" ON "exports"("project_id");
CREATE INDEX "exports_created_at_idx" ON "exports"("created_at");
CREATE INDEX "exports_format_idx" ON "exports"("format");


-- 3.5 AI Models table (track AI models for assisted annotation)
CREATE TABLE "ai_models" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    "name" VARCHAR(100) NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "model_type" VARCHAR(50) NOT NULL,

    -- Model configuration
    "config" JSONB,

    -- Performance metrics
    "metrics" JSONB,

    -- Status
    "is_active" BOOLEAN DEFAULT true NOT NULL,
    "endpoint_url" TEXT,

    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX "ai_models_is_active_idx" ON "ai_models"("is_active");


-- 3.6 Assignment Rules table (auto-assignment configuration)
CREATE TABLE "assignment_rules" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "project_id" UUID NOT NULL UNIQUE,

    -- Enable/disable auto-assignment
    "is_auto_assign_enabled" BOOLEAN DEFAULT false NOT NULL,

    -- Assignment strategy
    "assignment_strategy" VARCHAR(50) DEFAULT 'ROUND_ROBIN' NOT NULL,

    -- Reviewer settings
    "auto_assign_reviewer" BOOLEAN DEFAULT true NOT NULL,
    "reviewer_delay_hours" INTEGER DEFAULT 0 NOT NULL,

    -- Workload limits
    "max_tasks_per_annotator" INTEGER DEFAULT 10 NOT NULL,
    "max_tasks_per_reviewer" INTEGER DEFAULT 20 NOT NULL,

    -- Quality thresholds
    "min_annotator_reputation" DOUBLE PRECISION DEFAULT 0 NOT NULL,
    "min_reviewer_reputation" DOUBLE PRECISION DEFAULT 70 NOT NULL,

    -- Rejection handling
    "max_rejections_before_reassign" INTEGER DEFAULT 3 NOT NULL,
    "auto_reassign_on_skip" BOOLEAN DEFAULT true NOT NULL,

    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
    "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,

    CONSTRAINT "assignment_rules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
);


-- 3.7 User Workload table (real-time workload tracking)
CREATE TABLE "user_workload" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,

    -- Current workload counters
    "assigned_tasks" INTEGER DEFAULT 0 NOT NULL,
    "in_progress_tasks" INTEGER DEFAULT 0 NOT NULL,
    "pending_review_tasks" INTEGER DEFAULT 0 NOT NULL,

    -- Limits
    "max_concurrent_tasks" INTEGER DEFAULT 10 NOT NULL,

    -- Availability
    "availability_status" VARCHAR(50) DEFAULT 'AVAILABLE' NOT NULL,

    "last_assigned_at" TIMESTAMP,
    "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,

    CONSTRAINT "user_workload_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "user_workload_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE,
    CONSTRAINT "user_workload_user_id_project_id_key" UNIQUE("user_id", "project_id")
);

CREATE INDEX "user_workload_availability_status_assigned_tasks_idx" ON "user_workload"("availability_status", "assigned_tasks");


-- 3.8 Task Reassignments table (track reassignment history)
CREATE TABLE "task_reassignments" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "task_id" UUID NOT NULL,

    "old_annotator_id" UUID,
    "new_annotator_id" UUID,

    "reason" VARCHAR(100) NOT NULL,
    "reassigned_by" UUID NOT NULL,
    "notes" TEXT,

    "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,

    CONSTRAINT "task_reassignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE,
    CONSTRAINT "task_reassignments_old_annotator_id_fkey" FOREIGN KEY ("old_annotator_id") REFERENCES "users"("id"),
    CONSTRAINT "task_reassignments_new_annotator_id_fkey" FOREIGN KEY ("new_annotator_id") REFERENCES "users"("id"),
    CONSTRAINT "task_reassignments_reassigned_by_fkey" FOREIGN KEY ("reassigned_by") REFERENCES "users"("id")
);

CREATE INDEX "task_reassignments_task_id_idx" ON "task_reassignments"("task_id");
CREATE INDEX "task_reassignments_old_annotator_id_idx" ON "task_reassignments"("old_annotator_id");
CREATE INDEX "task_reassignments_created_at_idx" ON "task_reassignments"("created_at");


-- ==========================================================================
-- STEP 4: ADD FOREIGN KEY CONSTRAINTS (that depend on new tables)
-- ==========================================================================

-- Add FK from tasks to images
ALTER TABLE "tasks"
    ADD CONSTRAINT "tasks_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE CASCADE;

-- Add FK from images to datasets
ALTER TABLE "images"
    ADD CONSTRAINT "images_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE SET NULL;

-- Add FK from task_assignments to ai_models
ALTER TABLE "task_assignments"
    ADD CONSTRAINT "task_assignments_ai_model_id_fkey" FOREIGN KEY ("ai_model_id") REFERENCES "ai_models"("id");

-- Add FK from task_assignments to users (assigned_by)
ALTER TABLE "task_assignments"
    ADD CONSTRAINT "task_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id");


-- ==========================================================================
-- STEP 5: DATA MIGRATION (Optional - if you have existing data)
-- ==========================================================================

-- NOTE: This section is commented out. Uncomment and customize if needed.

-- Example: Migrate existing imageUrl to Image table
-- INSERT INTO "images" (project_id, original_filename, storage_url, width, height)
-- SELECT
--     t.project_id,
--     'migrated_image.jpg' AS original_filename,
--     t.image_url AS storage_url,
--     1920 AS width,  -- Default dimensions
--     1080 AS height
-- FROM tasks t
-- WHERE t.image_url IS NOT NULL;

-- Then update tasks to reference the new images
-- UPDATE tasks t
-- SET image_id = i.id
-- FROM images i
-- WHERE i.storage_url = t.image_url;


-- ==========================================================================
-- STEP 6: ADD COMMENTS (Documentation)
-- ==========================================================================

COMMENT ON TABLE "images" IS 'Stores image metadata including dimensions required for ML export normalization';
COMMENT ON TABLE "datasets" IS 'Groups images by upload batch for better organization and tracking';
COMMENT ON TABLE "annotation_consensus" IS 'Stores final annotation after consensus/merge from multiple annotators';
COMMENT ON TABLE "exports" IS 'Tracks ML dataset exports in various formats (YOLO, COCO, Pascal VOC, etc)';
COMMENT ON TABLE "ai_models" IS 'Tracks AI models used for assisted annotation';
COMMENT ON TABLE "assignment_rules" IS 'Configuration for automatic task assignment to annotators/reviewers';
COMMENT ON TABLE "user_workload" IS 'Real-time tracking of user workload for load balancing';
COMMENT ON TABLE "task_reassignments" IS 'History of task reassignments for audit purposes';

-- ==========================================================================
-- Migration Complete
-- ==========================================================================
