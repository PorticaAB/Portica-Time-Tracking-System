import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { HttpError } from "../utils/HttpError";
import { issueToken } from "../lib/authTokens";
import { sendEmail, getAppUrl } from "../lib/email";
import { inviteEmailHtml } from "../lib/emailTemplates";

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
  activatedAt: true,
  createdAt: true,
} as const;

// Other callers (calendar's "view as" picker, project task-assignment
// pills) rely on this only ever returning contractors, so admins are
// included only when the Team page explicitly asks for them.
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const includeAdmins = req.query.includeAdmins === "true";
    const users = await prisma.user.findMany({
      where: includeAdmins ? undefined : { role: "CONTRACTOR" },
      orderBy: { name: "asc" },
      select: selectFields,
    });
    res.json(users);
  })
);

// An admin demoting themselves (or someone deactivating the last admin)
// must never leave the app with zero active admins to manage it.
async function assertNotRemovingLastAdmin(targetId: string, nextRole: Role | undefined, nextIsActive: boolean | undefined) {
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return;

  const losingAdminStatus = target.role === "ADMIN" && target.isActive && (nextRole === "CONTRACTOR" || nextIsActive === false);
  if (!losingAdminStatus) return;

  const otherActiveAdmins = await prisma.user.count({ where: { role: "ADMIN", isActive: true, id: { not: targetId } } });
  if (otherActiveAdmins === 0) {
    throw new HttpError(400, "Cannot remove the last admin. Promote another team member to admin first.");
  }
}

async function sendInvite(user: { id: string; name: string; email: string }, inviterName: string) {
  const { token } = await issueToken(user.id, "INVITE");
  const inviteUrl = `${getAppUrl()}/accept-invite?token=${token}`;
  const { sent } = await sendEmail({
    to: user.email,
    subject: "You're invited to Klocka",
    html: inviteEmailHtml({ name: user.name, inviteUrl, inviterName }),
  });
  return { sent, inviteUrl };
}

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
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

    // No admin-set password - the account is unusable until the invite is
    // accepted and the member sets their own password.
    const placeholderHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
    const user = await prisma.user.create({
      data: {
        email,
        name: data.name,
        passwordHash: placeholderHash,
        phone: data.phone || null,
        memberRole: data.memberRole,
        role: "CONTRACTOR",
        activatedAt: null,
      },
      select: selectFields,
    });

    const { sent, inviteUrl } = await sendInvite(user, req.user!.name);
    res.status(201).json({ ...user, devInviteLink: sent ? undefined : inviteUrl });
  })
);

router.post(
  "/:id/resend-invite",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.activatedAt) return res.status(400).json({ error: "This member has already activated their account" });

    const { sent, inviteUrl } = await sendInvite(user, req.user!.name);
    res.json({ sent, devInviteLink: sent ? undefined : inviteUrl });
  })
);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  phone: z.string().nullable().optional(),
  memberRole: memberRoleSchema.optional(),
  isActive: z.boolean().optional(),
  role: z.enum(["ADMIN", "CONTRACTOR"]).optional(),
});

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const data = updateSchema.parse(req.body);
    await assertNotRemovingLastAdmin(req.params.id, data.role, data.isActive);

    const update: {
      name?: string;
      email?: string;
      passwordHash?: string;
      phone?: string | null;
      memberRole?: "TEAM_MEMBER" | "COACH";
      isActive?: boolean;
      role?: Role;
    } = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.email !== undefined) update.email = data.email.toLowerCase();
    if (data.password !== undefined) update.passwordHash = await bcrypt.hash(data.password, 10);
    if (data.phone !== undefined) update.phone = data.phone || null;
    if (data.memberRole !== undefined) update.memberRole = data.memberRole;
    if (data.isActive !== undefined) update.isActive = data.isActive;
    if (data.role !== undefined) update.role = data.role;

    const user = await prisma.user.update({ where: { id: req.params.id }, data: update, select: selectFields });
    res.json(user);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    // Deactivate rather than delete, to preserve historical time entries.
    await assertNotRemovingLastAdmin(req.params.id, undefined, false);
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ id: user.id, isActive: user.isActive });
  })
);

export default router;
