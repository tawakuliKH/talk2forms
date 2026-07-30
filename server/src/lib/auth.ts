import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = "t2f_session";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function signSessionToken(userId: string, email: string) {
  return jwt.sign({ sub: userId, email }, JWT_SECRET, { expiresIn: "30d" });
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME);
}

export function getSessionFromRequest(req: Request): { userId: string; email: string } | null {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string; email: string };
    return { userId: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}
