-- CreateEnum
CREATE TYPE "public"."GithubAccountType" AS ENUM ('User', 'Organization');

-- CreateEnum
CREATE TYPE "public"."RepositorySelection" AS ENUM ('selected', 'all');

-- AlterTable
ALTER TABLE "public"."github_installations" ADD COLUMN     "account_type" "public"."GithubAccountType",
ADD COLUMN     "repository_selection" "public"."RepositorySelection" DEFAULT 'selected';

-- CreateIndex
CREATE INDEX "github_installations_account_type_idx" ON "public"."github_installations"("account_type");
