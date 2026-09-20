import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { generateOtp, hashOtp, otpExpiryDate, enforceOtpRateLimit } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";

const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  workspace: z.string().min(1, "Workspace name is required").max(100),
});

/**
 * Step 1 of signup.
 *
 * This no longer creates the Workspace/User directly. It validates the
 * submitted details, hashes the password, stashes that data (never the raw
 * password) against a one-time code, and emails the code to the user.
 *
 * The account is only actually created in
 * `/api/auth/signup/verify-otp` once the code is confirmed. This keeps the
 * existing signup behavior (default themes/channels, ADMIN role, hashed
 * password, workspace isolation) intact — it just runs one step later.
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

  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    const firstError =
      parsed.error.issues[0]?.message ?? "Invalid input.";

    return NextResponse.json(
      { error: firstError },
      { status: 400 }
    );
  }

  const { name, password, workspace } = parsed.data;
  const email = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const rate = await enforceOtpRateLimit(email, "SIGNUP");

  if (!rate.allowed) {
    if (rate.reason === "cooldown") {
      return NextResponse.json(
        { error: `Please wait ${rate.waitSeconds}s before requesting another code.` },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Too many verification codes requested. Please try again later." },
      { status: 429 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const otp = generateOtp();

  try {
    await prisma.otpToken.create({
      data: {
        email,
        purpose: "SIGNUP",
        otpHash: hashOtp(otp, email),
        // The raw password is never stored — only its bcrypt hash.
        payload: { name, email, passwordHash, workspace },
        expiresAt: otpExpiryDate(),
      },
    });

    await sendOtpEmail(email, otp, "signup");
  } catch (err) {
    console.error("Failed to start signup verification:", err);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { success: true, email },
    { status: 200 }
  );
}
