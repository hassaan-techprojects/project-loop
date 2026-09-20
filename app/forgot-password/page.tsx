"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DM_Sans, Manrope } from "next/font/google";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-manrope",
});

type Step = "email" | "otp" | "password" | "done";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setNotice("If an account exists for that email, a code has been sent.");
      setStep("otp");
      setLoading(false);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setResetToken(data.resetToken);
      setNotice("");
      setStep("password");
      setLoading(false);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setStep("done");
      setLoading(false);
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not resend the code.");
        setLoading(false);
        return;
      }

      setNotice("A new code has been sent if that account exists.");
      setLoading(false);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main
      className={`${dmSans.variable} ${manrope.variable} min-h-screen bg-[#eeeef2] px-5 py-8 md:px-8 md:py-10`}
      style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
    >
      <div className="mx-auto flex min-h-[600px] w-full max-w-[520px] items-center">
        <div className="w-full rounded-[26px] border border-[#e2e1e7] bg-white px-7 py-12 shadow-[0_25px_70px_rgba(20,18,30,0.12)] sm:px-12">
          <p className="mb-3 text-sm font-semibold text-[#6d5ae0]">
            Reset your password
          </p>

          {step === "email" && (
            <>
              <h1
                className="text-[32px] font-extrabold leading-tight tracking-[-0.04em] text-[#171321]"
                style={{ fontFamily: "var(--font-manrope), sans-serif" }}
              >
                Forgot password?
              </h1>
              <p className="mt-4 text-[15px] leading-6 text-[#6f6a80]">
                Enter your registered email and we&apos;ll send you a
                verification code.
              </p>

              <form onSubmit={handleRequestOtp} className="mt-8 space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-[#292432]"
                  >
                    Work email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="h-12 w-full rounded-xl border border-[#dedbe5] bg-white px-4 text-[15px] text-[#171321] outline-none transition placeholder:text-[#aaa5b3] focus:border-[#6d5ae0] focus:ring-4 focus:ring-[#6d5ae0]/10"
                  />
                </div>

                {error && <ErrorBox message={error} />}

                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-xl bg-[#6d5ae0] px-5 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(109,90,224,0.22)] transition hover:bg-[#5a47d1] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Sending code..." : "Send code"}
                </button>
              </form>
            </>
          )}

          {step === "otp" && (
            <>
              <h1
                className="text-[32px] font-extrabold leading-tight tracking-[-0.04em] text-[#171321]"
                style={{ fontFamily: "var(--font-manrope), sans-serif" }}
              >
                Enter your code
              </h1>
              <p className="mt-4 text-[15px] leading-6 text-[#6f6a80]">
                We sent a 6-digit code to <strong>{email}</strong> if an
                account exists for it.
              </p>

              <form onSubmit={handleVerifyOtp} className="mt-8 space-y-5">
                <div>
                  <label
                    htmlFor="otp"
                    className="mb-2 block text-sm font-semibold text-[#292432]"
                  >
                    Verification code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="h-12 w-full rounded-xl border border-[#dedbe5] bg-white px-4 text-[15px] tracking-[4px] text-[#171321] outline-none transition placeholder:tracking-normal placeholder:text-[#aaa5b3] focus:border-[#6d5ae0] focus:ring-4 focus:ring-[#6d5ae0]/10"
                  />
                </div>

                {notice && !error && (
                  <p className="text-sm text-[#6f6a80]">{notice}</p>
                )}
                {error && <ErrorBox message={error} />}

                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-xl bg-[#6d5ae0] px-5 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(109,90,224,0.22)] transition hover:bg-[#5a47d1] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Verifying..." : "Verify code"}
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="w-full text-center text-sm font-semibold text-[#6d5ae0] hover:text-[#5a47d1] disabled:opacity-60"
                >
                  Resend code
                </button>
              </form>
            </>
          )}

          {step === "password" && (
            <>
              <h1
                className="text-[32px] font-extrabold leading-tight tracking-[-0.04em] text-[#171321]"
                style={{ fontFamily: "var(--font-manrope), sans-serif" }}
              >
                Create a new password
              </h1>
              <p className="mt-4 text-[15px] leading-6 text-[#6f6a80]">
                Choose a new password for your account.
              </p>

              <form onSubmit={handleResetPassword} className="mt-8 space-y-5">
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-[#292432]"
                  >
                    New password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="h-12 w-full rounded-xl border border-[#dedbe5] bg-white px-4 pr-20 text-[15px] text-[#171321] outline-none transition placeholder:text-[#aaa5b3] focus:border-[#6d5ae0] focus:ring-4 focus:ring-[#6d5ae0]/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 px-2 text-sm font-semibold text-[#6d5ae0] hover:text-[#5a47d1]"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-semibold text-[#292432]"
                  >
                    Confirm new password
                  </label>
                  <input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="h-12 w-full rounded-xl border border-[#dedbe5] bg-white px-4 text-[15px] text-[#171321] outline-none transition placeholder:text-[#aaa5b3] focus:border-[#6d5ae0] focus:ring-4 focus:ring-[#6d5ae0]/10"
                  />
                </div>

                {error && <ErrorBox message={error} />}

                <button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-xl bg-[#6d5ae0] px-5 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(109,90,224,0.22)] transition hover:bg-[#5a47d1] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Saving..." : "Reset password"}
                </button>
              </form>
            </>
          )}

          {step === "done" && (
            <>
              <h1
                className="text-[32px] font-extrabold leading-tight tracking-[-0.04em] text-[#171321]"
                style={{ fontFamily: "var(--font-manrope), sans-serif" }}
              >
                Password updated
              </h1>
              <p className="mt-4 text-[15px] leading-6 text-[#6f6a80]">
                Your password has been changed. Taking you to sign in...
              </p>
            </>
          )}

          <p className="mt-7 text-center text-sm text-[#6f6a80]">
            <Link
              href="/login"
              className="font-bold text-[#6d5ae0] hover:text-[#5a47d1]"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-[#f1c9ce] bg-[#fff4f5] px-4 py-3 text-sm font-medium text-[#c63e4e]"
    >
      {message}
    </div>
  );
}
