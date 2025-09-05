-- CreateEnum
CREATE TYPE "public"."MemberRole" AS ENUM ('ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "public"."Language" AS ENUM ('NODE', 'PYTHON');

-- CreateEnum
CREATE TYPE "public"."DeployEnvironment" AS ENUM ('EC2');

-- CreateEnum
CREATE TYPE "public"."JobType" AS ENUM ('BUILD', 'TEST', 'DEPLOYMENT');

-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."LogStream" AS ENUM ('stdout', 'stderr');

-- CreateEnum
CREATE TYPE "public"."TestType" AS ENUM ('UNIT', 'E2E');

-- CreateTable
CREATE TABLE "public"."users" (
    "user_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "name" TEXT NOT NULL,
    "member_role" "public"."MemberRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."refresh_tokens" (
    "token_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "last_used_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("token_id")
);

-- CreateTable
CREATE TABLE "public"."github_installations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "installation_id" TEXT NOT NULL,
    "account_login" TEXT,
    "account_id" BIGINT,
    "access_token" TEXT,
    "token_expires_at" TIMESTAMPTZ(6),
    "last_issued_at" TIMESTAMPTZ(6),
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "github_installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."projects" (
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "webhook_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("project_id")
);

-- CreateTable
CREATE TABLE "public"."project_repositories" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "repo_full_name" TEXT NOT NULL,
    "selected_branch" TEXT NOT NULL,
    "installation_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "project_repositories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."environments" (
    "environment_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "language" "public"."Language" NOT NULL,
    "deploy_environment" "public"."DeployEnvironment" NOT NULL,
    "env_variables" JSONB,
    "credentials" JSONB,
    "deployment_target" TEXT,
    "deployment_path" TEXT,
    "service_port" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "environments_pkey" PRIMARY KEY ("environment_id")
);

-- CreateTable
CREATE TABLE "public"."pipelines" (
    "pipeline_id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "owner" TEXT,
    "pipeline_spec" JSONB NOT NULL,
    "is_block_based" BOOLEAN NOT NULL DEFAULT false,
    "original_spec" TEXT,
    "normalized_spec" JSONB,
    "spec_hash" VARCHAR(64),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pipelines_pkey" PRIMARY KEY ("pipeline_id")
);

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
    "idempotency_key" TEXT,

    CONSTRAINT "pipeline_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."jobs" (
    "id" UUID NOT NULL,
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
    "job_id" UUID NOT NULL,
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
    "job_id" UUID NOT NULL,
    "attempt_no" INTEGER NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error_type" TEXT,
    "message" VARCHAR(4096),
    "stacktrace" VARCHAR(8192),
    "context" JSONB,
    "dedupe_key" TEXT,

    CONSTRAINT "job_errors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."logs" (
    "log_id" UUID NOT NULL,
    "job_id" UUID NOT NULL,
    "attempt_no" INTEGER NOT NULL,
    "stream" "public"."LogStream" NOT NULL,
    "content" TEXT,
    "storage_bucket" TEXT,
    "storage_key" TEXT,
    "size_bytes" BIGINT,
    "content_type" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("log_id")
);

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
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "public"."users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "public"."refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "public"."refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_expires_at_idx" ON "public"."refresh_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "refresh_tokens_created_at_idx" ON "public"."refresh_tokens"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "github_installations_installation_id_key" ON "public"."github_installations"("installation_id");

-- CreateIndex
CREATE INDEX "github_installations_user_id_idx" ON "public"."github_installations"("user_id");

-- CreateIndex
CREATE INDEX "github_installations_account_login_idx" ON "public"."github_installations"("account_login");

-- CreateIndex
CREATE INDEX "github_installations_account_id_idx" ON "public"."github_installations"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_webhook_url_key" ON "public"."projects"("webhook_url");

-- CreateIndex
CREATE INDEX "projects_user_id_idx" ON "public"."projects"("user_id");

-- CreateIndex
CREATE INDEX "projects_created_at_idx" ON "public"."projects"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "projects_user_id_name_key" ON "public"."projects"("user_id", "name");

