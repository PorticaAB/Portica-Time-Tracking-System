import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(requireAuth);

// Admin: full client list. Contractors: only clients that have at least one
// project they're assigned to (used to populate log-time pickers).
router.get(
  "/",
  asyncHandler(async (req, res) => {
    if (req.user!.role === "ADMIN") {
      const clients = await prisma.client.findMany({
        orderBy: { name: "asc" },
        include: { projects: { select: { id: true, name: true, isActive: true } } },
      });
      return res.json(clients);
    }

    const clients = await prisma.client.findMany({
      where: {
        isActive: true,
        projects: { some: { isActive: true, assignments: { some: { userId: req.user!.sub } } } },
      },
      orderBy: { name: "asc" },
      include: {
        projects: {
          where: { isActive: true, assignments: { some: { userId: req.user!.sub } } },
          select: { id: true, name: true },
        },
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
    const data = updateSchema.parse(req.body);
    const client = await prisma.client.update({ where: { id: req.params.id }, data });
    res.json(client);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const client = await prisma.client.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json(client);
  })
);

export default router;
