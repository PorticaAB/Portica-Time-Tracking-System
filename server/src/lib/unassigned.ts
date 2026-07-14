import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { Prisma, PrismaClient } from "@prisma/client";

// Fixed, well-known IDs (not the usual cuid()) so these system buckets are
// true singletons, safe to reference/reassign to from any delete operation
// without a lookup race. Created lazily on first use.
const UNASSIGNED_CLIENT_ID = "system-unassigned-client";
const UNASSIGNED_PROJECT_ID = "system-unassigned-project";
const FORMER_MEMBER_USER_ID = "system-former-member";

type Db = PrismaClient | Prisma.TransactionClient;

// Absorbs time entries orphaned by a permanent project/client delete, so
// historical hours stay intact in reports/calendar instead of being lost.
export async function getOrCreateUnassignedProjectId(db: Db): Promise<string> {
  await db.client.upsert({
    where: { id: UNASSIGNED_CLIENT_ID },
    update: {},
    create: { id: UNASSIGNED_CLIENT_ID, name: "Unassigned", isActive: false, isSystem: true },
  });
  await db.project.upsert({
    where: { id: UNASSIGNED_PROJECT_ID },
    update: {},
    create: {
      id: UNASSIGNED_PROJECT_ID,
      name: "Unassigned",
      clientId: UNASSIGNED_CLIENT_ID,
      isActive: false,
      isSystem: true,
    },
  });
  return UNASSIGNED_PROJECT_ID;
}

// Absorbs time entries orphaned by a permanent user delete, so historical
// hours stay intact in reports/calendar instead of being lost. isActive is
// false and the password is an unusable random hash, so this account can
// never actually log in even though it technically exists.
export async function getOrCreateFormerMemberUserId(db: Db): Promise<string> {
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
  await db.user.upsert({
    where: { id: FORMER_MEMBER_USER_ID },
    update: {},
    create: {
      id: FORMER_MEMBER_USER_ID,
      email: "former-team-member@system.klocka.internal",
      name: "Former Team Member",
      passwordHash,
      role: "CONTRACTOR",
      memberRole: null,
      isActive: false,
      isSystem: true,
      activatedAt: null,
    },
  });
  return FORMER_MEMBER_USER_ID;
}
