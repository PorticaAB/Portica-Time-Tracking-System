import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      where: { role: "CONTRACTOR" },
      orderBy: { name: "asc" },
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
    res.json(users);
  })
);

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    const email = data.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "A user with this email already exists" });

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: { email, name: data.name, passwordHash, role: "CONTRACTOR" },
    });
    res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive });
  })
);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
});

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    const update: {
      name?: string;
      email?: string;
      passwordHash?: string;
      isActive?: boolean;
    } = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.email !== undefined) update.email = data.email.toLowerCase();
    if (data.password !== undefined) update.passwordHash = await bcrypt.hash(data.password, 10);
    if (data.isActive !== undefined) update.isActive = data.isActive;

    const user = await prisma.user.update({ where: { id: req.params.id }, data: update });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    // Deactivate rather than delete, to preserve historical time entries.
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ id: user.id, isActive: user.isActive });
  })
);

export default router;
