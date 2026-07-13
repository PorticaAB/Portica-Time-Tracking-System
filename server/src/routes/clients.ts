import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getOrCreateUnassignedProjectId } from "../lib/unassigned";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(requireAuth);

// Clients are flat tags. Admins see everything (including inactive, for
// management); everyone else just sees active clients with active projects.
// The system-managed "Unassigned" bucket is always hidden from listings.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const isAdmin = req.user!.role === "ADMIN";
    const clients = await prisma.client.findMany({
      where: isAdmin ? { isSystem: false } : { isActive: true, isSystem: false, projects: { some: { isActive: true } } },
      orderBy: { name: "asc" },
      include: {
        projects: {
          where: isAdmin ? undefined : { isActive: true },
          select: { id: true, name: true, isActive: true },
        },
        ...(isAdmin ? { _count: { select: { projects: true } } } : {}),
      },
    });
    res.json(clients);
  })
);

router.use(requireRole("ADMIN"));

const createSchema = z.object({ name: z.string().min(1) });

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const client = await prisma.client.create({ data });
    res.status(201).json(client);
  })
);

const updateSchema = z.object({ name: z.string().min(1).optional(), isActive: z.boolean().optional() });

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.isSystem) return res.status(404).json({ error: "Client not found" });
    const data = updateSchema.parse(req.body);
    const client = await prisma.client.update({ where: { id: req.params.id }, data });
    res.json(client);
  })
);

// Permanent, irreversible delete. Any time entries logged against this
// client's projects are reassigned to the "Unassigned" bucket first, so
// historical hours in reports/calendar survive - only the project/client
// labels are lost, not the logged time itself.
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.client.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.isSystem) return res.status(404).json({ error: "Client not found" });

    await prisma.$transaction(async (tx) => {
      const unassignedProjectId = await getOrCreateUnassignedProjectId(tx);
      await tx.timeEntry.updateMany({
        where: { project: { clientId: req.params.id } },
        data: { projectId: unassignedProjectId, taskId: null },
      });
      await tx.client.delete({ where: { id: req.params.id } });
    });

    res.status(204).end();
  })
);

export default router;
