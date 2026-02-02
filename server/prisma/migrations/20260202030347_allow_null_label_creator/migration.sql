-- DropForeignKey
ALTER TABLE "labels" DROP CONSTRAINT "labels_created_by_fkey";

-- AlterTable
ALTER TABLE "labels" ALTER COLUMN "created_by" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "labels" ADD CONSTRAINT "labels_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
