/*
  Warnings:

  - You are about to drop the column `team_id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `teams` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `email` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `password` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."Language" AS ENUM ('NODE', 'PYTHON', 'JAVA');

-- CreateEnum
CREATE TYPE "public"."DeployEnvironment" AS ENUM ('EC2', 'DOCKER');

-- CreateEnum
CREATE TYPE "public"."RetryStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CIRCUIT_BREAKER');

-- CreateEnum
CREATE TYPE "public"."LogType" AS ENUM ('BUILD', 'TEST', 'DEPLOYMENT');

-- DropForeignKey
ALTER TABLE "public"."users" DROP CONSTRAINT "users_team_id_fkey";

-- AlterTable
ALTER TABLE "public"."github" ADD COLUMN     "access_token" TEXT;

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "team_id",
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "password" SET NOT NULL;

-- DropTable
DROP TABLE "public"."teams";

-- CreateTable
CREATE TABLE "public"."projects" (
    "project_id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "webhook_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "public"."environments" (
    "environment_id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "language" "public"."Language" NOT NULL,
    "deploy_environment" "public"."DeployEnvironment" NOT NULL,
    "env_variables" JSONB,
    "credentials" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "environments_pkey" PRIMARY KEY ("environment_id")
);

-- CreateTable
CREATE TABLE "public"."pipelines" (
    "pipeline_id" SERIAL NOT NULL,
    "project_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "is_block_based" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pipelines_pkey" PRIMARY KEY ("pipeline_id")
);

-- CreateTable
CREATE TABLE "public"."builds" (
    "build_id" SERIAL NOT NULL,
    "pipeline_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "retry_status" "public"."RetryStatus",
    "s3_artifact_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "builds_pkey" PRIMARY KEY ("build_id")
);

-- CreateTable
CREATE TABLE "public"."tests" (
    "test_id" SERIAL NOT NULL,
    "pipeline_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "retry_status" "public"."RetryStatus",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tests_pkey" PRIMARY KEY ("test_id")
);

-- CreateTable
CREATE TABLE "public"."deployments" (
    "deployment_id" SERIAL NOT NULL,
    "pipeline_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "retry_status" "public"."RetryStatus",
    "target_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("deployment_id")
);

-- CreateTable
CREATE TABLE "public"."logs" (
    "log_id" SERIAL NOT NULL,
    "type" "public"."LogType" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "build_id" INTEGER,
    "test_id" INTEGER,
    "deployment_id" INTEGER,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_webhook_url_key" ON "public"."projects"("webhook_url");

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."environments" ADD CONSTRAINT "environments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pipelines" ADD CONSTRAINT "pipelines_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."builds" ADD CONSTRAINT "builds_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("pipeline_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tests" ADD CONSTRAINT "tests_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("pipeline_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deployments" ADD CONSTRAINT "deployments_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("pipeline_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."logs" ADD CONSTRAINT "logs_build_id_fkey" FOREIGN KEY ("build_id") REFERENCES "public"."builds"("build_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."logs" ADD CONSTRAINT "logs_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("test_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."logs" ADD CONSTRAINT "logs_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "public"."deployments"("deployment_id") ON DELETE CASCADE ON UPDATE CASCADE;
