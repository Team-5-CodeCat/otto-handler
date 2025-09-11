-- CreateEnum
CREATE TYPE "public"."TriggerType" AS ENUM ('MANUAL', 'WEBHOOK', 'SCHEDULE', 'API');

-- CreateEnum
CREATE TYPE "public"."NodeType" AS ENUM ('BUILD', 'TEST', 'DEPLOY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."ExecutionStatus" AS ENUM ('PENDING', 'QUEUED', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "public"."DeploymentStatus" AS ENUM ('PENDING', 'DEPLOYING', 'SUCCESS', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "public"."DeploymentStrategy" AS ENUM ('ROLLING', 'BLUE_GREEN', 'CANARY');

-- CreateEnum
CREATE TYPE "public"."LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "githubId" TEXT NOT NULL,
    "githubUsername" TEXT NOT NULL,
    "githubNodeId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "accessToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."github_installations" (
    "id" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "appSlug" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "account" JSONB NOT NULL,
    "permissions" JSONB NOT NULL,
    "events" TEXT[],
    "repositorySelection" TEXT NOT NULL DEFAULT 'selected',
    "installationToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "privateKey" TEXT NOT NULL,
    "webhookSecret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "suspendedAt" TIMESTAMP(3),
    "suspendedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "github_installations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "githubRepoUrl" TEXT NOT NULL,
    "githubRepoName" TEXT NOT NULL,
    "githubOwner" TEXT NOT NULL,
    "githubRepoId" TEXT NOT NULL,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "ecrRepositoryUri" TEXT,
    "codeBuildProjectName" TEXT,
    "sshPrivateKey" TEXT,
    "sshPublicKey" TEXT,
    "deploymentConfig" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_secrets" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isSecure" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "project_secrets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pipelines" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggerType" "public"."TriggerType" NOT NULL DEFAULT 'MANUAL',
    "triggerBranches" TEXT[],
    "pipelineYaml" TEXT,
    "visualConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,
    "templateId" TEXT,

    CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pipeline_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "tags" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "pipelineYaml" TEXT NOT NULL,
    "visualConfig" JSONB NOT NULL,
    "nodeConfig" JSONB NOT NULL,
    "dockerfile" TEXT,
    "dockerCompose" TEXT,
    "buildSpec" JSONB,
    "ecrImageUri" TEXT,
    "imageVersion" TEXT,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "pipeline_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pipeline_nodes" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."NodeType" NOT NULL,
    "order" INTEGER NOT NULL,
    "position" JSONB,
    "config" JSONB NOT NULL,
    "parentNodeIds" TEXT[],
    "childNodeIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pipelineId" TEXT NOT NULL,

    CONSTRAINT "pipeline_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pipeline_executions" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "status" "public"."ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "triggerType" "public"."TriggerType" NOT NULL,
    "branch" TEXT,
    "commitSha" TEXT,
    "commitMessage" TEXT,
    "pipelineYaml" TEXT NOT NULL,
    "dockerfile" TEXT,
    "dockerCompose" TEXT,
    "buildSpec" JSONB,
    "codeBuildArn" TEXT,
    "codeBuildLogGroupName" TEXT,
    "codeBuildLogStreamName" TEXT,
    "ecrImageUri" TEXT,
    "ecrImageTag" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pipelineId" TEXT NOT NULL,

    CONSTRAINT "pipeline_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."node_executions" (
    "id" TEXT NOT NULL,
    "status" "public"."ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "output" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "executionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,

    CONSTRAINT "node_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."deployments" (
    "id" TEXT NOT NULL,
    "status" "public"."DeploymentStatus" NOT NULL DEFAULT 'PENDING',
    "serverHost" TEXT NOT NULL,
    "serverPort" INTEGER NOT NULL DEFAULT 22,
    "deployPath" TEXT,
    "strategy" "public"."DeploymentStrategy" NOT NULL DEFAULT 'ROLLING',
    "dockerImageUri" TEXT NOT NULL,
    "containerName" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "executionId" TEXT NOT NULL,

    CONSTRAINT "deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."execution_logs" (
    "id" TEXT NOT NULL,
    "level" "public"."LogLevel" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "source" TEXT,
    "s3Bucket" TEXT,
    "s3Key" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "executionId" TEXT NOT NULL,

    CONSTRAINT "execution_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."deployment_logs" (
    "id" TEXT NOT NULL,
    "level" "public"."LogLevel" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "source" TEXT,
    "s3Bucket" TEXT,
    "s3Key" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deploymentId" TEXT NOT NULL,

    CONSTRAINT "deployment_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."webhooks" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."_SharedTemplates" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SharedTemplates_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_githubId_key" ON "public"."users"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "users_githubUsername_key" ON "public"."users"("githubUsername");

-- CreateIndex
CREATE INDEX "users_githubId_idx" ON "public"."users"("githubId");

-- CreateIndex
CREATE INDEX "users_githubUsername_idx" ON "public"."users"("githubUsername");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "public"."sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_sessionToken_idx" ON "public"."sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "public"."sessions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "github_installations_installationId_key" ON "public"."github_installations"("installationId");

-- CreateIndex
CREATE INDEX "github_installations_installationId_idx" ON "public"."github_installations"("installationId");

-- CreateIndex
CREATE INDEX "github_installations_userId_idx" ON "public"."github_installations"("userId");

-- CreateIndex
CREATE INDEX "projects_userId_idx" ON "public"."projects"("userId");

-- CreateIndex
CREATE INDEX "projects_installationId_idx" ON "public"."projects"("installationId");

-- CreateIndex
CREATE UNIQUE INDEX "projects_githubOwner_githubRepoName_key" ON "public"."projects"("githubOwner", "githubRepoName");

-- CreateIndex
CREATE UNIQUE INDEX "projects_githubRepoId_key" ON "public"."projects"("githubRepoId");

-- CreateIndex
CREATE UNIQUE INDEX "project_secrets_projectId_key_key" ON "public"."project_secrets"("projectId", "key");

-- CreateIndex
CREATE INDEX "pipelines_projectId_idx" ON "public"."pipelines"("projectId");

-- CreateIndex
CREATE INDEX "pipeline_templates_isPublic_category_idx" ON "public"."pipeline_templates"("isPublic", "category");

-- CreateIndex
CREATE INDEX "pipeline_nodes_pipelineId_order_idx" ON "public"."pipeline_nodes"("pipelineId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_nodes_pipelineId_nodeId_key" ON "public"."pipeline_nodes"("pipelineId", "nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_executions_executionId_key" ON "public"."pipeline_executions"("executionId");

-- CreateIndex
CREATE INDEX "pipeline_executions_pipelineId_status_idx" ON "public"."pipeline_executions"("pipelineId", "status");

-- CreateIndex
CREATE INDEX "pipeline_executions_executionId_idx" ON "public"."pipeline_executions"("executionId");

-- CreateIndex
CREATE INDEX "node_executions_executionId_idx" ON "public"."node_executions"("executionId");

-- CreateIndex
CREATE INDEX "deployments_executionId_idx" ON "public"."deployments"("executionId");

-- CreateIndex
CREATE INDEX "execution_logs_executionId_timestamp_idx" ON "public"."execution_logs"("executionId", "timestamp");

-- CreateIndex
CREATE INDEX "deployment_logs_deploymentId_timestamp_idx" ON "public"."deployment_logs"("deploymentId", "timestamp");

-- CreateIndex
CREATE INDEX "webhooks_projectId_processed_idx" ON "public"."webhooks"("projectId", "processed");

-- CreateIndex
CREATE INDEX "_SharedTemplates_B_index" ON "public"."_SharedTemplates"("B");

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."github_installations" ADD CONSTRAINT "github_installations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "public"."github_installations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_secrets" ADD CONSTRAINT "project_secrets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pipelines" ADD CONSTRAINT "pipelines_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pipelines" ADD CONSTRAINT "pipelines_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."pipeline_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pipeline_templates" ADD CONSTRAINT "pipeline_templates_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pipeline_nodes" ADD CONSTRAINT "pipeline_nodes_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "public"."pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pipeline_executions" ADD CONSTRAINT "pipeline_executions_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "public"."pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."node_executions" ADD CONSTRAINT "node_executions_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "public"."pipeline_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."node_executions" ADD CONSTRAINT "node_executions_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."pipeline_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deployments" ADD CONSTRAINT "deployments_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "public"."pipeline_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."execution_logs" ADD CONSTRAINT "execution_logs_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "public"."pipeline_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deployment_logs" ADD CONSTRAINT "deployment_logs_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "public"."deployments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."webhooks" ADD CONSTRAINT "webhooks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SharedTemplates" ADD CONSTRAINT "_SharedTemplates_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."pipeline_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SharedTemplates" ADD CONSTRAINT "_SharedTemplates_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
