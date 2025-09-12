/*
  Warnings:

  - Added the required column `accountId` to the `github_installations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."github_installations" ADD COLUMN     "accountId" TEXT NOT NULL;
