-- CreateTable
CREATE TABLE "task_submission_histories" (
    "id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "submission_number" INTEGER NOT NULL,
    "annotations" JSONB,
    "review_comment" TEXT,
    "status" "AssignmentStatus" NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "task_submission_histories_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "task_submission_histories" ADD CONSTRAINT "task_submission_histories_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "task_assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
