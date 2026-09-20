"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
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
    label: "Feedback Studio",
    href: "/feedback-studio",
    available: true,
  },
  {
    label: "Team",
    href: "/team",
    available: true,
  },
  {
    label: "Google Form",
    href: "/integrations/google-form",
    available: true,
  },
  {
    label: "Trends",
    href: "/trends",
    available: true,
  },
  {
    label: "Ask LOOP",
    href: "/ask-loop",
    available: true,
  },
  {
    label: "Reports",
    href: "/reports",
    available: false,
  },
  {
    label: "Settings",
    href: "/settings",
    available: true,
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
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <header
        className="border-b"
        style={{
          backgroundColor: "var(--sidebar-bg)",
          borderColor: "rgba(174, 183, 198, 0.2)",
        }}
      >
        <div className="flex min-h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard"
              className="shrink-0 text-sm font-semibold tracking-[0.28em] transition-opacity hover:opacity-80"
              style={{
                color: "var(--sidebar-text)",
              }}
            >
              LOOP
            </Link>

            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/login" })}
              aria-label="Log out"
              title="Log out"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-opacity hover:opacity-70"
              style={{
                color: "var(--sidebar-muted)",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M13 5v14" />
                <path d="M13 5h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5" />
                <path d="M3 12h10" />
                <path d="m7 8 4 4-4 4" />
              </svg>
            </button>
          </div>

          <div className="min-w-0 text-right">
            <p
              className="truncate text-[11px] font-medium"
              style={{
                color: "var(--sidebar-text)",
              }}
            >
              {workspaceName}
              <span
                className="px-1.5"
                style={{
                  color: "var(--sidebar-muted)",
                }}
              >
                /
              </span>
              Workspace
            </p>

            <p
              className="truncate text-[9px]"
              style={{
                color: "var(--sidebar-muted)",
              }}
            >
              {userName || getRoleLabel(role)}
              {userName && role ? ` · ${getRoleLabel(role)}` : ""}
            </p>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col lg:flex-row">
        <aside
          className="w-full shrink-0 border-b lg:sticky lg:top-0 lg:flex lg:h-[calc(100vh-3.5rem)] lg:w-56 lg:flex-col lg:border-b-0 lg:border-r"
          style={{
            backgroundColor: "var(--sidebar-bg)",
            borderColor: "rgba(174, 183, 198, 0.2)",
          }}
        >
          <nav className="flex gap-1 overflow-x-auto px-3 py-3 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:px-3 lg:py-5">
            {navigationItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(`${item.href}/`));

              if (!item.available) {
                return (
                  <div
                    key={item.label}
                    className="flex shrink-0 items-center rounded-md px-3 py-2 text-[10px] lg:w-full"
                    title="Coming soon"
                    style={{
                      color: "rgba(174, 183, 198, 0.5)",
                    }}
                  >
                    <span>{item.label}</span>

                    <span
                      className="ml-auto hidden text-[8px] uppercase tracking-wider lg:inline"
                      style={{
                        color: "rgba(174, 183, 198, 0.4)",
                      }}
                    >
                      Soon
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex shrink-0 items-center rounded-md px-3 py-2 text-[10px] font-medium transition-colors lg:w-full"
                  style={
                    isActive
                      ? {
                          backgroundColor: "var(--primary)",
                          color: "#FFFFFF",
                        }
                      : {
                          color: "var(--sidebar-muted)",
                        }
                  }
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="shrink-0 px-3 pb-4">
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center rounded-md border px-3 py-2 text-left text-[10px] font-medium transition-colors"
              style={{
                borderColor: "rgba(174, 183, 198, 0.2)",
                backgroundColor: "rgba(15, 26, 43, 0.45)",
                color: "var(--sidebar-muted)",
              }}
            >
              <span>Log out</span>
            </button>
          </div>
        </aside>

        <main
          className="min-w-0 flex-1"
          style={{
            backgroundColor: "var(--bg)",
            color: "var(--text)",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}