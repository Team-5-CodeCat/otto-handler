/*
  Warnings:

  - You are about to drop the `github` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."github" DROP CONSTRAINT "github_user_id_fkey";

-- DropTable
DROP TABLE "public"."github";

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

-- CreateIndex
CREATE UNIQUE INDEX "github_installations_installation_id_key" ON "public"."github_installations"("installation_id");

-- CreateIndex
CREATE INDEX "github_installations_user_id_idx" ON "public"."github_installations"("user_id");

-- CreateIndex
CREATE INDEX "github_installations_account_login_idx" ON "public"."github_installations"("account_login");

-- CreateIndex
CREATE INDEX "github_installations_account_id_idx" ON "public"."github_installations"("account_id");

-- CreateIndex
CREATE INDEX "project_repositories_project_id_idx" ON "public"."project_repositories"("project_id");

-- CreateIndex
CREATE INDEX "project_repositories_installation_id_idx" ON "public"."project_repositories"("installation_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_repositories_project_id_repo_full_name_key" ON "public"."project_repositories"("project_id", "repo_full_name");

-- AddForeignKey
ALTER TABLE "public"."github_installations" ADD CONSTRAINT "github_installations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_repositories" ADD CONSTRAINT "project_repositories_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("project_id") ON DELETE CASCADE ON UPDATE CASCADE;
