"use client";

import { FormEvent, useEffect, useState } from "react";

type Role = "ADMIN" | "ANALYST" | "VIEWER";

type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
};

type TeamResponse = {
  members?: Member[];
  error?: string;
};

type SessionResponse = {
  user?: {
    id?: string;
    name?: string | null;
    role?: Role;
  } | null;
};

function roleLabel(role: Role) {
  if (role === "ADMIN") return "Admin";
  if (role === "ANALYST") return "Analyst";
  return "Viewer";
}

function roleClass(role: Role) {
  if (role === "ADMIN") {
    return "border-indigo-500/30 bg-indigo-500/10 text-indigo-300";
  }

  if (role === "ANALYST") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  return "border-slate-600 bg-slate-800/60 text-slate-300";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"ANALYST" | "VIEWER">("ANALYST");

  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(
    null
  );
  const [roleUpdateError, setRoleUpdateError] = useState("");

  const isAdmin =
    members.some(
      (member) => member.id === currentUserId && member.role === "ADMIN"
    );

  async function loadTeam() {
    try {
      setLoading(true);
      setError("");

      const [sessionResponse, teamResponse] = await Promise.all([
        fetch("/api/auth/session", {
          cache: "no-store",
        }),
        fetch("/api/team", {
          cache: "no-store",
        }),
      ]);

      const sessionData =
        (await sessionResponse.json()) as SessionResponse;

      const teamData = (await teamResponse.json()) as TeamResponse;

      if (!teamResponse.ok) {
        throw new Error(
          teamData.error || "Failed to load team members."
        );
      }

      setCurrentUserId(sessionData.user?.id ?? "");
      setMembers(teamData.members ?? []);
    } catch (requestError) {
      console.error(requestError);

      setMembers([]);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load team members."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTeam();
  }, []);

  function resetCreateForm() {
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setNewRole("ANALYST");
    setCreateError("");
  }

  function closeCreateForm() {
    if (createLoading) return;

    setShowCreateForm(false);
    setCreateError("");
    setCreateSuccess("");
    resetCreateForm();
  }

  async function handleCreateMember(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    try {
      setCreateLoading(true);
      setCreateError("");
      setCreateSuccess("");

      const response = await fetch("/api/team", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          password: newPassword,
          role: newRole,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create team member."
        );
      }

      setCreateSuccess("Team member created successfully.");

      resetCreateForm();

      await loadTeam();

      window.setTimeout(() => {
        setShowCreateForm(false);
        setCreateSuccess("");
      }, 900);
    } catch (requestError) {
      console.error(requestError);

      setCreateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to create team member."
      );
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleRoleChange(memberId: string, role: Role) {
    try {
      setUpdatingMemberId(memberId);
      setRoleUpdateError("");

      const response = await fetch("/api/team", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: memberId,
          role,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update member role."
        );
      }

      await loadTeam();
    } catch (requestError) {
      console.error(requestError);

      setRoleUpdateError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update member role."
      );
    } finally {
      setUpdatingMemberId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#030712] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1200px]">
        <section className="mb-4 rounded-xl border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-950 to-indigo-950/40 px-5 py-5 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                Workspace Access
              </div>

              <h1 className="font-serif text-2xl text-white sm:text-3xl">
                Team
              </h1>

              <p className="mt-1 max-w-2xl text-[10px] leading-4 text-slate-400 sm:text-[11px]">
                Manage the people who have access to this workspace and
                control their roles.
              </p>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(true);
                  setCreateError("");
                  setCreateSuccess("");
                }}
                className="inline-flex h-9 items-center justify-center rounded-md bg-white px-4 text-[10px] font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                + Add Member
              </button>
            )}
          </div>
        </section>

        {showCreateForm && isAdmin && (
          <section className="mb-4 rounded-xl border border-indigo-500/20 bg-[#0a1222]/95 p-4 shadow-2xl shadow-black/20">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-indigo-300">
                  New Member
                </p>

                <h2 className="mt-1 text-sm font-semibold text-white">
                  Add someone to this workspace
                </h2>

                <p className="mt-1 text-[10px] leading-4 text-slate-500">
                  Create login credentials and assign an Analyst or Viewer
                  role.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateForm}
                disabled={createLoading}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-[9px] font-medium text-slate-400 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Close
              </button>
            </div>

            {createError && (
              <div className="mb-4 rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2">
                <p className="text-[10px] text-rose-300">
                  {createError}
                </p>
              </div>
            )}

            {createSuccess && (
              <div className="mb-4 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                <p className="text-[10px] text-emerald-300">
                  {createSuccess}
                </p>
              </div>
            )}

            <form
              onSubmit={handleCreateMember}
              className="grid gap-3 md:grid-cols-2"
            >
              <div>
                <label className="mb-1 block text-[9px] font-medium uppercase tracking-[0.12em] text-slate-500">
                  Name
                </label>

                <input
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="Member name"
                  required
                  className="h-9 w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 text-[10px] text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-[9px] font-medium uppercase tracking-[0.12em] text-slate-500">
                  Email
                </label>

                <input
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  placeholder="member@company.com"
                  required
                  className="h-9 w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 text-[10px] text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-[9px] font-medium uppercase tracking-[0.12em] text-slate-500">
                  Temporary Password
                </label>

                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(event.target.value)
                  }
                  placeholder="At least 8 characters"
                  minLength={8}
                  required
                  className="h-9 w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 text-[10px] text-slate-200 outline-none transition placeholder:text-slate-600 focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-[9px] font-medium uppercase tracking-[0.12em] text-slate-500">
                  Role
                </label>

                <select
                  value={newRole}
                  onChange={(event) =>
                    setNewRole(
                      event.target.value as "ANALYST" | "VIEWER"
                    )
                  }
                  className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-[10px] text-slate-300 outline-none focus:border-indigo-500/60"
                >
                  <option value="ANALYST">Analyst</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 md:col-span-2">
                <button
                  type="button"
                  onClick={closeCreateForm}
                  disabled={createLoading}
                  className="h-9 rounded-md border border-slate-700 bg-slate-900 px-4 text-[10px] font-semibold text-slate-400 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={createLoading}
                  className="h-9 rounded-md bg-white px-4 text-[10px] font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createLoading ? "Creating..." : "Create Member"}
                </button>
              </div>
            </form>
          </section>
        )}

        {roleUpdateError && (
          <div className="mb-4 rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-2">
            <p className="text-[10px] text-rose-300">
              {roleUpdateError}
            </p>
          </div>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-800 bg-[#0a1222]/95 shadow-2xl shadow-black/20">
          <div className="border-b border-slate-800 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-[11px] font-semibold text-slate-200">
                  Workspace Members
                </h2>

                <p className="mt-1 text-[9px] text-slate-500">
                  {members.length}{" "}
                  {members.length === 1 ? "member" : "members"} in this
                  workspace.
                </p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400" />

                <p className="text-[11px] text-slate-500">
                  Loading team...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex min-h-[320px] items-center justify-center px-6">
              <div className="max-w-md rounded-lg border border-rose-500/20 bg-rose-500/5 p-5 text-center">
                <p className="text-sm font-semibold text-rose-300">
                  Unable to load team
                </p>

                <p className="mt-1 text-[11px] text-slate-500">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => void loadTeam()}
                  className="mt-4 rounded-md border border-slate-700 bg-slate-900 px-4 py-2 text-[10px] font-semibold text-slate-300 transition hover:border-slate-600 hover:text-white"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="px-4 py-3 text-left text-[8px] font-medium uppercase tracking-[0.12em] text-slate-500">
                        Member
                      </th>

                      <th className="px-4 py-3 text-left text-[8px] font-medium uppercase tracking-[0.12em] text-slate-500">
                        Email
                      </th>

                      <th className="px-4 py-3 text-left text-[8px] font-medium uppercase tracking-[0.12em] text-slate-500">
                        Role
                      </th>

                      <th className="px-4 py-3 text-left text-[8px] font-medium uppercase tracking-[0.12em] text-slate-500">
                        Joined
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {members.map((member) => {
                      const isCurrentUser = member.id === currentUserId;
                      const canEditRole =
                        isAdmin && !isCurrentUser;

                      return (
                        <tr
                          key={member.id}
                          className="border-b border-slate-800/80 last:border-b-0"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-indigo-500/20 bg-indigo-500/10 text-[9px] font-semibold text-indigo-300">
                                {getInitials(member.name)}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-[10px] font-medium text-slate-200">
                                  {member.name}
                                  {isCurrentUser && (
                                    <span className="ml-2 text-[8px] text-slate-600">
                                      You
                                    </span>
                                  )}
                                </p>

                                <p className="text-[8px] text-slate-600">
                                  Workspace member
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-[10px] text-slate-400">
                            {member.email}
                          </td>

                          <td className="px-4 py-3">
                            {canEditRole ? (
                              <select
                                value={member.role}
                                disabled={
                                  updatingMemberId === member.id
                                }
                                onChange={(event) =>
                                  void handleRoleChange(
                                    member.id,
                                    event.target.value as Role
                                  )
                                }
                                className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-[9px] text-slate-300 outline-none focus:border-indigo-500/60 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="ADMIN">Admin</option>
                                <option value="ANALYST">Analyst</option>
                                <option value="VIEWER">Viewer</option>
                              </select>
                            ) : (
                              <span
                                className={`inline-flex rounded-full border px-2.5 py-1 text-[8px] font-medium ${roleClass(
                                  member.role
                                )}`}
                              >
                                {roleLabel(member.role)}
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-[9px] text-slate-500">
                            {formatDate(member.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-800/80 md:hidden">
                {members.map((member) => {
                  const isCurrentUser = member.id === currentUserId;
                  const canEditRole =
                    isAdmin && !isCurrentUser;

                  return (
                    <div key={member.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-indigo-500/20 bg-indigo-500/10 text-[9px] font-semibold text-indigo-300">
                          {getInitials(member.name)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[10px] font-medium text-slate-200">
                              {member.name}
                            </p>

                            {isCurrentUser && (
                              <span className="text-[8px] text-slate-600">
                                You
                              </span>
                            )}

                            {!canEditRole && (
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[7px] font-medium ${roleClass(
                                  member.role
                                )}`}
                              >
                                {roleLabel(member.role)}
                              </span>
                            )}
                          </div>

                          <p className="mt-1 truncate text-[9px] text-slate-500">
                            {member.email}
                          </p>

                          <p className="mt-1 text-[8px] text-slate-600">
                            Joined {formatDate(member.createdAt)}
                          </p>

                          {canEditRole && (
                            <select
                              value={member.role}
                              disabled={
                                updatingMemberId === member.id
                              }
                              onChange={(event) =>
                                void handleRoleChange(
                                  member.id,
                                  event.target.value as Role
                                )
                              }
                              className="mt-3 h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-[9px] text-slate-300 outline-none focus:border-indigo-500/60 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="ADMIN">Admin</option>
                              <option value="ANALYST">Analyst</option>
                              <option value="VIEWER">Viewer</option>
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

