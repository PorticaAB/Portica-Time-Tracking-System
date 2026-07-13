-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('TEAM_MEMBER', 'COACH');

-- DropForeignKey
ALTER TABLE "project_assignments" DROP CONSTRAINT "project_assignments_projectId_fkey";

-- DropForeignKey
ALTER TABLE "project_assignments" DROP CONSTRAINT "project_assignments_userId_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "memberRole" "MemberRole" DEFAULT 'TEAM_MEMBER',
ADD COLUMN     "phone" TEXT;

-- DropTable
DROP TABLE "project_assignments";

-- CreateTable
CREATE TABLE "task_assignments" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_assignments_userId_idx" ON "task_assignments"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "task_assignments_taskId_userId_key" ON "task_assignments"("taskId", "userId");

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_assignments" ADD CONSTRAINT "task_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

