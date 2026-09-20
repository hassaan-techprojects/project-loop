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

type NavigationIcon =
  | "overview"
  | "feedback"
  | "import"
  | "studio"
  | "team"
  | "google"
  | "trends"
  | "ask"
  | "reports"
  | "settings";

const navigationItems: {
  label: string;
  href: string;
  available: boolean;
  icon: NavigationIcon;
}[] = [
  {
    label: "Overview",
    href: "/dashboard",
    available: true,
    icon: "overview",
  },
  {
    label: "Feedback",
    href: "/feedback",
    available: true,
    icon: "feedback",
  },
  {
    label: "Import Feedback",
    href: "/import-feedback",
    available: true,
    icon: "import",
  },
  {
    label: "Feedback Studio",
    href: "/feedback-studio",
    available: true,
    icon: "studio",
  },
  {
    label: "Team",
    href: "/team",
    available: true,
    icon: "team",
  },
  {
    label: "Google Form",
    href: "/integrations/google-form",
    available: true,
    icon: "google",
  },
  {
    label: "Trends",
    href: "/trends",
    available: true,
    icon: "trends",
  },
  {
    label: "Ask LOOP",
    href: "/ask-loop",
    available: true,
    icon: "ask",
  },
  {
    label: "Reports",
    href: "/reports",
    available: false,
    icon: "reports",
  },
  {
    label: "Settings",
    href: "/settings",
    available: true,
    icon: "settings",
  },
];

function getRoleLabel(role: Role | null) {
  if (role === "ADMIN") return "Admin";
  if (role === "ANALYST") return "Analyst";
  if (role === "VIEWER") return "Viewer";

  return "Workspace";
}

function NavigationIcon({ icon }: { icon: NavigationIcon }) {
  const commonProps = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (icon) {
    case "overview":
      return (
        <svg {...commonProps}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );

    case "feedback":
      return (
        <svg {...commonProps}>
          <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H8l-4 2v-5.2A7.5 7.5 0 1 1 20 11.5Z" />
          <path d="M8 11h.01" />
          <path d="M12 11h.01" />
          <path d="M16 11h.01" />
        </svg>
      );

    case "import":
      return (
        <svg {...commonProps}>
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 20h14" />
        </svg>
      );

    case "studio":
      return (
        <svg {...commonProps}>
          <path d="M4 18V9" />
          <path d="M10 18V5" />
          <path d="M16 18v-7" />
          <path d="M22 18V7" />
          <path d="M2 21h20" />
        </svg>
      );

    case "team":
      return (
        <svg {...commonProps}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20a6 6 0 0 1 12 0" />
          <circle cx="17" cy="9" r="2.5" />
          <path d="M16 14.5a5 5 0 0 1 5 5" />
        </svg>
      );

    case "google":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5h6" />
          <path d="M18 7.5v4h-6" />
          <path d="M12 12h6" />
          <path d="M7.5 17.5A8.5 8.5 0 0 1 12 3.5" />
        </svg>
      );

    case "trends":
      return (
        <svg {...commonProps}>
          <path d="M4 18 9 13l4 3 7-8" />
          <path d="M15 8h5v5" />
        </svg>
      );

    case "ask":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M9.5 9.5a2.7 2.7 0 0 1 5 1.4c0 1.8-2.5 2.2-2.5 4" />
          <path d="M12 18h.01" />
        </svg>
      );

    case "reports":
      return (
        <svg {...commonProps}>
          <path d="M6 3h9l4 4v14H6z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6" />
          <path d="M9 17h6" />
        </svg>
      );

    case "settings":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V20h-2.6v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4v-2.6h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L7 6.6l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V5h2.6v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1h.1v2.6h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      );
  }
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
                    <span className="mr-2 shrink-0 opacity-70">
                      <NavigationIcon icon={item.icon} />
                    </span>

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
                  <span className="mr-2 shrink-0">
                    <NavigationIcon icon={item.icon} />
                  </span>

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