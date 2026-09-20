import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { generateOtp, hashOtp, otpExpiryDate, enforceOtpRateLimit } from "@/lib/otp";
import { sendOtpEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email("Enter a valid email address") });

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
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase().trim();

  // Always respond the same way whether or not the account exists, and
  // whether or not the send actually happened, so this endpoint can't be
  // used to discover which emails have a LOOP account.
  const genericResponse = () =>
    NextResponse.json(
      { success: true, message: "If an account exists for that email, a code has been sent." },
      { status: 200 }
    );

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return genericResponse();
  }

  const rate = await enforceOtpRateLimit(email, "PASSWORD_RESET");

  if (!rate.allowed) {
    return genericResponse();
  }

  const otp = generateOtp();

  try {
    await prisma.otpToken.create({
      data: {
        email,
        purpose: "PASSWORD_RESET",
        otpHash: hashOtp(otp, email),
        expiresAt: otpExpiryDate(),
      },
    });

    await sendOtpEmail(email, otp, "password reset");
  } catch (err) {
    console.error("Failed to send password reset code:", err);
  }

  return genericResponse();
}
