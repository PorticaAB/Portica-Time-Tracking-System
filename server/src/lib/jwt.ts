import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";

export interface AuthTokenPayload {
  sub: string;
  role: Role;
  email: string;
  name: string;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return secret;
}

export function signToken(payload: AuthTokenPayload): string {
  const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign(payload, getSecret(), { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, getSecret()) as AuthTokenPayload;
}
