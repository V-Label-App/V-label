/*
  Warnings:

  - Made the column `project_role` on table `project_members` required. This step will fail if there are existing NULL values in that column.
  - Made the column `assignment_method` on table `task_assignments` required. This step will fail if there are existing NULL values in that column.
  - Made the column `priority` on table `tasks` required. This step will fail if there are existing NULL values in that column.
  - Made the column `difficulty_level` on table `tasks` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
-- Type "LabelRequestStatus" already created in 20260128162432

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


-- NotificationType values already added in 20260128162432

-- DropForeignKey
ALTER TABLE "annotation_consensus" DROP CONSTRAINT "annotation_consensus_task_id_fkey";

-- DropForeignKey
ALTER TABLE "annotation_consensus" DROP CONSTRAINT "annotation_consensus_verified_by_fkey";

-- DropForeignKey
ALTER TABLE "assignment_rules" DROP CONSTRAINT "assignment_rules_project_id_fkey";

-- DropForeignKey
ALTER TABLE "datasets" DROP CONSTRAINT "datasets_project_id_fkey";

-- DropForeignKey
ALTER TABLE "datasets" DROP CONSTRAINT "datasets_uploaded_by_fkey";

-- DropForeignKey
ALTER TABLE "exports" DROP CONSTRAINT "exports_exported_by_fkey";

-- DropForeignKey
ALTER TABLE "exports" DROP CONSTRAINT "exports_project_id_fkey";

-- DropForeignKey
ALTER TABLE "images" DROP CONSTRAINT "images_dataset_id_fkey";

-- DropForeignKey
ALTER TABLE "images" DROP CONSTRAINT "images_project_id_fkey";

-- DropForeignKey
ALTER TABLE "images" DROP CONSTRAINT "images_uploaded_by_fkey";

-- DropForeignKey
ALTER TABLE "task_assignments" DROP CONSTRAINT "task_assignments_ai_model_id_fkey";

-- DropForeignKey
ALTER TABLE "task_assignments" DROP CONSTRAINT "task_assignments_assigned_by_fkey";

-- DropForeignKey
ALTER TABLE "task_reassignments" DROP CONSTRAINT "task_reassignments_new_annotator_id_fkey";

-- DropForeignKey
ALTER TABLE "task_reassignments" DROP CONSTRAINT "task_reassignments_old_annotator_id_fkey";

-- DropForeignKey
ALTER TABLE "task_reassignments" DROP CONSTRAINT "task_reassignments_reassigned_by_fkey";

-- DropForeignKey
ALTER TABLE "task_reassignments" DROP CONSTRAINT "task_reassignments_task_id_fkey";

-- DropForeignKey
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_image_id_fkey";

-- DropForeignKey
ALTER TABLE "user_workload" DROP CONSTRAINT "user_workload_project_id_fkey";

-- DropForeignKey
ALTER TABLE "user_workload" DROP CONSTRAINT "user_workload_user_id_fkey";

-- DropIndex
DROP INDEX "task_reassignments_task_id_idx";

-- AlterTable
ALTER TABLE "ai_models" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "annotation_consensus" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "verified_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "assignment_rules" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "datasets" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "exports" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "images" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "uploaded_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "project_members" ALTER COLUMN "project_role" SET NOT NULL;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "category_id" UUID;

-- AlterTable
ALTER TABLE "task_assignments" ALTER COLUMN "assignment_method" SET NOT NULL;

-- AlterTable
ALTER TABLE "task_reassignments" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tasks" ALTER COLUMN "priority" SET NOT NULL,
ALTER COLUMN "deadline" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "difficulty_level" SET NOT NULL;

-- AlterTable
ALTER TABLE "user_workload" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "last_assigned_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "project_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
-- Table "label_categories" already created in 20260128162432

-- CreateTable
-- Table "labels" already created in 20260128162432

-- CreateTable
-- Table "project_labels" already created in 20260128162432

-- CreateTable
-- Table "label_requests" already created in 20260128162432

-- CreateIndex
CREATE UNIQUE INDEX "project_categories_name_key" ON "project_categories"("name");

-- CreateIndex
-- Index "label_categories_name_key" already created

-- CreateIndex
-- Index "labels_is_global_idx" already created

-- CreateIndex
-- Index "labels_name_category_id_key" already created

-- CreateIndex
-- Index "project_labels_project_id_label_id_key" already created

-- CreateIndex
-- Index "label_requests_project_id_status_idx" already created

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "project_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "images"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_ai_model_id_fkey" FOREIGN KEY ("ai_model_id") REFERENCES "ai_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_dataset_id_fkey" FOREIGN KEY ("dataset_id") REFERENCES "datasets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "images" ADD CONSTRAINT "images_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annotation_consensus" ADD CONSTRAINT "annotation_consensus_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annotation_consensus" ADD CONSTRAINT "annotation_consensus_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exports" ADD CONSTRAINT "exports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exports" ADD CONSTRAINT "exports_exported_by_fkey" FOREIGN KEY ("exported_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_rules" ADD CONSTRAINT "assignment_rules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_workload" ADD CONSTRAINT "user_workload_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_workload" ADD CONSTRAINT "user_workload_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_reassignments" ADD CONSTRAINT "task_reassignments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_reassignments" ADD CONSTRAINT "task_reassignments_old_annotator_id_fkey" FOREIGN KEY ("old_annotator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_reassignments" ADD CONSTRAINT "task_reassignments_new_annotator_id_fkey" FOREIGN KEY ("new_annotator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_reassignments" ADD CONSTRAINT "task_reassignments_reassigned_by_fkey" FOREIGN KEY ("reassigned_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- Foreign Key "labels_category_id_fkey" already created

-- AddForeignKey
-- Foreign Key "labels_created_by_fkey" already created

-- AddForeignKey
-- Foreign Key "project_labels_project_id_fkey" already created

-- AddForeignKey
-- Foreign Key "project_labels_label_id_fkey" already created

-- AddForeignKey
-- Foreign Key "label_requests_project_id_fkey" already created

-- AddForeignKey
-- Foreign Key "label_requests_requested_by_fkey" already created

-- AddForeignKey
-- Foreign Key "label_requests_reviewed_by_fkey" already created
