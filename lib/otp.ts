import crypto from "crypto";
import { prisma } from "@/lib/db";
import type { OtpPurpose } from "@prisma/client";

export const OTP_CONFIG = {
  OTP_LENGTH: 6,
  OTP_TTL_MS: 10 * 60 * 1000, // OTP is valid for 10 minutes
  MAX_ATTEMPTS: 5, // wrong guesses allowed before the code is dead
  RESEND_COOLDOWN_MS: 45 * 1000, // minimum time between two OTP requests
  MAX_REQUESTS_PER_WINDOW: 5, // max OTP requests per email+purpose per window
  REQUEST_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  RESET_TOKEN_TTL_MS: 10 * 60 * 1000, // reset token valid for 10 minutes
};

function getPepper(): string {
  const secret = process.env.OTP_SECRET;
  if (!secret) {
    throw new Error(
      "OTP_SECRET environment variable is not set. It is required to securely hash OTP codes."
    );
  }
  return secret;
}

/**
 * Generates a cryptographically secure numeric OTP, e.g. "042913".
 */
export function generateOtp(): string {
  const max = 10 ** OTP_CONFIG.OTP_LENGTH;
  const n = crypto.randomInt(0, max);
  return n.toString().padStart(OTP_CONFIG.OTP_LENGTH, "0");
}

/**
 * Hashes an OTP with a server-side secret (HMAC) so the raw code is never
 * stored. The email is bound into the hash so a token can't be replayed
 * against a different address.
 */
export function hashOtp(otp: string, email: string): string {
  return crypto
    .createHmac("sha256", getPepper())
    .update(`${email.toLowerCase()}:${otp}`)
    .digest("hex");
}

export function verifyOtpHash(otp: string, email: string, hash: string): boolean {
  const expected = hashOtp(otp, email);
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(hash, "hex");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export function otpExpiryDate(): Date {
  return new Date(Date.now() + OTP_CONFIG.OTP_TTL_MS);
}

/**
 * Generates the raw, single-use password-reset token. This value is
 * returned to the client exactly once and is never persisted directly.
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashResetToken(token: string): string {
  return crypto.createHmac("sha256", getPepper()).update(token).digest("hex");
}

type RateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: "cooldown"; waitSeconds: number }
  | { allowed: false; reason: "limit" };

/**
 * Prevents an email address from being flooded with OTP requests:
 * - enforces a minimum gap between consecutive requests
 * - caps the total number of requests within a rolling time window
 */
export async function enforceOtpRateLimit(
  email: string,
  purpose: OtpPurpose
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - OTP_CONFIG.REQUEST_WINDOW_MS);

  const recent = await prisma.otpToken.findMany({
    where: { email, purpose, createdAt: { gt: windowStart } },
    orderBy: { createdAt: "desc" },
    take: OTP_CONFIG.MAX_REQUESTS_PER_WINDOW + 1,
    select: { createdAt: true },
  });

  if (recent.length > 0) {
    const sinceLast = Date.now() - recent[0].createdAt.getTime();
    if (sinceLast < OTP_CONFIG.RESEND_COOLDOWN_MS) {
      return {
        allowed: false,
        reason: "cooldown",
        waitSeconds: Math.ceil((OTP_CONFIG.RESEND_COOLDOWN_MS - sinceLast) / 1000),
      };
    }
  }

  if (recent.length >= OTP_CONFIG.MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, reason: "limit" };
  }

  return { allowed: true };
}
