import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword, signSessionToken, setSessionCookie, clearSessionCookie, getSessionFromRequest } from "../lib/auth";
import { sendWelcomeEmail } from "../services/email";

export const authRouter = Router();

const CLIENT_URL = process.env.CLIENT_URL!;
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

authRouter.post("/signup", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: "Valid email and a password of at least 6 characters are required." });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "An account with this email already exists." });

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({ data: { email, passwordHash } });

    const token = signSessionToken(user.id, user.email);
    setSessionCookie(res, token);
    void sendWelcomeEmail(user.email);
    res.json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error("[auth] signup failed:", err);
    res.status(503).json({ error: "Could not create account. Please try again." });
  }
});

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) return res.status(400).json({ error: "Email and password are required." });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) return res.status(401).json({ error: "Invalid email or password." });

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return res.status(401).json({ error: "Invalid email or password." });

    const token = signSessionToken(user.id, user.email);
    setSessionCookie(res, token);
    res.json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error("[auth] login failed:", err);
    res.status(503).json({ error: "Could not sign in. Please try again." });
  }
});

authRouter.post("/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

authRouter.get("/me", async (req, res) => {
  const session = getSessionFromRequest(req);
  if (!session) return res.status(401).json({ user: null });
  res.json({ user: { id: session.userId, email: session.email } });
});

authRouter.get("/google", (req, res) => {
  const url = googleClient.generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    prompt: "select_account",
  });
  res.redirect(url);
});

authRouter.get("/google/callback", async (req, res) => {
  const code = req.query.code as string | undefined;
  if (!code) return res.redirect(`${CLIENT_URL}/login?error=google_failed`);

  try {
    const { tokens } = await googleClient.getToken(code);
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) return res.redirect(`${CLIENT_URL}/login?error=google_failed`);

    let user = await prisma.user.findUnique({ where: { email: payload.email } });
    let isNewUser = false;

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: payload.email,
          googleId: payload.sub,
          name: payload.given_name || "",
          lastname: payload.family_name || "",
        },
      });
      isNewUser = true;
    } else if (!user.googleId) {
      user = await prisma.user.update({ where: { id: user.id }, data: { googleId: payload.sub } });
    }

    const token = signSessionToken(user.id, user.email);
    setSessionCookie(res, token);
    if (isNewUser) {
      void sendWelcomeEmail(user.email, user.name);
    }
    res.redirect(`${CLIENT_URL}/dashboard`);
  } catch (err) {
    console.error("[auth] google callback failed:", err);
    res.redirect(`${CLIENT_URL}/login?error=google_failed`);
  }
});