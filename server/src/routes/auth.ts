import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import { issueToken, findValidToken, consumeToken, wasTokenIssuedRecently } from "../lib/authTokens";
import { sendEmail, getAppUrl } from "../lib/email";
import { passwordResetEmailHtml } from "../lib/emailTemplates";

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
    res.json({ id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role, memberRole: user.memberRole });
  })
);

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  password: z.string().min(8).optional(),
});

router.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = updateProfileSchema.parse(req.body);
    const update: { name?: string; phone?: string | null; passwordHash?: string } = {};
    if (data.name) update.name = data.name;
    if (data.phone !== undefined) update.phone = data.phone || null;
    if (data.password) update.passwordHash = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.update({ where: { id: req.user!.sub }, data: update });
    res.json({ id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role, memberRole: user.memberRole });
  })
);

// --- Forgot / reset password ---

const forgotPasswordSchema = z.object({ email: z.string().email() });

router.post(
  "/forgot-password",
  asyncHandler(async (req, res) => {
    const { email } = forgotPasswordSchema.parse(req.body);
    const genericMessage = "If that email is registered, we've sent a password reset link.";

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive) return res.json({ message: genericMessage });

    if (await wasTokenIssuedRecently(user.id, "PASSWORD_RESET")) {
      return res.json({ message: genericMessage });
    }

    const { token } = await issueToken(user.id, "PASSWORD_RESET");
    const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;
    const { sent } = await sendEmail({
      to: user.email,
      subject: "Reset your Klocka password",
      html: passwordResetEmailHtml({ name: user.name, resetUrl }),
    });

    // Email isn't wired up yet - hand back the raw link so the flow can be
    // tested end-to-end without real delivery. Once RESEND_API_KEY is set,
    // `sent` will be true and this field disappears.
    res.json({ message: genericMessage, devLink: sent ? undefined : resetUrl });
  })
);

router.get(
  "/reset-password/validate",
  asyncHandler(async (req, res) => {
    const token = String(req.query.token || "");
    const record = await findValidToken(token, "PASSWORD_RESET");
    if (!record) return res.status(400).json({ valid: false });
    res.json({ valid: true });
  })
);

const resetPasswordSchema = z.object({ token: z.string().min(1), password: z.string().min(8) });

router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { token, password } = resetPasswordSchema.parse(req.body);
    const record = await consumeToken(token, "PASSWORD_RESET");
    await prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await bcrypt.hash(password, 10) } });
    res.json({ message: "Password updated. You can now sign in." });
  })
);

// --- Accept invite ---

router.get(
  "/accept-invite/validate",
  asyncHandler(async (req, res) => {
    const token = String(req.query.token || "");
    const record = await findValidToken(token, "INVITE");
    if (!record) return res.status(400).json({ valid: false });
    res.json({ valid: true, name: record.user.name, email: record.user.email });
  })
);

const acceptInviteSchema = z.object({ token: z.string().min(1), password: z.string().min(8) });

router.post(
  "/accept-invite",
  asyncHandler(async (req, res) => {
    const { token, password } = acceptInviteSchema.parse(req.body);
    const record = await consumeToken(token, "INVITE");
    const user = await prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await bcrypt.hash(password, 10), activatedAt: new Date() },
    });

    const authToken = signToken({ sub: user.id, role: user.role, email: user.email, name: user.name });
    res.json({ token: authToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  })
);

export default router;
