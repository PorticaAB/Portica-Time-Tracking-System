import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = signToken({ sub: user.id, role: user.role, email: user.email, name: user.name });
    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
    if (!user || !user.isActive) return res.status(404).json({ error: "User not found" });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  })
);

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  password: z.string().min(8).optional(),
});

router.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = updateProfileSchema.parse(req.body);
    const update: { name?: string; passwordHash?: string } = {};
    if (data.name) update.name = data.name;
    if (data.password) update.passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.update({ where: { id: req.user!.sub }, data: update });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  })
);

export default router;
