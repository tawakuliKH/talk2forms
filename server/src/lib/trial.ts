import { prisma } from "./prisma";

export async function consumeTrial({ email, deviceId }: { email?: string | null; deviceId?: string | null }) {
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return { allowed: false, reason: "No account found for this email." };
    if (user.profileComplete) return { allowed: false, reason: "Profile complete — use your own Gemini key instead." };
    if (user.trialUsed) return { allowed: false, reason: "Trial already used. Please complete your profile." };
    await prisma.user.update({ where: { email }, data: { trialUsed: true } });
    return { allowed: true };
  }

  if (!deviceId) return { allowed: false, reason: "Missing deviceId." };

  const existing = await prisma.anonymousUsage.findUnique({ where: { deviceId } });
  if (existing) return { allowed: false, reason: "Trial already used on this device. Please sign up." };

  await prisma.anonymousUsage.create({ data: { deviceId } });
  return { allowed: true };
}