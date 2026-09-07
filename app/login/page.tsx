"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (!res?.ok) {
      setError("Invalid email or password.");
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4 py-8">
      <div className="w-full max-w-[1050px] min-h-[500px] rounded-[20px] overflow-hidden shadow-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col md:flex-row">
        {/* Left panel */}
        <div
          className="w-full md:w-1/2 flex flex-col items-center justify-center text-center gap-5 px-8 py-12 md:p-[60px] text-white"
          style={{
            backgroundImage: `linear-gradient(160deg, var(--primary-gradient-from) 0%, var(--primary-gradient-to) 100%)`,
          }}
        >
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M12 4C7.58 4 4 7.58 4 12M4 12C4 16.42 7.58 20 12 20M4 12H8M12 20C16.42 20 20 16.42 20 12M20 12C20 7.58 16.42 4 12 4M20 12H16"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h1
            className="text-2xl tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            LOOP
          </h1>

          <p className="text-sm text-white/70 -mt-3">
            Close the loop on customer feedback.
          </p>

          <div className="h-px w-12 bg-white/20 my-2" />

          <h2
            className="text-3xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Welcome Back!
          </h2>

          <p className="text-white/80 text-sm max-w-xs leading-relaxed">
            Sign in to continue to your LOOP workspace and turn customer
            feedback into meaningful product decisions.
          </p>
        </div>

        {/* Right panel */}
        <div className="w-full md:w-1/2 flex items-center justify-center px-8 py-12 md:p-[60px]">
          <form onSubmit={handleSubmit} className="w-full max-w-[430px]">
            <h2
              className="text-2xl mb-8"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Sign In
            </h2>

            {error && (
              <p
                className="text-[var(--negative)] text-sm mb-4"
                role="alert"
              >
                {error}
              </p>
            )}

            <label
              htmlFor="email"
              className="block text-sm font-medium text-[var(--text)] mb-2"
            >
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full h-[50px] border border-[var(--border)] rounded-[10px] px-4 mb-5 text-[var(--text)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-shadow"
            />

            <label
              htmlFor="password"
              className="block text-sm font-medium text-[var(--text)] mb-2"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full h-[50px] border border-[var(--border)] rounded-[10px] px-4 mb-7 text-[var(--text)] bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-shadow"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[50px] rounded-[10px] text-white font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--primary)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "var(--primary-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--primary)";
              }}
            >
              {loading ? "Signing in..." : "Login"}
            </button>

            <p className="text-center text-sm text-[var(--text-muted)] mt-6">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="text-[var(--primary)] font-medium hover:underline"
              >
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}