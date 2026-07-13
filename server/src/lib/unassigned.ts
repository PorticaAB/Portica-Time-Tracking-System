import type { Prisma, PrismaClient } from "@prisma/client";

// Fixed, well-known IDs (not the usual cuid()) so this system bucket is a
// true singleton, safe to reference/reassign to from any delete operation
// without a lookup race. Created lazily on first use.
const UNASSIGNED_CLIENT_ID = "system-unassigned-client";
const UNASSIGNED_PROJECT_ID = "system-unassigned-project";

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
