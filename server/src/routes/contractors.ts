import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.use(requireAuth, requireRole("ADMIN"));

const memberRoleSchema = z.enum(["TEAM_MEMBER", "COACH"]);

const selectFields = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
  memberRole: true,
  isActive: true,
  createdAt: true,
} as const;

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      where: { role: "CONTRACTOR" },
      orderBy: { name: "asc" },
      select: selectFields,
    });
    res.json(users);
  })
);

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  phone: z.string().optional(),
  memberRole: memberRoleSchema.default("TEAM_MEMBER"),
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
      data: {
        email,
        name: data.name,
        passwordHash,
        phone: data.phone || null,
        memberRole: data.memberRole,
        role: "CONTRACTOR",
      },
      select: selectFields,
    });
    res.status(201).json(user);
  })
);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  phone: z.string().nullable().optional(),
  memberRole: memberRoleSchema.optional(),
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
      phone?: string | null;
      memberRole?: "TEAM_MEMBER" | "COACH";
      isActive?: boolean;
    } = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.email !== undefined) update.email = data.email.toLowerCase();
    if (data.password !== undefined) update.passwordHash = await bcrypt.hash(data.password, 10);
    if (data.phone !== undefined) update.phone = data.phone || null;
    if (data.memberRole !== undefined) update.memberRole = data.memberRole;
    if (data.isActive !== undefined) update.isActive = data.isActive;

    const user = await prisma.user.update({ where: { id: req.params.id }, data: update, select: selectFields });
    res.json(user);
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
