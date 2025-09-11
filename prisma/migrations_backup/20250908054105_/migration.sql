/*
  Warnings:

  - You are about to drop the column `is_block_based` on the `pipelines` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."pipelines" DROP COLUMN "is_block_based";
