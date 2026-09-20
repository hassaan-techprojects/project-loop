import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyOtpHash, OTP_CONFIG } from "@/lib/otp";

const verifySchema = z.object({
  email: z.string().email(),
  otp: z.string().min(4).max(8),
});

// Unchanged from the original signup route — same defaults, same behavior.
const DEFAULT_THEMES = [
  {
    name: "Onboarding",
    description: "First-time user setup and activation",
    color: "#6366f1",
  },
  {
    name: "Billing",
    description: "Invoices, payments, pricing",
    color: "#f59e0b",
  },
  {
    name: "Performance",
    description: "Speed and reliability",
    color: "#ef4444",
  },
  {
    name: "Mobile Experience",
    description: "Mobile app/web usability",
    color: "#10b981",
  },
  {
    name: "Integrations",
    description: "SSO, third-party connections",
    color: "#8b5cf6",
  },
  {
    name: "Support Response",
    description: "Customer support quality",
    color: "#ec4899",
  },
];

const DEFAULT_CHANNELS = [
  "manual",
  "support_ticket",
  "app_store_review",
  "nps_survey",
  "sales_call",
  "sales_call_note",
  "community_post",
  "email",
  "website_feedback",
  "chat",
  "social",
  "GOOGLE_FORM",
];

type SignupPayload = {
  name: string;
  email: string;
  passwordHash: string;
  workspace: string;
};

function isSignupPayload(value: unknown): value is SignupPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.name === "string" &&
    typeof v.email === "string" &&
    typeof v.passwordHash === "string" &&
    typeof v.workspace === "string"
  );
}

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

  const parsed = verifySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter the 6-digit code." },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase().trim();
  const otp = parsed.data.otp.trim();

  const token = await prisma.otpToken.findFirst({
    where: { email, purpose: "SIGNUP", consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!token) {
    return NextResponse.json(
      { error: "No pending verification for this email. Please sign up again." },
      { status: 400 }
    );
  }

  if (token.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This code has expired. Please sign up again." },
      { status: 400 }
    );
  }

  if (token.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Too many incorrect attempts. Please sign up again." },
      { status: 400 }
    );
  }

  const valid = verifyOtpHash(otp, email, token.otpHash);

  if (!valid) {
    await prisma.otpToken.update({
      where: { id: token.id },
      data: { attempts: { increment: 1 } },
    });

    return NextResponse.json(
      { error: "Incorrect code. Please try again." },
      { status: 400 }
    );
  }

  if (!isSignupPayload(token.payload)) {
    return NextResponse.json(
      { error: "Verification data is missing. Please sign up again." },
      { status: 400 }
    );
  }

  const payload = token.payload;

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.otpToken.update({
      where: { id: token.id },
      data: { consumedAt: new Date() },
    });

    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          name: payload.workspace,
          themes: {
            create: DEFAULT_THEMES.map((theme) => ({
              ...theme,
              isActive: true,
            })),
          },
          channels: {
            create: DEFAULT_CHANNELS.map((channelName) => ({
              name: channelName,
              isActive: true,
            })),
          },
        },
      });

      await tx.user.create({
        data: {
          name: payload.name,
          email,
          passwordHash: payload.passwordHash,
          role: "ADMIN",
          workspaceId: ws.id,
        },
      });

      await tx.otpToken.update({
        where: { id: token.id },
        data: { consumedAt: new Date() },
      });
    });
  } catch (err) {
    console.error("Signup verification transaction failed:", err);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { success: true },
    { status: 201 }
  );
}
