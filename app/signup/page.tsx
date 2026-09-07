"use client";

import { useState } from "react";
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

type Status = "idle" | "loading" | "success" | "error";

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatus("loading");

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, workspace }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus("success");
      setTimeout(() => {
        router.push("/login");
      }, 900);
    } catch {
      setError("Network error. Please try again.");
      setStatus("error");
    }
  }

  const buttonLabel =
    status === "loading"
      ? "Creating workspace…"
      : status === "success"
      ? "Workspace created ✓"
      : "Create workspace";

  return (
    <div className={`${dmSans.variable} ${manrope.variable} page`}>
      <main className="shell">
        <section className="brand">
          <div className="glow a" />
          <div className="glow b" />

          <div className="brand-inner">
            <div className="logo" aria-label="LOOP">
              <span className="letter l">L</span>
              <span className="letter o1">O</span>
              <span className="letter o2">O</span>
              <span className="letter p">P</span>
            </div>

            <div className="underline" />

            <div className="brand-label">Customer feedback intelligence</div>

            <p>
              From the first piece of feedback to the final decision, LOOP
              keeps your team connected to the customer voice. Understand
              what customers value, recognize recurring problems, discover
              emerging themes, and focus your attention on the areas that
              can make the biggest difference.
            </p>

            <p className="closing">
              <span>Listen to your customers.</span>
              <span>Understand what matters.</span>
              <span>Act with confidence.</span>
            </p>
          </div>
        </section>

        <section className="form-area">
          <div className="form-wrap">
            <div className="eyebrow">Get started with LOOP</div>
            <h1>Create your workspace</h1>
            <p className="intro">
              Set up your workspace and bring your team&apos;s customer
              feedback into one place.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Your full name"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="email">Work email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="password">Password</label>
                <div className="password">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    className="show"
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="field">
                <label htmlFor="workspace">Workspace name</label>
                <input
                  id="workspace"
                  name="workspace"
                  type="text"
                  placeholder="e.g. Acme Inc."
                  autoComplete="organization"
                  required
                  value={workspace}
                  onChange={(e) => setWorkspace(e.target.value)}
                />
              </div>

              {error && <p className="form-error">{error}</p>}

              <button
                className="create"
                type="submit"
                disabled={status === "loading" || status === "success"}
              >
                {buttonLabel}
              </button>
            </form>

            <div className="signin">
              Already have an account? <Link href="/login">Sign in</Link>
            </div>
          </div>
        </section>
      </main>

      <style jsx>{`
        .page {
          font-family: var(--font-dm-sans), sans-serif;
          min-height: 100vh;
          background: #eeeef2;
          color: #111;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 34px;
        }

        .shell {
          width: min(1060px, 100%);
          min-height: 650px;
          background: #fff;
          border: 1px solid rgba(0, 0, 0, 0.07);
          border-radius: 26px;
          overflow: hidden;
          display: grid;
          grid-template-columns: 44% 56%;
          box-shadow: 0 25px 70px rgba(20, 18, 30, 0.12);
        }

        .brand {
          position: relative;
          overflow: hidden;
          color: #fff;
          padding: 56px 50px;
          background: radial-gradient(
              circle at 15% 10%,
              rgba(193, 153, 255, 0.18),
              transparent 28%
            ),
            radial-gradient(
              circle at 90% 90%,
              rgba(123, 177, 255, 0.1),
              transparent 32%
            ),
            linear-gradient(145deg, #15131c, #302054 58%, #17151d);
          display: flex;
          align-items: center;
        }

        .glow {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(2px);
        }

        .glow.a {
          width: 240px;
          height: 240px;
          right: -150px;
          top: -130px;
          background: rgba(201, 164, 255, 0.15);
        }

        .glow.b {
          width: 190px;
          height: 190px;
          left: -140px;
          bottom: -110px;
          background: rgba(130, 170, 255, 0.1);
        }

        .brand-inner {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 480px;
        }

        .logo {
          font-family: var(--font-manrope), sans-serif;
          font-size: clamp(62px, 7vw, 96px);
          font-weight: 800;
          letter-spacing: -0.09em;
          line-height: 0.78;
          height: 78px;
          display: flex;
          align-items: flex-end;
        }

        .letter {
          display: inline-block;
          opacity: 0;
          transform: translateY(25px) scale(0.9);
          animation: letterIn 0.65s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }

        .letter.l {
          animation-delay: 0.1s;
        }

        .letter.o1 {
          animation-delay: 0.3s;
        }

        .letter.o2 {
          animation: jumpIn 0.85s cubic-bezier(0.15, 0.9, 0.25, 1.2) 0.52s
            forwards;
        }

        .letter.p {
          animation-delay: 0.9s;
        }

        @keyframes letterIn {
          0% {
            opacity: 0;
            transform: translateY(25px) scale(0.9);
          }
          70% {
            opacity: 1;
            transform: translateY(-5px) scale(1.03);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes jumpIn {
          0% {
            opacity: 0;
            transform: translate(28px, -50px) rotate(-9deg) scale(0.65);
          }
          45% {
            opacity: 1;
            transform: translate(10px, -28px) rotate(5deg) scale(0.83);
          }
          72% {
            transform: translate(-2px, 5px) rotate(-2deg) scale(1.06);
          }
          100% {
            opacity: 1;
            transform: translate(0) rotate(0) scale(1);
          }
        }

        .underline {
          width: 0;
          height: 4px;
          border-radius: 999px;
          margin-top: 17px;
          background: linear-gradient(90deg, #ffffff, #cdb0ff, #ffffff);
          box-shadow: 0 0 20px rgba(207, 176, 255, 0.5);
          animation: drawLine 1s ease 1.45s forwards;
        }

        @keyframes drawLine {
          to {
            width: min(330px, 82%);
          }
        }

        .brand-label {
          margin-top: 30px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.05em;
          color: #ded9e7;
        }

        .brand p {
          color: #c8c3d0;
          font-size: 15px;
          line-height: 1.75;
          margin: 23px 0 0;
          max-width: 430px;
        }

        .closing {
          color: #fff !important;
          font-size: 16px !important;
          line-height: 1.75 !important;
          font-weight: 700;
          margin-top: 29px !important;
          padding-left: 18px;
          border-left: 3px solid #bda0ef;
        }

        .closing span {
          display: block;
        }

        .form-area {
          padding: 56px 64px;
          display: flex;
          align-items: center;
        }

        .form-wrap {
          width: 100%;
          max-width: 500px;
          margin: auto;
        }

        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.13em;
          font-size: 11px;
          font-weight: 700;
          color: #8a8a91;
          margin-bottom: 12px;
        }

        h1 {
          font-family: var(--font-manrope), sans-serif;
          font-size: clamp(32px, 3.4vw, 45px);
          line-height: 1.05;
          letter-spacing: -0.045em;
          margin: 0 0 12px;
        }

        .intro {
          font-size: 14px;
          line-height: 1.6;
          color: #777;
          margin: 0 0 28px;
        }

        form {
          display: grid;
          gap: 16px;
        }

        .field {
          display: grid;
          gap: 7px;
        }

        label {
          font-size: 13px;
          font-weight: 700;
        }

        input {
          height: 51px;
          width: 100%;
          border: 1px solid #dedee3;
          border-radius: 11px;
          padding: 0 14px;
          font-family: inherit;
          font-size: 14px;
          outline: none;
          background: #fff;
          color: #111;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        input:focus {
          border-color: #171717;
          box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.055);
        }

        .password {
          position: relative;
        }

        .password input {
          padding-right: 68px;
        }

        .show {
          position: absolute;
          right: 8px;
          top: 7px;
          height: 37px;
          padding: 0 10px;
          border: 0;
          border-radius: 8px;
          background: #f1f1f3;
          color: #333;
          font-family: inherit;
          font-weight: 700;
          cursor: pointer;
        }

        .show:hover {
          background: #e8e8eb;
        }

        .form-error {
          font-size: 13px;
          color: #c0304a;
          margin: -6px 0 0;
        }

        .create {
          height: 53px;
          margin-top: 4px;
          border: 0;
          border-radius: 11px;
          background: #090909;
          color: #fff;
          font-family: var(--font-dm-sans), sans-serif;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 9px 22px rgba(0, 0, 0, 0.13);
          transition: background 0.22s ease, transform 0.22s ease,
            box-shadow 0.22s ease;
        }

        .create:hover:not(:disabled) {
          background: #1b1b1b;
          transform: translateY(-2px);
          box-shadow: 0 14px 27px rgba(0, 0, 0, 0.19);
        }

        .create:active:not(:disabled) {
          transform: translateY(0);
        }

        .create:disabled {
          opacity: 0.75;
          cursor: default;
        }

        .signin {
          text-align: center;
          font-size: 13px;
          color: #777;
          margin: 18px 0 0;
        }

        .signin :global(a) {
          color: #111;
          font-weight: 700;
          text-decoration: none;
        }

        .signin :global(a:hover) {
          text-decoration: underline;
        }

        @media (max-width: 900px) {
          .page {
            padding: 22px;
          }
          .shell {
            grid-template-columns: 1fr;
            max-width: 600px;
            min-height: 0;
          }
          .brand {
            padding: 42px 38px;
          }
          .form-area {
            padding: 42px 38px;
          }
          .brand p {
            max-width: none;
          }
        }

        @media (max-width: 520px) {
          .page {
            padding: 0;
            background: #fff;
            align-items: stretch;
          }
          .shell {
            width: 100%;
            border: 0;
            border-radius: 0;
            box-shadow: none;
            display: flex;
            flex-direction: column;
          }
          .brand {
            padding: 38px 22px 34px;
            min-height: 420px;
          }
          .logo {
            font-size: 66px;
            height: 65px;
          }
          .underline {
            margin-top: 14px;
            height: 3px;
          }
          .brand-label {
            margin-top: 25px;
            font-size: 11px;
          }
          .brand p {
            font-size: 13.5px;
            line-height: 1.7;
            margin-top: 19px;
          }
          .closing {
            font-size: 14px !important;
            line-height: 1.75 !important;
            margin-top: 23px !important;
            padding-left: 14px;
          }
          .form-area {
            padding: 35px 22px 42px;
          }
          h1 {
            font-size: 31px;
          }
          .intro {
            margin-bottom: 23px;
          }
          input {
            height: 50px;
          }
          .create {
            height: 52px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .letter,
          .underline {
            animation: none !important;
            opacity: 1;
            transform: none;
          }
          .underline {
            width: min(330px, 82%);
          }
        }
      `}</style>
    </div>
  );
}