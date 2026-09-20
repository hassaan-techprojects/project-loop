import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  verifyOtpHash,
  OTP_CONFIG,
  generateResetToken,
  hashResetToken,
} from "@/lib/otp";

const schema = z.object({
  email: z.string().email(),
  otp: z.string().min(4).max(8),
});

/**
 * Verifies a password-reset OTP and, if valid, issues a single-use reset
 * token. The client must send this token back to /reset along with the
 * new password — the reset step never trusts a bare email/"I verified"
 * flag from the browser.
 */
export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter the 6-digit code." },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase().trim();
  const otp = parsed.data.otp.trim();

  const invalid = () =>
    NextResponse.json({ error: "Incorrect or expired code." }, { status: 400 });

  const token = await prisma.otpToken.findFirst({
    where: { email, purpose: "PASSWORD_RESET", consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!token) return invalid();
  if (token.expiresAt < new Date()) return invalid();
  if (token.attempts >= OTP_CONFIG.MAX_ATTEMPTS) return invalid();

  const valid = verifyOtpHash(otp, email, token.otpHash);

  if (!valid) {
    await prisma.otpToken.update({
      where: { id: token.id },
      data: { attempts: { increment: 1 } },
    });

    return invalid();
  }

  const resetToken = generateResetToken();

  await prisma.$transaction([
    prisma.otpToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() },
    }),
    prisma.passwordResetToken.create({
      data: {
        email,
        tokenHash: hashResetToken(resetToken),
        expiresAt: new Date(Date.now() + OTP_CONFIG.RESET_TOKEN_TTL_MS),
      },
    }),
  ]);

  return NextResponse.json({ success: true, resetToken }, { status: 200 });
}
