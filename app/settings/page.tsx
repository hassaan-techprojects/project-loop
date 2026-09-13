import Link from "next/link";

import AppShell from "@/components/app-shell";

export default function SettingsPage() {
  return (
    <AppShell>
      <main className="min-h-screen bg-[#0b0b12] px-6 py-10 text-white">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <p className="mb-2 text-sm font-medium text-violet-400">
              Workspace
            </p>
            <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Manage your workspace configuration and preferences.
            </p>
          </div>

          <section>
            <h2 className="mb-4 text-lg font-semibold">Workspace settings</h2>
            <Link
              href="/settings/themes-channels"
              className="group block rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-violet-500/40 hover:bg-white/[0.05]"
            >
              <div className="flex items-center justify-between gap-6">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Themes & Channels
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                    Manage the themes and channels used across your workspace.
                    Enable or disable existing options and add new ones when
                    needed.
                  </p>
                </div>
                <span className="shrink-0 text-xl text-zinc-500 transition group-hover:translate-x-1 group-hover:text-violet-400">
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
