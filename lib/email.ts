import nodemailer, { Transporter } from "nodemailer";

/**
 * Sends email through Gmail SMTP using nodemailer, authenticated as a real
 * Gmail mailbox via an App Password. Unlike Resend's sandbox sender, this
 * can deliver to any recipient without a verified domain — which is what
 * makes it usable in production for a project with no domain of its own.
 *
 * Requires:
 *   GMAIL_USER          - the full Gmail address to send from
 *   GMAIL_APP_PASSWORD  - a 16-character App Password (NOT the account's
 *                          normal login password — see Google Account >
 *                          Security > 2-Step Verification > App passwords)
 *
 * Throws instead of silently no-oping or logging the OTP when email isn't
 * configured, so a misconfiguration is caught immediately instead of
 * quietly leaking a verification code nowhere.
 */

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (cachedTransporter) return cachedTransporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      "Email is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables."
    );
  }

  cachedTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  return cachedTransporter;
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string
): Promise<void> {
  const transporter = getTransporter();
  const user = process.env.GMAIL_USER;
  const displayName = process.env.EMAIL_FROM_NAME || "LOOP";

  try {
    await transporter.sendMail({
      from: `${displayName} <${user}>`,
      to,
      subject,
      text,
      html,
    });
  } catch {
    // Do not log full error details if they might echo message content —
    // nodemailer errors are typically just SMTP status text, but we keep
    // this generic to be safe and never log the OTP itself.
    console.error("Failed to send email via Gmail SMTP.");
    throw new Error("Failed to send email.");
  }
}

export async function sendOtpEmail(
  email: string,
  otp: string,
  purpose: "signup" | "password reset"
): Promise<void> {
  const subject =
    purpose === "signup"
      ? "Your LOOP verification code"
      : "Your LOOP password reset code";

  const text = `Your LOOP ${purpose} code is ${otp}. It expires in 10 minutes and can only be used once. If you didn't request this, you can ignore this email.`;

  const html = `
    <div style="font-family:sans-serif;font-size:15px;color:#171321;line-height:1.6">
      <p>Your LOOP ${purpose} code is:</p>
      <p style="font-size:30px;font-weight:800;letter-spacing:6px;margin:16px 0">${otp}</p>
      <p>This code expires in 10 minutes and can only be used once.</p>
      <p style="color:#777;font-size:13px;margin-top:20px">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `;

  await sendEmail(email, subject, html, text);
}