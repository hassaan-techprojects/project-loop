import Link from "next/link";

import AppShell from "@/components/app-shell";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SettingsPage() {
  return (
    <AppShell>
      <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <p
              className="mb-2 text-sm font-semibold tracking-wide"
              style={{ color: "var(--primary)" }}
            >
              Workspace
            </p>

            <h1
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ color: "var(--text)" }}
            >
              Settings
            </h1>

            <p
              className="mt-2 max-w-2xl text-sm leading-6"
              style={{ color: "var(--text-muted)" }}
            >
              Manage your workspace configuration and preferences.
            </p>
          </div>

          <section className="mb-8">
            <div className="mb-4">
              <h2
                className="text-lg font-semibold"
                style={{ color: "var(--text)" }}
              >
                Appearance
              </h2>

              <p
                className="mt-1 text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                Customize how LOOP looks across the application.
              </p>
            </div>

            <div
              className="rounded-2xl border p-5 shadow-sm sm:p-6"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: "rgba(82, 103, 125, 0.45)",
              }}
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h3
                    className="text-base font-semibold"
                    style={{ color: "var(--text)" }}
                  >
                    Light / Dark mode
                  </h3>

                  <p
                    className="mt-2 max-w-2xl text-sm leading-6"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Choose how LOOP should appear across the application. Your
                    preference is saved automatically.
                  </p>
                </div>

                <div className="shrink-0">
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="mb-4">
              <h2
                className="text-lg font-semibold"
                style={{ color: "var(--text)" }}
              >
                Workspace settings
              </h2>

              <p
                className="mt-1 text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                Configure the information and options used by your workspace.
              </p>
            </div>

            <Link
              href="/settings/themes-channels"
              className="group block rounded-2xl border p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 sm:p-6"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: "rgba(82, 103, 125, 0.45)",
              }}
            >
              <div className="flex items-center justify-between gap-5">
                <div className="min-w-0">
                  <h3
                    className="text-base font-semibold"
                    style={{ color: "var(--text)" }}
                  >
                    Themes & Channels
                  </h3>

                  <p
                    className="mt-2 max-w-2xl text-sm leading-6"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Manage the themes and channels used across your workspace.
                    Enable or disable existing options and add new ones when
                    needed.
                  </p>
                </div>

                <span
                  className="shrink-0 text-xl transition-transform duration-200 group-hover:translate-x-1"
                  style={{ color: "var(--primary)" }}
                  aria-hidden="true"
                >
                  →
                </span>
              </div>
            </Link>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
