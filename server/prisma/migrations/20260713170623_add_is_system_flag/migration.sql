-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "isSystem" BOOLEAN NOT NULL DEFAULT false;

