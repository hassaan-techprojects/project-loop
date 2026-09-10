"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

type Role = "ADMIN" | "ANALYST" | "VIEWER";

type SessionResponse = {
  user?: {
    name?: string | null;
    role?: Role;
    workspaceId?: string;
  } | null;
};

type WorkspaceResponse = {
  workspace?: {
    name: string;
  };
  error?: string;
};

type AppShellProps = {
  children: ReactNode;
};

const navigationItems = [
  {
    label: "Overview",
    href: "/dashboard",
    available: true,
  },
  {
    label: "Feedback",
    href: "/feedback",
    available: true,
  },
  {
    label: "Import Feedback",
    href: "/import-feedback",
    available: true,
  },
  {
    label: "Google Form",
    href: "/integrations/google-form",
    available: true,
  },
  {
    label: "Team & Roles",
    href: "/team",
    available: true,
  },
  {
    label: "Trends",
    href: "/trends",
    available: false,
  },
  {
    label: "Ask LOOP",
    href: "/ask-loop",
    available: false,
  },
  {
    label: "Reports",
    href: "/reports",
    available: false,
  },
  {
    label: "Settings",
    href: "/settings",
    available: false,
  },
];

function getRoleLabel(role: Role | null) {
  if (role === "ADMIN") return "Admin";
  if (role === "ANALYST") return "Analyst";
  if (role === "VIEWER") return "Viewer";

  return "Workspace";
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  const [workspaceName, setWorkspaceName] = useState("Workspace");
  const [userName, setUserName] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      try {
        const sessionResponse = await fetch("/api/auth/session", {
          cache: "no-store",
        });

        if (!sessionResponse.ok) {
          return;
        }

        const sessionData =
          (await sessionResponse.json()) as SessionResponse;

        if (cancelled) return;

        setUserName(sessionData.user?.name ?? "");
        setRole(sessionData.user?.role ?? null);

        const workspaceResponse = await fetch("/api/workspace", {
          cache: "no-store",
        });

        if (!workspaceResponse.ok) {
          return;
        }

        const workspaceData =
          (await workspaceResponse.json()) as WorkspaceResponse;

        if (cancelled) return;

        if (workspaceData.workspace?.name) {
          setWorkspaceName(workspaceData.workspace.name);
        }
      } catch (error) {
        console.error("Application shell loading error:", error);
      }
    }

    void loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#030712] text-white">
      <header className="border-b border-slate-800 bg-[#080d18]">
        <div className="relative flex min-h-14 items-center px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={
              menuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={menuOpen}
            className="absolute left-4 top-3 z-50 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 transition hover:bg-slate-800 sm:left-6 lg:left-8"
          >
            {menuOpen ? (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>

          <Link
            href="/dashboard"
            className="ml-14 shrink-0 text-sm font-semibold tracking-[0.28em] text-white transition hover:text-slate-300 sm:ml-16"
          >
            LOOP
          </Link>

          <div className="ml-auto min-w-0 text-right">
            <p className="truncate text-[11px] font-medium text-slate-200">
              {workspaceName}
              <span className="px-1.5 text-slate-600">/</span>
              Workspace
            </p>

            <p className="truncate text-[9px] text-slate-500">
              {userName || getRoleLabel(role)}
              {userName && role ? ` · ${getRoleLabel(role)}` : ""}
            </p>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
        {menuOpen && (
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-30 bg-black/50"
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-800 bg-[#070b14] pt-14 shadow-2xl transition-transform duration-200 ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Navigation
            </span>

            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close navigation menu"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-900 hover:text-white"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>

          <nav className="flex max-h-[calc(100vh-8rem)] flex-col gap-1 overflow-y-auto px-3 py-5">
            {navigationItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(`${item.href}/`));

              if (!item.available) {
                return (
                  <div
                    key={item.label}
                    className="flex w-full items-center rounded-md px-3 py-2 text-[10px] text-slate-600"
                    title="Coming soon"
                  >
                    <span>{item.label}</span>

                    <span className="ml-auto text-[8px] uppercase tracking-wider text-slate-700">
                      Soon
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex w-full items-center rounded-md px-3 py-2 text-[10px] font-medium transition ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                  }`}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 border-t border-slate-800 bg-[#070b14] px-3 py-4">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                void signOut({ callbackUrl: "/login" });
              }}
              className="flex w-full items-center rounded-md px-3 py-2 text-[10px] font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
            >
              <svg
                className="mr-2 h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M13 5V4a1 1 0 011-1h5a2 2 0 012 2v14a2 2 0 01-2 2h-5a1 1 0 01-1-1v-1" />
              </svg>

              <span>Log out</span>
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}