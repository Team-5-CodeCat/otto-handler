/*
  Warnings:

  - The primary key for the `deployment_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `deployment_logs` table. All the data in the column will be lost.
  - The primary key for the `deployments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `deployments` table. All the data in the column will be lost.
  - The primary key for the `execution_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `execution_logs` table. All the data in the column will be lost.
  - The primary key for the `github_installations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `account` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `appId` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `appSlug` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `events` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `installationToken` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `permissions` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `privateKey` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `repositorySelection` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `suspendedAt` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `suspendedBy` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `targetId` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `targetType` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `tokenExpiresAt` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `webhookSecret` on the `github_installations` table. All the data in the column will be lost.
  - The primary key for the `node_executions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `node_executions` table. All the data in the column will be lost.
  - The primary key for the `pipeline_executions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `pipeline_executions` table. All the data in the column will be lost.
  - The primary key for the `pipeline_nodes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `pipeline_nodes` table. All the data in the column will be lost.
  - The primary key for the `pipeline_templates` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `pipeline_templates` table. All the data in the column will be lost.
  - The primary key for the `pipelines` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `pipelines` table. All the data in the column will be lost.
  - The primary key for the `project_secrets` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `project_secrets` table. All the data in the column will be lost.
  - The primary key for the `projects` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `codeBuildProjectName` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `defaultBranch` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `deploymentConfig` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `ecrRepositoryUri` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `sshPrivateKey` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `sshPublicKey` on the `projects` table. All the data in the column will be lost.
  - The primary key for the `sessions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `sessions` table. All the data in the column will be lost.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `webhooks` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[githubInstallationId]` on the table `github_installations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[awsBuildId]` on the table `pipeline_executions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pipelineId,clientNodeId]` on the table `pipeline_nodes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,githubRepoId]` on the table `projects` will be added. If there are existing duplicate values, this will fail.
  - The required column `logId` was added to the `deployment_logs` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `deploymentId` was added to the `deployments` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `logId` was added to the `execution_logs` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `accountLogin` to the `github_installations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `accountType` to the `github_installations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `githubInstallationId` to the `github_installations` table without a default value. This is not possible if the table is not empty.
  - The required column `nodeExecutionId` was added to the `node_executions` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `awsBuildId` to the `pipeline_executions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientNodeId` to the `pipeline_nodes` table without a default value. This is not possible if the table is not empty.
  - The required column `templateId` was added to the `pipeline_templates` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `pipelineId` was added to the `pipelines` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `secretId` was added to the `project_secrets` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `projectId` was added to the `projects` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `sessionId` was added to the `sessions` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `userId` was added to the `users` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropForeignKey
ALTER TABLE "public"."_SharedTemplates" DROP CONSTRAINT "_SharedTemplates_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_SharedTemplates" DROP CONSTRAINT "_SharedTemplates_B_fkey";

-- DropForeignKey
ALTER TABLE "public"."deployment_logs" DROP CONSTRAINT "deployment_logs_deploymentId_fkey";

-- DropForeignKey
ALTER TABLE "public"."deployments" DROP CONSTRAINT "deployments_executionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."execution_logs" DROP CONSTRAINT "execution_logs_executionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."github_installations" DROP CONSTRAINT "github_installations_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."node_executions" DROP CONSTRAINT "node_executions_executionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."node_executions" DROP CONSTRAINT "node_executions_nodeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."pipeline_executions" DROP CONSTRAINT "pipeline_executions_pipelineId_fkey";

-- DropForeignKey
ALTER TABLE "public"."pipeline_nodes" DROP CONSTRAINT "pipeline_nodes_pipelineId_fkey";

-- DropForeignKey
ALTER TABLE "public"."pipeline_templates" DROP CONSTRAINT "pipeline_templates_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."pipelines" DROP CONSTRAINT "pipelines_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."pipelines" DROP CONSTRAINT "pipelines_templateId_fkey";

-- DropForeignKey
ALTER TABLE "public"."project_secrets" DROP CONSTRAINT "project_secrets_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."projects" DROP CONSTRAINT "projects_installationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."projects" DROP CONSTRAINT "projects_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."sessions" DROP CONSTRAINT "sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."webhooks" DROP CONSTRAINT "webhooks_projectId_fkey";

-- DropIndex
DROP INDEX "public"."github_installations_installationId_idx";

-- DropIndex
DROP INDEX "public"."github_installations_installationId_key";

-- DropIndex
DROP INDEX "public"."pipeline_executions_executionId_idx";

-- DropIndex
DROP INDEX "public"."pipeline_executions_executionId_key";

-- DropIndex
DROP INDEX "public"."pipeline_nodes_pipelineId_nodeId_key";

-- AlterTable
ALTER TABLE "public"."deployment_logs" DROP CONSTRAINT "deployment_logs_pkey",
DROP COLUMN "id",
ADD COLUMN     "logId" TEXT NOT NULL,
ADD CONSTRAINT "deployment_logs_pkey" PRIMARY KEY ("logId");

-- AlterTable
ALTER TABLE "public"."deployments" DROP CONSTRAINT "deployments_pkey",
DROP COLUMN "id",
ADD COLUMN     "deploymentId" TEXT NOT NULL,
ADD CONSTRAINT "deployments_pkey" PRIMARY KEY ("deploymentId");

-- AlterTable
ALTER TABLE "public"."execution_logs" DROP CONSTRAINT "execution_logs_pkey",
DROP COLUMN "id",
ADD COLUMN     "logId" TEXT NOT NULL,
ADD CONSTRAINT "execution_logs_pkey" PRIMARY KEY ("logId");

-- AlterTable
ALTER TABLE "public"."github_installations" DROP CONSTRAINT "github_installations_pkey",
DROP COLUMN "account",
DROP COLUMN "appId",
DROP COLUMN "appSlug",
DROP COLUMN "events",
DROP COLUMN "id",
DROP COLUMN "installationToken",
DROP COLUMN "permissions",
DROP COLUMN "privateKey",
DROP COLUMN "repositorySelection",
DROP COLUMN "suspendedAt",
DROP COLUMN "suspendedBy",
DROP COLUMN "targetId",
DROP COLUMN "targetType",
DROP COLUMN "tokenExpiresAt",
DROP COLUMN "webhookSecret",
ADD COLUMN     "accountLogin" TEXT NOT NULL,
ADD COLUMN     "accountType" TEXT NOT NULL,
ADD COLUMN     "githubInstallationId" TEXT NOT NULL,
ADD CONSTRAINT "github_installations_pkey" PRIMARY KEY ("installationId");

-- AlterTable
ALTER TABLE "public"."node_executions" DROP CONSTRAINT "node_executions_pkey",
DROP COLUMN "id",
ADD COLUMN     "nodeExecutionId" TEXT NOT NULL,
ADD CONSTRAINT "node_executions_pkey" PRIMARY KEY ("nodeExecutionId");

-- AlterTable
ALTER TABLE "public"."pipeline_executions" DROP CONSTRAINT "pipeline_executions_pkey",
DROP COLUMN "id",
ADD COLUMN     "awsBuildId" TEXT NOT NULL,
ADD CONSTRAINT "pipeline_executions_pkey" PRIMARY KEY ("executionId");

-- AlterTable
ALTER TABLE "public"."pipeline_nodes" DROP CONSTRAINT "pipeline_nodes_pkey",
DROP COLUMN "id",
ADD COLUMN     "clientNodeId" TEXT NOT NULL,
ADD CONSTRAINT "pipeline_nodes_pkey" PRIMARY KEY ("nodeId");

-- AlterTable
ALTER TABLE "public"."pipeline_templates" DROP CONSTRAINT "pipeline_templates_pkey",
DROP COLUMN "id",
ADD COLUMN     "templateId" TEXT NOT NULL,
ADD CONSTRAINT "pipeline_templates_pkey" PRIMARY KEY ("templateId");

-- AlterTable
ALTER TABLE "public"."pipelines" DROP CONSTRAINT "pipelines_pkey",
DROP COLUMN "id",
ADD COLUMN     "pipelineId" TEXT NOT NULL,
ADD CONSTRAINT "pipelines_pkey" PRIMARY KEY ("pipelineId");

-- AlterTable
ALTER TABLE "public"."project_secrets" DROP CONSTRAINT "project_secrets_pkey",
DROP COLUMN "id",
ADD COLUMN     "secretId" TEXT NOT NULL,
ADD CONSTRAINT "project_secrets_pkey" PRIMARY KEY ("secretId");

-- AlterTable
ALTER TABLE "public"."projects" DROP CONSTRAINT "projects_pkey",
DROP COLUMN "codeBuildProjectName",
DROP COLUMN "defaultBranch",
DROP COLUMN "deploymentConfig",
DROP COLUMN "ecrRepositoryUri",
DROP COLUMN "id",
DROP COLUMN "sshPrivateKey",
DROP COLUMN "sshPublicKey",
ADD COLUMN     "projectId" TEXT NOT NULL,
ADD COLUMN     "selectedBranch" TEXT NOT NULL DEFAULT 'main',
ALTER COLUMN "installationId" DROP NOT NULL,
ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("projectId");

-- AlterTable
ALTER TABLE "public"."sessions" DROP CONSTRAINT "sessions_pkey",
DROP COLUMN "id",
ADD COLUMN     "sessionId" TEXT NOT NULL,
ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("sessionId");

-- AlterTable
ALTER TABLE "public"."users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "id",
ADD COLUMN     "userId" TEXT NOT NULL,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("userId");

-- DropTable
DROP TABLE "public"."webhooks";

-- CreateTable
CREATE TABLE "public"."push_events" (
    "pushEventId" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "commitSha" TEXT NOT NULL,
    "commitMessage" TEXT,
    "pusherName" TEXT,
    "pushedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "push_events_pkey" PRIMARY KEY ("pushEventId")
);

-- CreateIndex
CREATE INDEX "push_events_projectId_pushedAt_idx" ON "public"."push_events"("projectId", "pushedAt");

-- CreateIndex
CREATE INDEX "push_events_branch_idx" ON "public"."push_events"("branch");

-- CreateIndex
CREATE UNIQUE INDEX "github_installations_githubInstallationId_key" ON "public"."github_installations"("githubInstallationId");

-- CreateIndex
CREATE INDEX "github_installations_githubInstallationId_idx" ON "public"."github_installations"("githubInstallationId");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_executions_awsBuildId_key" ON "public"."pipeline_executions"("awsBuildId");

-- CreateIndex
CREATE INDEX "pipeline_executions_awsBuildId_idx" ON "public"."pipeline_executions"("awsBuildId");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_nodes_pipelineId_clientNodeId_key" ON "public"."pipeline_nodes"("pipelineId", "clientNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "projects_userId_githubRepoId_key" ON "public"."projects"("userId", "githubRepoId");

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."github_installations" ADD CONSTRAINT "github_installations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_installationId_fkey" FOREIGN KEY ("installationId") REFERENCES "public"."github_installations"("installationId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_secrets" ADD CONSTRAINT "project_secrets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pipelines" ADD CONSTRAINT "pipelines_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pipelines" ADD CONSTRAINT "pipelines_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."pipeline_templates"("templateId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pipeline_templates" ADD CONSTRAINT "pipeline_templates_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "public"."users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pipeline_nodes" ADD CONSTRAINT "pipeline_nodes_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "public"."pipelines"("pipelineId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pipeline_executions" ADD CONSTRAINT "pipeline_executions_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "public"."pipelines"("pipelineId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."node_executions" ADD CONSTRAINT "node_executions_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "public"."pipeline_executions"("executionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."node_executions" ADD CONSTRAINT "node_executions_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "public"."pipeline_nodes"("nodeId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deployments" ADD CONSTRAINT "deployments_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "public"."pipeline_executions"("executionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."execution_logs" ADD CONSTRAINT "execution_logs_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "public"."pipeline_executions"("executionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deployment_logs" ADD CONSTRAINT "deployment_logs_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "public"."deployments"("deploymentId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."push_events" ADD CONSTRAINT "push_events_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("projectId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SharedTemplates" ADD CONSTRAINT "_SharedTemplates_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."pipeline_templates"("templateId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SharedTemplates" ADD CONSTRAINT "_SharedTemplates_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