-- CreateIndex
CREATE INDEX "project_repositories_project_id_idx" ON "public"."project_repositories"("project_id");

-- CreateIndex
CREATE INDEX "project_repositories_installation_id_idx" ON "public"."project_repositories"("installation_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_repositories_project_id_repo_full_name_key" ON "public"."project_repositories"("project_id", "repo_full_name");

-- CreateIndex
CREATE INDEX "environments_project_id_idx" ON "public"."environments"("project_id");

-- CreateIndex
CREATE INDEX "environments_created_at_idx" ON "public"."environments"("created_at");

-- CreateIndex
CREATE INDEX "pipelines_owner_idx" ON "public"."pipelines"("owner");

-- CreateIndex
CREATE INDEX "pipelines_project_id_idx" ON "public"."pipelines"("project_id");

-- CreateIndex
CREATE INDEX "pipelines_created_at_idx" ON "public"."pipelines"("created_at");

-- CreateIndex
CREATE INDEX "pipelines_spec_hash_idx" ON "public"."pipelines"("spec_hash");

-- CreateIndex
CREATE UNIQUE INDEX "pipelines_project_id_name_version_key" ON "public"."pipelines"("project_id", "name", "version");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_runs_external_run_key_key" ON "public"."pipeline_runs"("external_run_key");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_runs_idempotency_key_key" ON "public"."pipeline_runs"("idempotency_key");

-- CreateIndex
CREATE INDEX "pipeline_runs_pipeline_id_created_at_idx" ON "public"."pipeline_runs"("pipeline_id", "created_at");

-- CreateIndex
CREATE INDEX "pipeline_runs_status_created_at_idx" ON "public"."pipeline_runs"("status", "created_at");

-- CreateIndex
CREATE INDEX "pipeline_runs_created_at_idx" ON "public"."pipeline_runs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_external_job_key_key" ON "public"."jobs"("external_job_key");

-- CreateIndex
CREATE INDEX "jobs_run_id_created_at_idx" ON "public"."jobs"("run_id", "created_at");

-- CreateIndex
CREATE INDEX "jobs_status_created_at_idx" ON "public"."jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "jobs_type_created_at_idx" ON "public"."jobs"("type", "created_at");

-- CreateIndex
CREATE INDEX "jobs_agent_idx" ON "public"."jobs"("agent");

-- CreateIndex
CREATE INDEX "jobs_created_at_idx" ON "public"."jobs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_run_id_name_key" ON "public"."jobs"("run_id", "name");

-- CreateIndex
CREATE INDEX "job_status_events_job_id_at_idx" ON "public"."job_status_events"("job_id", "at");

-- CreateIndex
CREATE INDEX "job_errors_job_id_attempt_no_idx" ON "public"."job_errors"("job_id", "attempt_no");

-- CreateIndex
CREATE INDEX "job_errors_occurred_at_idx" ON "public"."job_errors"("occurred_at");

-- CreateIndex
CREATE INDEX "job_errors_error_type_idx" ON "public"."job_errors"("error_type");

-- CreateIndex
CREATE UNIQUE INDEX "job_errors_job_id_dedupe_key_key" ON "public"."job_errors"("job_id", "dedupe_key");

-- CreateIndex
CREATE INDEX "logs_job_id_attempt_no_idx" ON "public"."logs"("job_id", "attempt_no");

-- CreateIndex
CREATE INDEX "logs_created_at_idx" ON "public"."logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "logs_job_id_attempt_no_stream_key" ON "public"."logs"("job_id", "attempt_no", "stream");

-- CreateIndex
CREATE INDEX "outbox_created_at_idx" ON "public"."outbox"("created_at");

-- CreateIndex
CREATE INDEX "outbox_published_at_idx" ON "public"."outbox"("published_at");

-- AddForeignKey
ALTER TABLE "public"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."github_installations" ADD CONSTRAINT "github_installations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_repositories" ADD CONSTRAINT "project_repositories_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

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
