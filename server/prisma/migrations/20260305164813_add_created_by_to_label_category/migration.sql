-- AlterTable
ALTER TABLE "label_categories" ADD COLUMN     "created_by" UUID;

-- AddForeignKey
ALTER TABLE "label_categories" ADD CONSTRAINT "label_categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
