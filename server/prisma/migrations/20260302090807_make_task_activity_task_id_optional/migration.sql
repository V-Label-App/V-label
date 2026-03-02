-- AlterTable: Make taskId nullable and change onDelete behavior
ALTER TABLE "task_activities" ALTER COLUMN "task_id" DROP NOT NULL;

-- Drop existing foreign key
ALTER TABLE "task_activities" DROP CONSTRAINT IF EXISTS "task_activities_task_id_fkey";

-- Re-add foreign key with ON DELETE SET NULL
ALTER TABLE "task_activities" ADD CONSTRAINT "task_activities_task_id_fkey" 
  FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
