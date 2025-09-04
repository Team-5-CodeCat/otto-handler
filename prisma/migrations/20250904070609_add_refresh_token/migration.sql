/*
  Warnings:

  - You are about to drop the column `github_id` on the `github` table. All the data in the column will be lost.
  - The primary key for the `jobs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[installation_id]` on the table `github` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `installation_id` to the `github` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `github` table without a default value. This is not possible if the table is not empty.
  - Made the column `access_token` on table `github` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `job_id` on the `job_errors` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `job_id` on the `job_status_events` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `id` on the `jobs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `log_id` on the `logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `job_id` on the `logs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "public"."job_errors" DROP CONSTRAINT "job_errors_job_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."job_status_events" DROP CONSTRAINT "job_status_events_job_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."logs" DROP CONSTRAINT "logs_job_id_fkey";

-- DropIndex
DROP INDEX "public"."github_github_id_key";

-- AlterTable
ALTER TABLE "public"."github" DROP COLUMN "github_id",
ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "installation_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL,
ALTER COLUMN "access_token" SET NOT NULL;

-- AlterTable
ALTER TABLE "public"."job_errors" DROP COLUMN "job_id",
ADD COLUMN     "job_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "public"."job_status_events" DROP COLUMN "job_id",
ADD COLUMN     "job_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "public"."jobs" DROP CONSTRAINT "jobs_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL,
ADD CONSTRAINT "jobs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "public"."logs" DROP CONSTRAINT "logs_pkey",
DROP COLUMN "log_id",
ADD COLUMN     "log_id" UUID NOT NULL,
DROP COLUMN "job_id",
ADD COLUMN     "job_id" UUID NOT NULL,
ADD CONSTRAINT "logs_pkey" PRIMARY KEY ("log_id");

-- CreateTable
CREATE TABLE "public"."refresh_tokens" (
    "token_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("token_id")
);

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
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "public"."refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "project_repositories_project_id_idx" ON "public"."project_repositories"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_repositories_project_id_repo_full_name_key" ON "public"."project_repositories"("project_id", "repo_full_name");

-- CreateIndex
CREATE UNIQUE INDEX "github_installation_id_key" ON "public"."github"("installation_id");

-- CreateIndex
CREATE INDEX "job_errors_job_id_attempt_no_idx" ON "public"."job_errors"("job_id", "attempt_no");

-- CreateIndex
CREATE INDEX "job_status_events_job_id_at_idx" ON "public"."job_status_events"("job_id", "at" DESC);

-- CreateIndex
CREATE INDEX "logs_job_id_attempt_no_idx" ON "public"."logs"("job_id", "attempt_no");

-- CreateIndex
CREATE UNIQUE INDEX "logs_job_id_attempt_no_stream_key" ON "public"."logs"("job_id", "attempt_no", "stream");

-- AddForeignKey
ALTER TABLE "public"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_repositories" ADD CONSTRAINT "project_repositories_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_status_events" ADD CONSTRAINT "job_status_events_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_errors" ADD CONSTRAINT "job_errors_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."logs" ADD CONSTRAINT "logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
