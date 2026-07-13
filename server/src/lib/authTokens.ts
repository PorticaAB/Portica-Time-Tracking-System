import crypto from "crypto";
import { prisma } from "./prisma";
import { HttpError } from "../utils/HttpError";
import type { TokenPurpose } from "@prisma/client";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function ttlFor(purpose: TokenPurpose): number {
  return purpose === "INVITE" ? INVITE_TTL_MS : RESET_TTL_MS;
}

// Returns the raw token (only ever held in memory / the emailed link) and
// invalidates any earlier unused token of the same purpose for this user.
export async function issueToken(userId: string, purpose: TokenPurpose): Promise<{ token: string; expiresAt: Date }> {
  const raw = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + ttlFor(purpose));

  await prisma.$transaction([
    prisma.authToken.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { usedAt: new Date() }, // invalidate previous outstanding tokens
    }),
    prisma.authToken.create({
      data: { userId, purpose, tokenHash: hashToken(raw), expiresAt },
    }),
  ]);

  return { token: raw, expiresAt };
}

// Cooldown check to prevent an endpoint being used to spam someone's inbox.
export async function wasTokenIssuedRecently(userId: string, purpose: TokenPurpose): Promise<boolean> {
  const latest = await prisma.authToken.findFirst({
    where: { userId, purpose },
    orderBy: { createdAt: "desc" },
  });
  return !!latest && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS;
}

export async function findValidToken(rawToken: string, purpose: TokenPurpose) {
  const record = await prisma.authToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
  });
  if (!record || record.purpose !== purpose) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;
  return record;
}

export async function consumeToken(rawToken: string, purpose: TokenPurpose) {
  const record = await findValidToken(rawToken, purpose);
  if (!record) throw new HttpError(400, "This link is invalid or has expired");
  await prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return record;
}
