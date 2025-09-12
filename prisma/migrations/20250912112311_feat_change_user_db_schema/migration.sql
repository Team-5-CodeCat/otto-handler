/*
  Warnings:

  - The primary key for the `_SharedTemplates` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `deployment_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `deploymentId` on the `deployment_logs` table. All the data in the column will be lost.
  - You are about to drop the column `logId` on the `deployment_logs` table. All the data in the column will be lost.
  - You are about to drop the column `s3Bucket` on the `deployment_logs` table. All the data in the column will be lost.
  - You are about to drop the column `s3Key` on the `deployment_logs` table. All the data in the column will be lost.
  - The primary key for the `deployments` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `completedAt` on the `deployments` table. All the data in the column will be lost.
  - You are about to drop the column `containerName` on the `deployments` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `deployments` table. All the data in the column will be lost.
  - You are about to drop the column `deployPath` on the `deployments` table. All the data in the column will be lost.
  - You are about to drop the column `deploymentId` on the `deployments` table. All the data in the column will be lost.
  - You are about to drop the column `dockerImageUri` on the `deployments` table. All the data in the column will be lost.
  - You are about to drop the column `executionId` on the `deployments` table. All the data in the column will be lost.
  - You are about to drop the column `serverHost` on the `deployments` table. All the data in the column will be lost.
  - You are about to drop the column `serverPort` on the `deployments` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `deployments` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `deployments` table. All the data in the column will be lost.
  - The primary key for the `execution_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `executionId` on the `execution_logs` table. All the data in the column will be lost.
  - You are about to drop the column `logId` on the `execution_logs` table. All the data in the column will be lost.
  - You are about to drop the column `s3Bucket` on the `execution_logs` table. All the data in the column will be lost.
  - You are about to drop the column `s3Key` on the `execution_logs` table. All the data in the column will be lost.
  - The primary key for the `github_installations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `accountId` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `accountLogin` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `accountType` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `githubInstallationId` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `installationId` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `github_installations` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `github_installations` table. All the data in the column will be lost.
  - The primary key for the `node_executions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `completedAt` on the `node_executions` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `node_executions` table. All the data in the column will be lost.
  - You are about to drop the column `executionId` on the `node_executions` table. All the data in the column will be lost.
  - You are about to drop the column `nodeExecutionId` on the `node_executions` table. All the data in the column will be lost.
  - You are about to drop the column `nodeId` on the `node_executions` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `node_executions` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `node_executions` table. All the data in the column will be lost.
  - The primary key for the `pipeline_executions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `awsBuildId` on the `pipeline_executions` table. All the data in the column will be lost.
  - You are about to drop the column `buildSpec` on the `pipeline_executions` table. All the data in the column will be lost.
  - You are about to drop the column `codeBuildArn` on the `pipeline_executions` table. All the data in the column will be lost.
  - You are about to drop the column `codeBuildLogGroupName` on the `pipeline_executions` table. All the data in the column will be lost.
  - You are about to drop the column `codeBuildLogStreamName` on the `pipeline_executions` table. All the data in the column will be lost.
  - You are about to drop the column `commitMessage` on the `pipeline_executions` table. All the data in the column will be lost.
  - You are about to drop the column `commitSha` on the `pipeline_executions` table. All the data in the column will be lost.
  - You are about to drop the column `completedAt` on the `pipeline_executions` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `pipeline_executions` table. All the data in the column will be lost.
  - You are about to drop the column `dockerCompose` on the `pipeline_executions` table. All the data in the column will be lost.
  - You are about to drop the column `ecrImageTag` on the `pipeline_executions` table. All the data in the column will be lost.
  - You are about to drop the column `ecrImageUri` on the `pipeline_executions` table. All the data in the column will be lost.
  - You are about to drop the column `executionId` on the `pipeline_executions` table. All the data in the column will be lost.
  - You are about to drop the column `pipelineId` on the `pipeline_executions` table. All the data in the column will be lost.
  - You are about to drop the column `pipelineYaml` on the `pipeline_executions` table. All the data in the column will be lost.
  - You are about to drop the column `startedAt` on the `pipeline_executions` table. All the data in the column will be lost.
  - You are about to drop the column `triggerType` on the `pipeline_executions` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `pipeline_executions` table. All the data in the column will be lost.
  - The primary key for the `pipeline_nodes` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `childNodeIds` on the `pipeline_nodes` table. All the data in the column will be lost.
  - You are about to drop the column `clientNodeId` on the `pipeline_nodes` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `pipeline_nodes` table. All the data in the column will be lost.
  - You are about to drop the column `nodeId` on the `pipeline_nodes` table. All the data in the column will be lost.
  - You are about to drop the column `parentNodeIds` on the `pipeline_nodes` table. All the data in the column will be lost.
  - You are about to drop the column `pipelineId` on the `pipeline_nodes` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `pipeline_nodes` table. All the data in the column will be lost.
  - The primary key for the `pipeline_templates` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `buildSpec` on the `pipeline_templates` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `pipeline_templates` table. All the data in the column will be lost.
  - You are about to drop the column `creatorId` on the `pipeline_templates` table. All the data in the column will be lost.
  - You are about to drop the column `dockerCompose` on the `pipeline_templates` table. All the data in the column will be lost.
  - You are about to drop the column `ecrImageUri` on the `pipeline_templates` table. All the data in the column will be lost.
  - You are about to drop the column `imageVersion` on the `pipeline_templates` table. All the data in the column will be lost.
  - You are about to drop the column `isOfficial` on the `pipeline_templates` table. All the data in the column will be lost.
  - You are about to drop the column `isPublic` on the `pipeline_templates` table. All the data in the column will be lost.
  - You are about to drop the column `nodeConfig` on the `pipeline_templates` table. All the data in the column will be lost.
  - You are about to drop the column `pipelineYaml` on the `pipeline_templates` table. All the data in the column will be lost.
  - You are about to drop the column `templateId` on the `pipeline_templates` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `pipeline_templates` table. All the data in the column will be lost.
  - You are about to drop the column `usageCount` on the `pipeline_templates` table. All the data in the column will be lost.
  - You are about to drop the column `visualConfig` on the `pipeline_templates` table. All the data in the column will be lost.
  - The primary key for the `pipelines` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `pipelines` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `pipelines` table. All the data in the column will be lost.
  - You are about to drop the column `pipelineId` on the `pipelines` table. All the data in the column will be lost.
  - You are about to drop the column `pipelineYaml` on the `pipelines` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `pipelines` table. All the data in the column will be lost.
  - You are about to drop the column `templateId` on the `pipelines` table. All the data in the column will be lost.
  - You are about to drop the column `triggerBranches` on the `pipelines` table. All the data in the column will be lost.
  - You are about to drop the column `triggerType` on the `pipelines` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `pipelines` table. All the data in the column will be lost.
  - You are about to drop the column `visualConfig` on the `pipelines` table. All the data in the column will be lost.
  - The primary key for the `project_secrets` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `project_secrets` table. All the data in the column will be lost.
  - You are about to drop the column `isSecure` on the `project_secrets` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `project_secrets` table. All the data in the column will be lost.
  - You are about to drop the column `secretId` on the `project_secrets` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `project_secrets` table. All the data in the column will be lost.
  - The primary key for the `projects` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `createdAt` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `githubOwner` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `githubRepoId` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `githubRepoName` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `githubRepoUrl` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `installationId` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `isPrivate` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `selectedBranch` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `projects` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `projects` table. All the data in the column will be lost.
  - The primary key for the `push_events` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `commitMessage` on the `push_events` table. All the data in the column will be lost.
  - You are about to drop the column `commitSha` on the `push_events` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `push_events` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `push_events` table. All the data in the column will be lost.
  - You are about to drop the column `pushEventId` on the `push_events` table. All the data in the column will be lost.
  - You are about to drop the column `pushedAt` on the `push_events` table. All the data in the column will be lost.
  - You are about to drop the column `pusherName` on the `push_events` table. All the data in the column will be lost.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `avatarUrl` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `githubId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `githubNodeId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `githubUsername` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isActive` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lastLoginAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `sessions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[github_installation_id]` on the table `github_installations` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[aws_build_id]` on the table `pipeline_executions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[pipeline_id,client_node_id]` on the table `pipeline_nodes` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[project_id,key]` on the table `project_secrets` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[github_repo_id]` on the table `projects` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[github_owner,github_repo_name]` on the table `projects` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[user_id,github_repo_id]` on the table `projects` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[github_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `B` on the `_SharedTemplates` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `deployment_id` to the `deployment_logs` table without a default value. This is not possible if the table is not empty.
  - The required column `log_id` was added to the `deployment_logs` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - The required column `deployment_id` was added to the `deployments` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `docker_image_uri` to the `deployments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `execution_id` to the `deployments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `server_host` to the `deployments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `deployments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `execution_id` to the `execution_logs` table without a default value. This is not possible if the table is not empty.
  - The required column `log_id` was added to the `execution_logs` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `account_id` to the `github_installations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `account_login` to the `github_installations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `account_type` to the `github_installations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `github_installation_id` to the `github_installations` table without a default value. This is not possible if the table is not empty.
  - The required column `installation_id` was added to the `github_installations` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `updated_at` to the `github_installations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `github_installations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `execution_id` to the `node_executions` table without a default value. This is not possible if the table is not empty.
  - The required column `node_execution_id` was added to the `node_executions` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `node_id` to the `node_executions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `node_executions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `aws_build_id` to the `pipeline_executions` table without a default value. This is not possible if the table is not empty.
  - The required column `execution_id` was added to the `pipeline_executions` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `pipeline_id` to the `pipeline_executions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pipeline_yaml` to the `pipeline_executions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trigger_type` to the `pipeline_executions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `pipeline_executions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `client_node_id` to the `pipeline_nodes` table without a default value. This is not possible if the table is not empty.
  - The required column `node_id` was added to the `pipeline_nodes` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `pipeline_id` to the `pipeline_nodes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `pipeline_nodes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creator_id` to the `pipeline_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `node_config` to the `pipeline_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pipeline_yaml` to the `pipeline_templates` table without a default value. This is not possible if the table is not empty.
  - The required column `template_id` was added to the `pipeline_templates` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `updated_at` to the `pipeline_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `visual_config` to the `pipeline_templates` table without a default value. This is not possible if the table is not empty.
  - The required column `pipeline_id` was added to the `pipelines` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `project_id` to the `pipelines` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `pipelines` table without a default value. This is not possible if the table is not empty.
  - Added the required column `project_id` to the `project_secrets` table without a default value. This is not possible if the table is not empty.
  - The required column `secret_id` was added to the `project_secrets` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `updated_at` to the `project_secrets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `github_owner` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `github_repo_id` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `github_repo_name` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `github_repo_url` to the `projects` table without a default value. This is not possible if the table is not empty.
  - The required column `project_id` was added to the `projects` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `updated_at` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `projects` table without a default value. This is not possible if the table is not empty.
  - Added the required column `commit_sha` to the `push_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `project_id` to the `push_events` table without a default value. This is not possible if the table is not empty.
  - The required column `push_event_id` was added to the `push_events` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `pushed_at` to the `push_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `github_id` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.
  - The required column `user_id` was added to the `users` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

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
ALTER TABLE "public"."push_events" DROP CONSTRAINT "push_events_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."sessions" DROP CONSTRAINT "sessions_userId_fkey";

-- DropIndex
DROP INDEX "public"."deployment_logs_deploymentId_timestamp_idx";

-- DropIndex
DROP INDEX "public"."deployments_executionId_idx";

-- DropIndex
DROP INDEX "public"."execution_logs_executionId_timestamp_idx";

-- DropIndex
DROP INDEX "public"."github_installations_githubInstallationId_idx";

-- DropIndex
DROP INDEX "public"."github_installations_githubInstallationId_key";

-- DropIndex
DROP INDEX "public"."github_installations_userId_idx";

-- DropIndex
DROP INDEX "public"."node_executions_executionId_idx";

-- DropIndex
DROP INDEX "public"."pipeline_executions_awsBuildId_idx";

-- DropIndex
DROP INDEX "public"."pipeline_executions_awsBuildId_key";

-- DropIndex
DROP INDEX "public"."pipeline_executions_pipelineId_status_idx";

-- DropIndex
DROP INDEX "public"."pipeline_nodes_pipelineId_clientNodeId_key";

-- DropIndex
DROP INDEX "public"."pipeline_nodes_pipelineId_order_idx";

-- DropIndex
DROP INDEX "public"."pipeline_templates_isPublic_category_idx";

-- DropIndex
DROP INDEX "public"."pipelines_projectId_idx";

-- DropIndex
DROP INDEX "public"."project_secrets_projectId_key_key";

-- DropIndex
DROP INDEX "public"."projects_githubOwner_githubRepoName_key";

-- DropIndex
DROP INDEX "public"."projects_githubRepoId_key";

-- DropIndex
DROP INDEX "public"."projects_installationId_idx";

-- DropIndex
DROP INDEX "public"."projects_userId_githubRepoId_key";

-- DropIndex
DROP INDEX "public"."projects_userId_idx";

-- DropIndex
DROP INDEX "public"."push_events_projectId_pushedAt_idx";

-- DropIndex
DROP INDEX "public"."users_email_key";

-- DropIndex
DROP INDEX "public"."users_githubId_idx";

-- DropIndex
DROP INDEX "public"."users_githubId_key";

-- DropIndex
DROP INDEX "public"."users_githubUsername_idx";

-- DropIndex
DROP INDEX "public"."users_githubUsername_key";

-- AlterTable
ALTER TABLE "public"."_SharedTemplates" DROP CONSTRAINT "_SharedTemplates_AB_pkey",
DROP COLUMN "B",
ADD COLUMN     "B" UUID NOT NULL,
ADD CONSTRAINT "_SharedTemplates_AB_pkey" PRIMARY KEY ("A", "B");

-- AlterTable
ALTER TABLE "public"."deployment_logs" DROP CONSTRAINT "deployment_logs_pkey",
DROP COLUMN "deploymentId",
DROP COLUMN "logId",
DROP COLUMN "s3Bucket",
DROP COLUMN "s3Key",
ADD COLUMN     "deployment_id" TEXT NOT NULL,
ADD COLUMN     "log_id" TEXT NOT NULL,
ADD COLUMN     "s3_bucket" TEXT,
ADD COLUMN     "s3_key" TEXT,
ADD CONSTRAINT "deployment_logs_pkey" PRIMARY KEY ("log_id");

-- AlterTable
ALTER TABLE "public"."deployments" DROP CONSTRAINT "deployments_pkey",
DROP COLUMN "completedAt",
DROP COLUMN "containerName",
DROP COLUMN "createdAt",
DROP COLUMN "deployPath",
DROP COLUMN "deploymentId",
DROP COLUMN "dockerImageUri",
DROP COLUMN "executionId",
DROP COLUMN "serverHost",
DROP COLUMN "serverPort",
DROP COLUMN "startedAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "container_name" TEXT,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deploy_path" TEXT,
ADD COLUMN     "deployment_id" TEXT NOT NULL,
ADD COLUMN     "docker_image_uri" TEXT NOT NULL,
ADD COLUMN     "execution_id" TEXT NOT NULL,
ADD COLUMN     "server_host" TEXT NOT NULL,
ADD COLUMN     "server_port" INTEGER NOT NULL DEFAULT 22,
ADD COLUMN     "started_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "deployments_pkey" PRIMARY KEY ("deployment_id");

-- AlterTable
ALTER TABLE "public"."execution_logs" DROP CONSTRAINT "execution_logs_pkey",
DROP COLUMN "executionId",
DROP COLUMN "logId",
DROP COLUMN "s3Bucket",
DROP COLUMN "s3Key",
ADD COLUMN     "execution_id" TEXT NOT NULL,
ADD COLUMN     "log_id" TEXT NOT NULL,
ADD COLUMN     "s3_bucket" TEXT,
ADD COLUMN     "s3_key" TEXT,
ADD CONSTRAINT "execution_logs_pkey" PRIMARY KEY ("log_id");

-- AlterTable
ALTER TABLE "public"."github_installations" DROP CONSTRAINT "github_installations_pkey",
DROP COLUMN "accountId",
DROP COLUMN "accountLogin",
DROP COLUMN "accountType",
DROP COLUMN "createdAt",
DROP COLUMN "githubInstallationId",
DROP COLUMN "installationId",
DROP COLUMN "isActive",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "account_id" TEXT NOT NULL,
ADD COLUMN     "account_login" TEXT NOT NULL,
ADD COLUMN     "account_type" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "github_installation_id" TEXT NOT NULL,
ADD COLUMN     "installation_id" TEXT NOT NULL,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "github_installations_pkey" PRIMARY KEY ("installation_id");

-- AlterTable
ALTER TABLE "public"."node_executions" DROP CONSTRAINT "node_executions_pkey",
DROP COLUMN "completedAt",
DROP COLUMN "createdAt",
DROP COLUMN "executionId",
DROP COLUMN "nodeExecutionId",
DROP COLUMN "nodeId",
DROP COLUMN "startedAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "execution_id" TEXT NOT NULL,
ADD COLUMN     "node_execution_id" TEXT NOT NULL,
ADD COLUMN     "node_id" TEXT NOT NULL,
ADD COLUMN     "started_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "node_executions_pkey" PRIMARY KEY ("node_execution_id");

-- AlterTable
ALTER TABLE "public"."pipeline_executions" DROP CONSTRAINT "pipeline_executions_pkey",
DROP COLUMN "awsBuildId",
DROP COLUMN "buildSpec",
DROP COLUMN "codeBuildArn",
DROP COLUMN "codeBuildLogGroupName",
DROP COLUMN "codeBuildLogStreamName",
DROP COLUMN "commitMessage",
DROP COLUMN "commitSha",
DROP COLUMN "completedAt",
DROP COLUMN "createdAt",
DROP COLUMN "dockerCompose",
DROP COLUMN "ecrImageTag",
DROP COLUMN "ecrImageUri",
DROP COLUMN "executionId",
DROP COLUMN "pipelineId",
DROP COLUMN "pipelineYaml",
DROP COLUMN "startedAt",
DROP COLUMN "triggerType",
DROP COLUMN "updatedAt",
ADD COLUMN     "aws_build_id" TEXT NOT NULL,
ADD COLUMN     "build_spec" JSONB,
ADD COLUMN     "code_build_arn" TEXT,
ADD COLUMN     "code_build_log_group_name" TEXT,
ADD COLUMN     "code_build_log_stream_name" TEXT,
ADD COLUMN     "commit_message" TEXT,
ADD COLUMN     "commit_sha" TEXT,
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "docker_compose" TEXT,
ADD COLUMN     "ecr_image_tag" TEXT,
ADD COLUMN     "ecr_image_uri" TEXT,
ADD COLUMN     "execution_id" TEXT NOT NULL,
ADD COLUMN     "pipeline_id" TEXT NOT NULL,
ADD COLUMN     "pipeline_yaml" TEXT NOT NULL,
ADD COLUMN     "started_at" TIMESTAMP(3),
ADD COLUMN     "trigger_type" "public"."TriggerType" NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "pipeline_executions_pkey" PRIMARY KEY ("execution_id");

-- AlterTable
ALTER TABLE "public"."pipeline_nodes" DROP CONSTRAINT "pipeline_nodes_pkey",
DROP COLUMN "childNodeIds",
DROP COLUMN "clientNodeId",
DROP COLUMN "createdAt",
DROP COLUMN "nodeId",
DROP COLUMN "parentNodeIds",
DROP COLUMN "pipelineId",
DROP COLUMN "updatedAt",
ADD COLUMN     "child_node_ids" TEXT[],
ADD COLUMN     "client_node_id" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "node_id" TEXT NOT NULL,
ADD COLUMN     "parent_node_ids" TEXT[],
ADD COLUMN     "pipeline_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "pipeline_nodes_pkey" PRIMARY KEY ("node_id");

-- AlterTable
ALTER TABLE "public"."pipeline_templates" DROP CONSTRAINT "pipeline_templates_pkey",
DROP COLUMN "buildSpec",
DROP COLUMN "createdAt",
DROP COLUMN "creatorId",
DROP COLUMN "dockerCompose",
DROP COLUMN "ecrImageUri",
DROP COLUMN "imageVersion",
DROP COLUMN "isOfficial",
DROP COLUMN "isPublic",
DROP COLUMN "nodeConfig",
DROP COLUMN "pipelineYaml",
DROP COLUMN "templateId",
DROP COLUMN "updatedAt",
DROP COLUMN "usageCount",
DROP COLUMN "visualConfig",
ADD COLUMN     "build_spec" JSONB,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "creator_id" UUID NOT NULL,
ADD COLUMN     "docker_compose" TEXT,
ADD COLUMN     "ecr_image_uri" TEXT,
ADD COLUMN     "image_version" TEXT,
ADD COLUMN     "is_official" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "is_public" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "node_config" JSONB NOT NULL,
ADD COLUMN     "pipeline_yaml" TEXT NOT NULL,
ADD COLUMN     "template_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "usage_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "visual_config" JSONB NOT NULL,
ADD CONSTRAINT "pipeline_templates_pkey" PRIMARY KEY ("template_id");

-- AlterTable
ALTER TABLE "public"."pipelines" DROP CONSTRAINT "pipelines_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "isActive",
DROP COLUMN "pipelineId",
DROP COLUMN "pipelineYaml",
DROP COLUMN "projectId",
DROP COLUMN "templateId",
DROP COLUMN "triggerBranches",
DROP COLUMN "triggerType",
DROP COLUMN "updatedAt",
DROP COLUMN "visualConfig",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "pipeline_id" TEXT NOT NULL,
ADD COLUMN     "pipeline_yaml" TEXT,
ADD COLUMN     "project_id" TEXT NOT NULL,
ADD COLUMN     "template_id" TEXT,
ADD COLUMN     "trigger_branches" TEXT[],
ADD COLUMN     "trigger_type" "public"."TriggerType" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "visual_config" JSONB,
ADD CONSTRAINT "pipelines_pkey" PRIMARY KEY ("pipeline_id");

-- AlterTable
ALTER TABLE "public"."project_secrets" DROP CONSTRAINT "project_secrets_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "isSecure",
DROP COLUMN "projectId",
DROP COLUMN "secretId",
DROP COLUMN "updatedAt",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "is_secure" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "project_id" TEXT NOT NULL,
ADD COLUMN     "secret_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "project_secrets_pkey" PRIMARY KEY ("secret_id");

-- AlterTable
ALTER TABLE "public"."projects" DROP CONSTRAINT "projects_pkey",
DROP COLUMN "createdAt",
DROP COLUMN "githubOwner",
DROP COLUMN "githubRepoId",
DROP COLUMN "githubRepoName",
DROP COLUMN "githubRepoUrl",
DROP COLUMN "installationId",
DROP COLUMN "isActive",
DROP COLUMN "isPrivate",
DROP COLUMN "projectId",
DROP COLUMN "selectedBranch",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "github_owner" TEXT NOT NULL,
ADD COLUMN     "github_repo_id" TEXT NOT NULL,
ADD COLUMN     "github_repo_name" TEXT NOT NULL,
ADD COLUMN     "github_repo_url" TEXT NOT NULL,
ADD COLUMN     "installation_id" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "is_private" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "project_id" TEXT NOT NULL,
ADD COLUMN     "selected_branch" TEXT NOT NULL DEFAULT 'main',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("project_id");

-- AlterTable
ALTER TABLE "public"."push_events" DROP CONSTRAINT "push_events_pkey",
DROP COLUMN "commitMessage",
DROP COLUMN "commitSha",
DROP COLUMN "createdAt",
DROP COLUMN "projectId",
DROP COLUMN "pushEventId",
DROP COLUMN "pushedAt",
DROP COLUMN "pusherName",
ADD COLUMN     "commit_message" TEXT,
ADD COLUMN     "commit_sha" TEXT NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "project_id" TEXT NOT NULL,
ADD COLUMN     "push_event_id" TEXT NOT NULL,
ADD COLUMN     "pushed_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "pusher_name" TEXT,
ADD CONSTRAINT "push_events_pkey" PRIMARY KEY ("push_event_id");

-- AlterTable
ALTER TABLE "public"."users" DROP CONSTRAINT "users_pkey",
DROP COLUMN "avatarUrl",
DROP COLUMN "createdAt",
DROP COLUMN "email",
DROP COLUMN "githubId",
DROP COLUMN "githubNodeId",
DROP COLUMN "githubUsername",
DROP COLUMN "isActive",
DROP COLUMN "lastLoginAt",
DROP COLUMN "name",
DROP COLUMN "updatedAt",
DROP COLUMN "userId",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "github_id" INTEGER NOT NULL,
ADD COLUMN     "github_node_id" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_login_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "user_id" UUID NOT NULL,
ADD CONSTRAINT "users_pkey" PRIMARY KEY ("user_id");

-- DropTable
DROP TABLE "public"."sessions";

-- CreateTable
CREATE TABLE "public"."tokens" (
    "token_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token_expires_at" TIMESTAMPTZ(6) NOT NULL,
    "access_token_expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("token_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tokens_refresh_token_key" ON "public"."tokens"("refresh_token");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_access_token_key" ON "public"."tokens"("access_token");

-- CreateIndex
CREATE INDEX "_SharedTemplates_B_index" ON "public"."_SharedTemplates"("B");

-- CreateIndex
CREATE INDEX "deployment_logs_deployment_id_timestamp_idx" ON "public"."deployment_logs"("deployment_id", "timestamp");

-- CreateIndex
CREATE INDEX "deployments_execution_id_idx" ON "public"."deployments"("execution_id");

-- CreateIndex
CREATE INDEX "execution_logs_execution_id_timestamp_idx" ON "public"."execution_logs"("execution_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "github_installations_github_installation_id_key" ON "public"."github_installations"("github_installation_id");

-- CreateIndex
CREATE INDEX "github_installations_github_installation_id_idx" ON "public"."github_installations"("github_installation_id");

-- CreateIndex
CREATE INDEX "github_installations_user_id_idx" ON "public"."github_installations"("user_id");

-- CreateIndex
CREATE INDEX "node_executions_execution_id_idx" ON "public"."node_executions"("execution_id");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_executions_aws_build_id_key" ON "public"."pipeline_executions"("aws_build_id");

-- CreateIndex
CREATE INDEX "pipeline_executions_pipeline_id_status_idx" ON "public"."pipeline_executions"("pipeline_id", "status");

-- CreateIndex
CREATE INDEX "pipeline_executions_aws_build_id_idx" ON "public"."pipeline_executions"("aws_build_id");

-- CreateIndex
CREATE INDEX "pipeline_nodes_pipeline_id_order_idx" ON "public"."pipeline_nodes"("pipeline_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_nodes_pipeline_id_client_node_id_key" ON "public"."pipeline_nodes"("pipeline_id", "client_node_id");

-- CreateIndex
CREATE INDEX "pipeline_templates_is_public_category_idx" ON "public"."pipeline_templates"("is_public", "category");

-- CreateIndex
CREATE INDEX "pipelines_project_id_idx" ON "public"."pipelines"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_secrets_project_id_key_key" ON "public"."project_secrets"("project_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "projects_github_repo_id_key" ON "public"."projects"("github_repo_id");

-- CreateIndex
CREATE INDEX "projects_user_id_idx" ON "public"."projects"("user_id");

-- CreateIndex
CREATE INDEX "projects_installation_id_idx" ON "public"."projects"("installation_id");

-- CreateIndex
CREATE UNIQUE INDEX "projects_github_owner_github_repo_name_key" ON "public"."projects"("github_owner", "github_repo_name");

-- CreateIndex
CREATE UNIQUE INDEX "projects_user_id_github_repo_id_key" ON "public"."projects"("user_id", "github_repo_id");

-- CreateIndex
CREATE INDEX "push_events_project_id_pushed_at_idx" ON "public"."push_events"("project_id", "pushed_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_github_id_key" ON "public"."users"("github_id");

-- AddForeignKey
ALTER TABLE "public"."tokens" ADD CONSTRAINT "tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."github_installations" ADD CONSTRAINT "github_installations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "public"."github_installations"("installation_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_secrets" ADD CONSTRAINT "project_secrets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pipelines" ADD CONSTRAINT "pipelines_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pipelines" ADD CONSTRAINT "pipelines_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."pipeline_templates"("template_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pipeline_templates" ADD CONSTRAINT "pipeline_templates_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pipeline_nodes" ADD CONSTRAINT "pipeline_nodes_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("pipeline_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pipeline_executions" ADD CONSTRAINT "pipeline_executions_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "public"."pipelines"("pipeline_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."node_executions" ADD CONSTRAINT "node_executions_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "public"."pipeline_executions"("execution_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."node_executions" ADD CONSTRAINT "node_executions_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "public"."pipeline_nodes"("node_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deployments" ADD CONSTRAINT "deployments_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "public"."pipeline_executions"("execution_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."execution_logs" ADD CONSTRAINT "execution_logs_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "public"."pipeline_executions"("execution_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."deployment_logs" ADD CONSTRAINT "deployment_logs_deployment_id_fkey" FOREIGN KEY ("deployment_id") REFERENCES "public"."deployments"("deployment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."push_events" ADD CONSTRAINT "push_events_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SharedTemplates" ADD CONSTRAINT "_SharedTemplates_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."pipeline_templates"("template_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SharedTemplates" ADD CONSTRAINT "_SharedTemplates_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
