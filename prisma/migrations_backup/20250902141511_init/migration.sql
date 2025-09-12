/*
  Warnings:

  - The values [DOCKER] on the enum `DeployEnvironment` will be removed. If these variants are still used in the database, this will fail.
  - The values [JAVA] on the enum `Language` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `environments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `github` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `build_id` on the `logs` table. All the data in the column will be lost.
  - You are about to drop the column `deployment_id` on the `logs` table. All the data in the column will be lost.
  - You are about to drop the column `test_id` on the `logs` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `logs` table. All the data in the column will be lost.
  - The primary key for the `pipelines` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `config` on the `pipelines` table. All the data in the column will be lost.
  - The primary key for the `projects` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `builds` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `deployments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `refresh_tokens` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tests` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[job_id,attempt_no,stream]` on the table `logs` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,version]` on the table `pipelines` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `environment_id` on the `environments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `project_id` on the `environments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `github` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `attempt_no` to the `logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `job_id` to the `logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stream` to the `logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pipeline_spec` to the `pipelines` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `pipeline_id` on the `pipelines` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `project_id` on the `pipelines` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `project_id` on the `projects` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `projects` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `user_id` on the `users` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."JobType" AS ENUM ('BUILD', 'TEST', 'DEPLOYMENT');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."LogStream" AS ENUM ('stdout', 'stderr');

-- CreateEnum
CREATE TYPE "public"."TestType" AS ENUM ('UNIT', 'E2E');

-- AlterEnum
BEGIN;
CREATE TYPE "public"."DeployEnvironment_new" AS ENUM ('EC2');
ALTER TABLE "public"."environments" ALTER COLUMN "deploy_environment" TYPE "public"."DeployEnvironment_new" USING ("deploy_environment"::text::"public"."DeployEnvironment_new");
ALTER TYPE "public"."DeployEnvironment" RENAME TO "DeployEnvironment_old";
ALTER TYPE "public"."DeployEnvironment_new" RENAME TO "DeployEnvironment";
DROP TYPE "public"."DeployEnvironment_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "public"."Language_new" AS ENUM ('NODE', 'PYTHON');
ALTER TABLE "public"."environments" ALTER COLUMN "language" TYPE "public"."Language_new" USING ("language"::text::"public"."Language_new");
ALTER TYPE "public"."Language" RENAME TO "Language_old";
ALTER TYPE "public"."Language_new" RENAME TO "Language";
DROP TYPE "public"."Language_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."builds" DROP CONSTRAINT "builds_pipeline_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."deployments" DROP CONSTRAINT "deployments_pipeline_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."environments" DROP CONSTRAINT "environments_project_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."github" DROP CONSTRAINT "github_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."logs" DROP CONSTRAINT "logs_build_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."logs" DROP CONSTRAINT "logs_deployment_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."logs" DROP CONSTRAINT "logs_test_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."pipelines" DROP CONSTRAINT "pipelines_project_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."projects" DROP CONSTRAINT "projects_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."tests" DROP CONSTRAINT "tests_pipeline_id_fkey";

-- AlterTable
ALTER TABLE "public"."environments" DROP CONSTRAINT "environments_pkey",
ADD COLUMN     "deployment_path" TEXT,
ADD COLUMN     "deployment_target" TEXT,
ADD COLUMN     "service_port" INTEGER,
DROP COLUMN "environment_id",
ADD COLUMN     "environment_id" UUID NOT NULL,
DROP COLUMN "project_id",
ADD COLUMN     "project_id" UUID NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6),
ADD CONSTRAINT "environments_pkey" PRIMARY KEY ("environment_id");

-- AlterTable
ALTER TABLE "public"."github" DROP CONSTRAINT "github_pkey",
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "github_pkey" PRIMARY KEY ("user_id");

-- AlterTable
ALTER TABLE "public"."logs" DROP CONSTRAINT "logs_pkey",
DROP COLUMN "build_id",
DROP COLUMN "deployment_id",
DROP COLUMN "test_id",
DROP COLUMN "type",
ADD COLUMN     "attempt_no" INTEGER NOT NULL,
ADD COLUMN     "content_type" TEXT,
ADD COLUMN     "job_id" TEXT NOT NULL,
ADD COLUMN     "size_bytes" BIGINT,
ADD COLUMN     "storage_bucket" TEXT,
ADD COLUMN     "storage_key" TEXT,
ADD COLUMN     "stream" "public"."LogStream" NOT NULL,
ALTER COLUMN "log_id" DROP DEFAULT,
ALTER COLUMN "log_id" SET DATA TYPE TEXT,
ALTER COLUMN "content" DROP NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ADD CONSTRAINT "logs_pkey" PRIMARY KEY ("log_id");
DROP SEQUENCE "logs_log_id_seq";

-- AlterTable
ALTER TABLE "public"."pipelines" DROP CONSTRAINT "pipelines_pkey",
DROP COLUMN "config",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "owner" TEXT,
ADD COLUMN     "pipeline_spec" JSONB NOT NULL,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "pipeline_id",
ADD COLUMN     "pipeline_id" UUID NOT NULL,
DROP COLUMN "project_id",
ADD COLUMN     "project_id" UUID NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6),
ADD CONSTRAINT "pipelines_pkey" PRIMARY KEY ("pipeline_id");

-- AlterTable
ALTER TABLE "public"."projects" DROP CONSTRAINT "projects_pkey",
DROP COLUMN "project_id",
ADD COLUMN     "project_id" UUID NOT NULL,
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6),
ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("project_id");

-- AlterTable
ALTER TABLE "public"."users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "user_id",
ADD COLUMN     "user_id" UUID NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(6),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMPTZ(6),
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("user_id");

-- DropTable
DROP TABLE "public"."builds";

-- DropTable
DROP TABLE "public"."deployments";

-- DropTable
DROP TABLE "public"."refresh_tokens";

-- DropTable
DROP TABLE "public"."tests";

-- DropEnum
DROP TYPE "public"."LogType";

-- DropEnum
DROP TYPE "public"."RetryStatus";

-- CreateTable
CREATE TABLE "public"."pipeline_runs" (
    "id" UUID NOT NULL,
    "pipeline_id" UUID NOT NULL,
    "pipeline_version" INTEGER NOT NULL,
    "status" "public"."JobStatus" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queued_at" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "exit_code" INTEGER,
    "owner" TEXT,
    "agent" TEXT,
    "container_image" TEXT,
    "trigger" TEXT,
    "labels" JSONB,
    "metadata" JSONB,
    "external_run_key" TEXT,

    CONSTRAINT "pipeline_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."jobs" (
    "id" TEXT NOT NULL,
    "run_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."JobType" NOT NULL,
    "test_type" "public"."TestType",
    "status" "public"."JobStatus" NOT NULL,
    "attempt_current" INTEGER NOT NULL DEFAULT 0,
    "attempt_max" INTEGER NOT NULL DEFAULT 3,
    "exit_code" INTEGER,
    "env_variables" JSONB,
    "s3_artifact_url" TEXT,
    "target_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queued_at" TIMESTAMPTZ(6),
    "started_at" TIMESTAMPTZ(6),
    "finished_at" TIMESTAMPTZ(6),
    "owner" TEXT,
    "agent" TEXT,
    "container_image" TEXT,
    "command" TEXT,
    "inputs" JSONB,
    "outputs" JSONB,
    "external_job_key" TEXT,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."job_status_events" (
    "id" UUID NOT NULL,
    "job_id" TEXT NOT NULL,
    "from_status" "public"."JobStatus",
    "to_status" "public"."JobStatus" NOT NULL,
    "reason" TEXT,
    "data" JSONB,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."job_errors" (
    "id" UUID NOT NULL,
    "job_id" TEXT NOT NULL,
    "attempt_no" INTEGER NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error_type" TEXT,
    "message" VARCHAR(4096),
    "stacktrace" VARCHAR(8192),
    "context" JSONB,
    "dedupe_key" TEXT,

    CONSTRAINT "job_errors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_runs_external_run_key_key" ON "public"."pipeline_runs"("external_run_key");

-- CreateIndex
CREATE INDEX "pipeline_runs_pipeline_id_created_at_idx" ON "public"."pipeline_runs"("pipeline_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "pipeline_runs_status_created_at_idx" ON "public"."pipeline_runs"("status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "jobs_external_job_key_key" ON "public"."jobs"("external_job_key");

-- CreateIndex
CREATE INDEX "jobs_run_id_created_at_idx" ON "public"."jobs"("run_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "jobs_status_created_at_idx" ON "public"."jobs"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "jobs_type_created_at_idx" ON "public"."jobs"("type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "jobs_agent_idx" ON "public"."jobs"("agent");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_run_id_name_key" ON "public"."jobs"("run_id", "name");

-- CreateIndex
CREATE INDEX "job_status_events_job_id_at_idx" ON "public"."job_status_events"("job_id", "at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "job_errors_dedupe_key_key" ON "public"."job_errors"("dedupe_key");

-- CreateIndex
CREATE INDEX "job_errors_job_id_attempt_no_idx" ON "public"."job_errors"("job_id", "attempt_no");

-- CreateIndex
CREATE INDEX "job_errors_occurred_at_idx" ON "public"."job_errors"("occurred_at" DESC);

-- CreateIndex
CREATE INDEX "job_errors_error_type_idx" ON "public"."job_errors"("error_type");

-- CreateIndex
CREATE INDEX "logs_job_id_attempt_no_idx" ON "public"."logs"("job_id", "attempt_no");

-- CreateIndex
CREATE INDEX "logs_created_at_idx" ON "public"."logs"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "logs_job_id_attempt_no_stream_key" ON "public"."logs"("job_id", "attempt_no", "stream");

-- CreateIndex
CREATE INDEX "pipelines_owner_idx" ON "public"."pipelines"("owner");

-- CreateIndex
CREATE INDEX "pipelines_project_id_idx" ON "public"."pipelines"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "pipelines_name_version_key" ON "public"."pipelines"("name", "version");

-- AddForeignKey
ALTER TABLE "public"."github" ADD CONSTRAINT "github_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."environments" ADD CONSTRAINT "environments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pipelines" ADD CONSTRAINT "pipelines_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pipeline_runs" ADD CONSTRAINT "pipeline_runs_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("pipeline_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."jobs" ADD CONSTRAINT "jobs_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."pipeline_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_status_events" ADD CONSTRAINT "job_status_events_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."job_errors" ADD CONSTRAINT "job_errors_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."logs" ADD CONSTRAINT "logs_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
