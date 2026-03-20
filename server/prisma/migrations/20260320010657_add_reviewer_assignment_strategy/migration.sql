-- AlterTable
ALTER TABLE "assignment_rules" ADD COLUMN     "reviewer_assignment_strategy" VARCHAR(50) NOT NULL DEFAULT 'ROUND_ROBIN';
