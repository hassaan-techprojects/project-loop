"use client";

import Link from "next/link";
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
    label: "Team",
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
        <div className="flex min-h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/dashboard"
            className="shrink-0 text-sm font-semibold tracking-[0.28em] text-white transition hover:text-slate-300"
          >
            LOOP
          </Link>

          <div className="min-w-0 text-right">
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
        <aside className="w-full shrink-0 border-b border-slate-800 bg-[#070b14] lg:w-56 lg:border-b-0 lg:border-r">
          <nav className="flex gap-1 overflow-x-auto px-3 py-3 lg:sticky lg:top-0 lg:flex-col lg:px-3 lg:py-5">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;

              if (!item.available) {
                return (
                  <div
                    key={item.label}
                    className="flex shrink-0 items-center rounded-md px-3 py-2 text-[10px] text-slate-600 lg:w-full"
                    title="Coming soon"
                  >
                    <span>{item.label}</span>
                    <span className="ml-auto hidden text-[8px] uppercase tracking-wider text-slate-700 lg:inline">
                      Soon
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex shrink-0 items-center rounded-md px-3 py-2 text-[10px] font-medium transition lg:w-full ${
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
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}