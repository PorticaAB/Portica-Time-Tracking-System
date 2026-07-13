-- CreateEnum
CREATE TYPE "TokenPurpose" AS ENUM ('PASSWORD_RESET', 'INVITE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" "TokenPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_tokenHash_key" ON "auth_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "auth_tokens_userId_purpose_idx" ON "auth_tokens"("userId", "purpose");

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: existing accounts were created with a real admin-set password
-- (pre-invite-flow), so treat them as already activated.
UPDATE "users" SET "activatedAt" = "createdAt" WHERE "activatedAt" IS NULL;
