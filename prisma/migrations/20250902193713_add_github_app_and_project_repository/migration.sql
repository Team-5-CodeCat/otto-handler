/*
  Warnings:

  - You are about to drop the column `github_id` on the `github` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[installation_id]` on the table `github` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `installation_id` to the `github` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `github` table without a default value. This is not possible if the table is not empty.
  - Made the column `access_token` on table `github` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."github_github_id_key";

-- AlterTable
ALTER TABLE "public"."github" DROP COLUMN "github_id",
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "installation_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL,
ALTER COLUMN "access_token" SET NOT NULL;

-- CreateTable
CREATE TABLE "public"."project_repositories" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "repo_full_name" TEXT NOT NULL,
    "selected_branch" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "project_repositories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_repositories_project_id_idx" ON "public"."project_repositories"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_repositories_project_id_repo_full_name_key" ON "public"."project_repositories"("project_id", "repo_full_name");

-- CreateIndex
CREATE UNIQUE INDEX "github_installation_id_key" ON "public"."github"("installation_id");

-- AddForeignKey
ALTER TABLE "public"."project_repositories" ADD CONSTRAINT "project_repositories_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;
