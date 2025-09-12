/*
  Warnings:

  - You are about to drop the column `created_at` on the `github` table. All the data in the column will be lost.
  - You are about to drop the column `installation_id` on the `github` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `github` table. All the data in the column will be lost.
  - You are about to drop the `project_repositories` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[github_id]` on the table `github` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[job_id,dedupe_key]` on the table `job_errors` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[idempotency_key]` on the table `pipeline_runs` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[project_id,name,version]` on the table `pipelines` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,name]` on the table `projects` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `github_id` to the `github` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."project_repositories" DROP CONSTRAINT "project_repositories_project_id_fkey";

-- DropIndex
DROP INDEX "public"."github_installation_id_key";

-- DropIndex
DROP INDEX "public"."job_errors_dedupe_key_key";

-- DropIndex
DROP INDEX "public"."job_errors_occurred_at_idx";

-- DropIndex
DROP INDEX "public"."job_status_events_job_id_at_idx";

-- DropIndex
DROP INDEX "public"."jobs_run_id_created_at_idx";

-- DropIndex
DROP INDEX "public"."jobs_status_created_at_idx";

-- DropIndex
DROP INDEX "public"."jobs_type_created_at_idx";

-- DropIndex
DROP INDEX "public"."logs_created_at_idx";

-- DropIndex
DROP INDEX "public"."pipeline_runs_pipeline_id_created_at_idx";

-- DropIndex
DROP INDEX "public"."pipeline_runs_status_created_at_idx";

-- DropIndex
DROP INDEX "public"."pipelines_name_version_key";

-- AlterTable
ALTER TABLE "public"."github" DROP COLUMN "created_at",
DROP COLUMN "installation_id",
DROP COLUMN "updated_at",
ADD COLUMN     "github_id" TEXT NOT NULL,
ALTER COLUMN "access_token" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."pipeline_runs" ADD COLUMN     "idempotency_key" TEXT;

-- AlterTable
ALTER TABLE "public"."pipelines" ADD COLUMN     "normalized_spec" JSONB,
ADD COLUMN     "original_spec" TEXT,
ADD COLUMN     "spec_hash" VARCHAR(64);

-- AlterTable
ALTER TABLE "public"."refresh_tokens" ALTER COLUMN "expires_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "last_used_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "public"."users" ALTER COLUMN "password" DROP NOT NULL;

-- DropTable
DROP TABLE "public"."project_repositories";

-- CreateTable
CREATE TABLE "public"."outbox" (
    "id" BIGSERIAL NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outbox_published_at_idx" ON "public"."outbox"("published_at");

-- CreateIndex
CREATE INDEX "outbox_created_at_idx" ON "public"."outbox"("created_at");

-- CreateIndex
CREATE INDEX "environments_project_id_idx" ON "public"."environments"("project_id");

-- CreateIndex
CREATE INDEX "environments_created_at_idx" ON "public"."environments"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "github_github_id_key" ON "public"."github"("github_id");

-- CreateIndex
CREATE INDEX "job_errors_occurred_at_idx" ON "public"."job_errors"("occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "job_errors_job_id_dedupe_key_key" ON "public"."job_errors"("job_id", "dedupe_key");

-- CreateIndex
CREATE INDEX "job_status_events_job_id_at_idx" ON "public"."job_status_events"("job_id", "at");

-- CreateIndex
CREATE INDEX "jobs_run_id_created_at_idx" ON "public"."jobs"("run_id", "created_at");

-- CreateIndex
CREATE INDEX "jobs_status_created_at_idx" ON "public"."jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "jobs_type_created_at_idx" ON "public"."jobs"("type", "created_at");

-- CreateIndex
CREATE INDEX "jobs_created_at_idx" ON "public"."jobs"("created_at");

-- CreateIndex
CREATE INDEX "logs_created_at_idx" ON "public"."logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_runs_idempotency_key_key" ON "public"."pipeline_runs"("idempotency_key");

-- CreateIndex
CREATE INDEX "pipeline_runs_pipeline_id_created_at_idx" ON "public"."pipeline_runs"("pipeline_id", "created_at");

-- CreateIndex
CREATE INDEX "pipeline_runs_status_created_at_idx" ON "public"."pipeline_runs"("status", "created_at");

-- CreateIndex
CREATE INDEX "pipeline_runs_created_at_idx" ON "public"."pipeline_runs"("created_at");

-- CreateIndex
CREATE INDEX "pipelines_spec_hash_idx" ON "public"."pipelines"("spec_hash");

-- CreateIndex
CREATE INDEX "pipelines_created_at_idx" ON "public"."pipelines"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "pipelines_project_id_name_version_key" ON "public"."pipelines"("project_id", "name", "version");

-- CreateIndex
CREATE INDEX "projects_user_id_idx" ON "public"."projects"("user_id");

-- CreateIndex
CREATE INDEX "projects_created_at_idx" ON "public"."projects"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "projects_user_id_name_key" ON "public"."projects"("user_id", "name");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "public"."refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "public"."refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_created_at_idx" ON "public"."refresh_tokens"("created_at");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "public"."users"("created_at");
