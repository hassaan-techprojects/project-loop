"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (!result?.ok || result?.error) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }

      // Force a full navigation so the authenticated session
      // is available before the dashboard loads.
      window.location.href = "/dashboard";
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main
      className={`${dmSans.variable} ${manrope.variable} min-h-screen bg-[#eeeef2] px-5 py-8 md:px-8 md:py-10`}
      style={{
        fontFamily: "var(--font-dm-sans), sans-serif",
      }}
    >
      <div className="mx-auto grid min-h-[650px] w-full max-w-[1060px] overflow-hidden rounded-[26px] border border-[#e2e1e7] bg-white shadow-[0_25px_70px_rgba(20,18,30,0.12)] lg:grid-cols-[44%_56%]">
        {/* Left brand panel */}
        <section className="relative flex min-h-[440px] flex-col justify-center overflow-hidden bg-[linear-gradient(145deg,#171321_0%,#24183d_52%,#171321_100%)] px-8 py-12 text-white sm:px-12 lg:min-h-full lg:px-[50px]">
          {/* Decorative glows */}
          <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#8068e8]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-[#4e7cff]/15 blur-3xl" />

          <div className="relative z-10">
            {/* Logo */}
            <div className="mb-10">
              <div
                className="text-[42px] font-extrabold tracking-[-0.06em] sm:text-[48px]"
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                }}
              >
                LOOP
              </div>

              <div className="mt-2 h-[3px] w-[82px] rounded-full bg-gradient-to-r from-white via-[#9b8aff] to-[#5d4bd0]" />
            </div>

            {/* Brand copy */}
            <div className="max-w-[420px]">
              <p className="mb-4 text-sm font-semibold tracking-[0.01em] text-[#c7c0dc]">
                Customer feedback intelligence
              </p>

              <h2
                className="text-3xl font-extrabold leading-[1.08] tracking-[-0.035em] sm:text-[38px]"
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                }}
              >
                Turn customer
                <br />
                feedback into
                <br />
                confident decisions.
              </h2>

              <p className="mt-6 max-w-[390px] text-[15px] leading-7 text-[#b9b1ce]">
                From the first piece of feedback to the final decision, LOOP
                keeps your team connected to the customer voice. Understand
                what customers value, recognize recurring problems, discover
                emerging themes, and focus your attention on the areas that can
                make the biggest difference.
              </p>

              <div className="mt-8 space-y-1 text-[15px] font-semibold leading-7 text-white">
                <p>Listen to your customers.</p>
                <p>Understand what matters.</p>
                <p>Act with confidence.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Right login panel */}
        <section className="flex items-center bg-white px-7 py-12 sm:px-12 lg:px-16">
          <div className="mx-auto w-full max-w-[460px]">
            <p className="mb-3 text-sm font-semibold text-[#6d5ae0]">
              Welcome back to LOOP
            </p>

            <h1
              className="text-[36px] font-extrabold leading-tight tracking-[-0.04em] text-[#171321] sm:text-[42px]"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
              }}
            >
              Sign in
            </h1>

            <p className="mt-4 max-w-[430px] text-[15px] leading-6 text-[#6f6a80]">
              Sign in to your workspace and stay connected to what your
              customers are saying.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-[#292432]"
                >
                  Work email
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  className="h-12 w-full rounded-xl border border-[#dedbe5] bg-white px-4 text-[15px] text-[#171321] outline-none transition placeholder:text-[#aaa5b3] focus:border-[#6d5ae0] focus:ring-4 focus:ring-[#6d5ae0]/10"
                />
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-[#292432]"
                >
                  Password
                </label>

                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="h-12 w-full rounded-xl border border-[#dedbe5] bg-white px-4 pr-20 text-[15px] text-[#171321] outline-none transition placeholder:text-[#aaa5b3] focus:border-[#6d5ae0] focus:ring-4 focus:ring-[#6d5ae0]/10"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-2 text-sm font-semibold text-[#6d5ae0] hover:text-[#5a47d1]"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-[#f1c9ce] bg-[#fff4f5] px-4 py-3 text-sm font-medium text-[#c63e4e]"
                >
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl bg-[#6d5ae0] px-5 text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(109,90,224,0.22)] transition hover:bg-[#5a47d1] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            {/* Signup */}
            <p className="mt-7 text-center text-sm text-[#6f6a80]">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-bold text-[#6d5ae0] hover:text-[#5a47d1]"
              >
                Create your workspace
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}