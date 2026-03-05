/*
  Warnings:

  - A unique constraint covering the columns `[project_id,dataset_id,checksum]` on the table `images` will be added. If there are existing duplicate values, this will fail.

*/
-- DropConstraint
ALTER TABLE "images" DROP CONSTRAINT "images_project_id_checksum_key";

-- CreateIndex
CREATE UNIQUE INDEX "images_project_id_dataset_id_checksum_key" ON "images"("project_id", "dataset_id", "checksum");
