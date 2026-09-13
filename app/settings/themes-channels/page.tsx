"use client";

import Link from "next/link";

import AppShell from "@/components/app-shell";
import { useEffect, useState } from "react";

type UserRole = "ADMIN" | "ANALYST" | "VIEWER";

type Theme = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  isActive: boolean;
  feedbackCount: number;
};

type Channel = {
  id: string;
  name: string;
  isActive: boolean;
};

type ApiResponse = {
  themes: Theme[];
  channels: Channel[];
};

type EditingItem =
  | {
      type: "theme";
      id: string;
      name: string;
      description: string;
      color: string;
    }
  | {
      type: "channel";
      id: string;
      name: string;
    }
  | null;

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(`Server returned an empty response (${response.status}).`);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Server returned an invalid response (${response.status}).`);
  }
}

function getApiError(data: unknown, fallback: string): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof data.error === "string"
  ) {
    return data.error;
  }

  return fallback;
}

export default function ThemesChannelsPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [role, setRole] = useState<UserRole>("VIEWER");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showThemeForm, setShowThemeForm] = useState(false);
  const [showChannelForm, setShowChannelForm] = useState(false);

  const [themeName, setThemeName] = useState("");
  const [themeDescription, setThemeDescription] = useState("");
  const [themeColor, setThemeColor] = useState("#6366f1");

  const [channelName, setChannelName] = useState("");

  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editingItem, setEditingItem] = useState<EditingItem>(null);

  const canManage = role === "ADMIN" || role === "ANALYST";

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [settingsResponse, sessionResponse] = await Promise.all([
        fetch("/api/themes-channels", { cache: "no-store" }),
        fetch("/api/auth/session", { cache: "no-store" }),
      ]);

      if (!settingsResponse.ok) {
        throw new Error("Failed to load themes and channels.");
      }

      const data = (await readJsonResponse(settingsResponse)) as unknown as ApiResponse;

      if (sessionResponse.ok) {
        const session = await readJsonResponse(sessionResponse);

        if (
          typeof session === "object" &&
          session !== null &&
          "user" in session &&
          typeof session.user === "object" &&
          session.user !== null &&
          "role" in session.user &&
          (session.user.role === "ADMIN" ||
            session.user.role === "ANALYST" ||
            session.user.role === "VIEWER")
        ) {
          setRole(session.user.role);
        }
      }

      setThemes(data.themes);
      setChannels(data.channels);
      setDirty(false);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load themes and channels."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  async function createTheme(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManage) return;

    clearMessages();
    setSaving(true);

    try {
      const response = await fetch("/api/themes-channels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "theme",
          name: themeName,
          description: themeDescription,
          color: themeColor,
        }),
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(getApiError(data, "Failed to create theme."));
      }

      setThemeName("");
      setThemeDescription("");
      setThemeColor("#6366f1");
      setShowThemeForm(false);
      setSuccess("Theme added successfully.");

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to create theme."
      );
    } finally {
      setSaving(false);
    }
  }

  async function createChannel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManage) return;

    clearMessages();
    setSaving(true);

    try {
      const response = await fetch("/api/themes-channels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "channel",
          name: channelName,
        }),
      });

      const data = await readJsonResponse(response);

      if (!response.ok) {
        throw new Error(getApiError(data, "Failed to create channel."));
      }

      setChannelName("");
      setShowChannelForm(false);
      setSuccess("Channel added successfully.");

      await loadData();
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to create channel."
      );
    } finally {
      setSaving(false);
    }
  }

  function toggleTheme(theme: Theme) {
    if (!canManage) return;
    clearMessages();
    setThemes((currentThemes) =>
      currentThemes.map((item) =>
        item.id === theme.id ? { ...item, isActive: !item.isActive } : item,
      ),
    );
    setDirty(true);
  }

  function toggleChannel(channel: Channel) {
    if (!canManage) return;
    clearMessages();
    setChannels((currentChannels) =>
      currentChannels.map((item) =>
        item.id === channel.id ? { ...item, isActive: !item.isActive } : item,
      ),
    );
    setDirty(true);
  }

  function saveThemeEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || editingItem?.type !== "theme") return;

    const updated = editingItem;
    setThemes((currentThemes) =>
      currentThemes.map((theme) =>
        theme.id === updated.id
          ? {
              ...theme,
              name: updated.name.trim(),
              description: updated.description.trim() || null,
              color: updated.color,
            }
          : theme,
      ),
    );
    setEditingItem(null);
    setDirty(true);
    setSuccess("Theme changes are ready to save.");
  }

  function saveChannelEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canManage || editingItem?.type !== "channel") return;

    const updated = editingItem;
    setChannels((currentChannels) =>
      currentChannels.map((channel) =>
        channel.id === updated.id
          ? { ...channel, name: updated.name.trim() }
          : channel,
      ),
    );
    setEditingItem(null);
    setDirty(true);
    setSuccess("Channel changes are ready to save.");
  }

  async function saveAllChanges() {
    if (!canManage || !dirty) return;

    clearMessages();
    setSaving(true);

    try {
      const response = await fetch("/api/themes-channels", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themes: themes.map((theme) => ({
            id: theme.id,
            name: theme.name,
            description: theme.description ?? "",
            color: theme.color ?? "#6366f1",
            isActive: theme.isActive,
          })),
          channels: channels.map((channel) => ({
            id: channel.id,
            name: channel.name,
            isActive: channel.isActive,
          })),
        }),
      });

      const data = await readJsonResponse(response);
      if (!response.ok) {
        throw new Error(
          getApiError(data, "Failed to save workspace settings."),
        );
      }

      setDirty(false);
      setSuccess("All theme and channel changes have been saved.");
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to save workspace settings.");
    } finally {
      setSaving(false);
    }
  }

  function startThemeEdit(theme: Theme) {
    setEditingItem({
      type: "theme",
      id: theme.id,
      name: theme.name,
      description: theme.description ?? "",
      color: theme.color ?? "#6366f1",
    });
    clearMessages();
  }

  function startChannelEdit(channel: Channel) {
    setEditingItem({
      type: "channel",
      id: channel.id,
      name: channel.name,
    });
    clearMessages();
  }

  return (
    <AppShell>
      <main className="min-h-screen bg-[#0b0b12] px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link
            href="/settings"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            <span aria-hidden="true">←</span>
            Back to Settings
          </Link>

          <p className="mb-2 text-sm font-medium text-violet-400">
            Workspace settings
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            Themes & Channels
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Control which themes and channels are available across your
            workspace. Disabled items are kept for historical feedback.
          </p>

          {canManage && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void saveAllChanges()}
                disabled={!dirty || saving}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "Applying..." : "Apply changes"}
              </button>

              <span className={`text-xs ${dirty ? "text-amber-300" : "text-zinc-500"}`}>
                {dirty ? "You have unsaved changes." : "All changes saved."}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {success}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-sm text-zinc-400">
            Loading themes and channels...
          </div>
        ) : (
          <div className="space-y-8">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="flex flex-col gap-4 border-b border-white/10 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Themes</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Organize feedback into meaningful customer topics.
                  </p>
                </div>

                {canManage && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowThemeForm((value) => !value);
                      setShowChannelForm(false);
                      clearMessages();
                    }}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
                  >
                    {showThemeForm ? "Cancel" : "+ Add Theme"}
                  </button>
                )}
              </div>

              {showThemeForm && canManage && (
                <form
                  onSubmit={createTheme}
                  className="border-b border-white/10 bg-white/[0.02] p-6"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="theme-name"
                        className="mb-2 block text-sm font-medium text-zinc-300"
                      >
                        Theme name
                      </label>

                      <input
                        id="theme-name"
                        value={themeName}
                        onChange={(event) => setThemeName(event.target.value)}
                        placeholder="e.g. Pricing"
                        required
                        maxLength={100}
                        className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="theme-color"
                        className="mb-2 block text-sm font-medium text-zinc-300"
                      >
                        Color
                      </label>

                      <div className="flex gap-3">
                        <input
                          id="theme-color"
                          type="color"
                          value={themeColor}
                          onChange={(event) =>
                            setThemeColor(event.target.value)
                          }
                          className="h-10 w-14 cursor-pointer rounded border border-white/10 bg-transparent"
                        />

                        <input
                          value={themeColor}
                          onChange={(event) =>
                            setThemeColor(event.target.value)
                          }
                          placeholder="#6366f1"
                          className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label
                        htmlFor="theme-description"
                        className="mb-2 block text-sm font-medium text-zinc-300"
                      >
                        Description
                      </label>

                      <textarea
                        id="theme-description"
                        value={themeDescription}
                        onChange={(event) =>
                          setThemeDescription(event.target.value)
                        }
                        placeholder="Describe what this theme represents."
                        maxLength={500}
                        rows={3}
                        className="w-full resize-none rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "Adding..." : "Add Theme"}
                    </button>
                  </div>
                </form>
              )}

              <div className="divide-y divide-white/10">
                {themes.map((theme) => (
                  <div
                    key={theme.id}
                    className={`flex flex-col gap-4 p-5 transition sm:flex-row sm:items-center sm:justify-between ${
                      theme.isActive ? "" : "opacity-55"
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-4">
                      <div
                        className="mt-1 h-3 w-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor: theme.color || "#6366f1",
                        }}
                      />

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-white">
                            {theme.name}
                          </h3>

                          {!theme.isActive && (
                            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                              Disabled
                            </span>
                          )}
                        </div>

                        {theme.description && (
                          <p className="mt-1 text-sm text-zinc-400">
                            {theme.description}
                          </p>
                        )}

                        <p className="mt-1 text-xs text-zinc-500">
                          {theme.feedbackCount} feedback{" "}
                          {theme.feedbackCount === 1 ? "record" : "records"}
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => startThemeEdit(theme)}
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
                        >
                          Edit
                        </button>
                      )}

                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={theme.isActive}
                          onChange={() => void toggleTheme(theme)}
                          disabled={!canManage}
                          className="h-4 w-4 accent-violet-500"
                        />

                        <span className="text-sm text-zinc-400">
                          {theme.isActive ? "Enabled" : "Disabled"}
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03]">
              <div className="flex flex-col gap-4 border-b border-white/10 p-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Channels</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Control the sources from which feedback can be added.
                  </p>
                </div>

                {canManage && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowChannelForm((value) => !value);
                      setShowThemeForm(false);
                      clearMessages();
                    }}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
                  >
                    {showChannelForm ? "Cancel" : "+ Add Channel"}
                  </button>
                )}
              </div>

              {showChannelForm && canManage && (
                <form
                  onSubmit={createChannel}
                  className="border-b border-white/10 bg-white/[0.02] p-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="flex-1">
                      <label
                        htmlFor="channel-name"
                        className="mb-2 block text-sm font-medium text-zinc-300"
                      >
                        Channel name
                      </label>

                      <input
                        id="channel-name"
                        value={channelName}
                        onChange={(event) =>
                          setChannelName(event.target.value)
                        }
                        placeholder="e.g. WhatsApp"
                        required
                        maxLength={100}
                        className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-violet-500"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={saving}
                        className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                      >
                        {saving ? "Adding..." : "Add Channel"}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="divide-y divide-white/10">
                {channels.map((channel) => (
                  <div
                    key={channel.id}
                    className={`flex flex-col gap-4 p-5 transition sm:flex-row sm:items-center sm:justify-between ${
                      channel.isActive ? "" : "opacity-55"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-violet-400" />

                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-white">
                          {channel.name}
                        </h3>

                        {!channel.isActive && (
                          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                            Disabled
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => startChannelEdit(channel)}
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-white/20 hover:bg-white/5 hover:text-white"
                        >
                          Edit
                        </button>
                      )}

                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={channel.isActive}
                          onChange={() => void toggleChannel(channel)}
                          disabled={!canManage}
                          className="h-4 w-4 accent-violet-500"
                        />

                        <span className="text-sm text-zinc-400">
                          {channel.isActive ? "Enabled" : "Disabled"}
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {editingItem && canManage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#12121b] p-6 shadow-2xl">
              <div className="mb-6">
                <h2 className="text-lg font-semibold">
                  Edit{" "}
                  {editingItem.type === "theme" ? "Theme" : "Channel"}
                </h2>

                <p className="mt-1 text-sm text-zinc-400">
                  Update this workspace item.
                </p>
              </div>

              {editingItem.type === "theme" ? (
                <form onSubmit={saveThemeEdit}>
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="edit-theme-name"
                        className="mb-2 block text-sm font-medium text-zinc-300"
                      >
                        Theme name
                      </label>

                      <input
                        id="edit-theme-name"
                        value={editingItem.name}
                        onChange={(event) =>
                          setEditingItem({
                            ...editingItem,
                            name: event.target.value,
                          })
                        }
                        required
                        maxLength={100}
                        className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="edit-theme-description"
                        className="mb-2 block text-sm font-medium text-zinc-300"
                      >
                        Description
                      </label>

                      <textarea
                        id="edit-theme-description"
                        value={editingItem.description}
                        onChange={(event) =>
                          setEditingItem({
                            ...editingItem,
                            description: event.target.value,
                          })
                        }
                        maxLength={500}
                        rows={3}
                        className="w-full resize-none rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="edit-theme-color"
                        className="mb-2 block text-sm font-medium text-zinc-300"
                      >
                        Color
                      </label>

                      <div className="flex gap-3">
                        <input
                          id="edit-theme-color"
                          type="color"
                          value={editingItem.color}
                          onChange={(event) =>
                            setEditingItem({
                              ...editingItem,
                              color: event.target.value,
                            })
                          }
                          className="h-10 w-14 cursor-pointer rounded border border-white/10 bg-transparent"
                        />

                        <input
                          value={editingItem.color}
                          onChange={(event) =>
                            setEditingItem({
                              ...editingItem,
                              color: event.target.value,
                            })
                          }
                          className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingItem(null)}
                      className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
                    >
                      {saving ? "Applying..." : "Apply changes"}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={saveChannelEdit}>
                  <div>
                    <label
                      htmlFor="edit-channel-name"
                      className="mb-2 block text-sm font-medium text-zinc-300"
                    >
                      Channel name
                    </label>

                    <input
                      id="edit-channel-name"
                      value={editingItem.name}
                      onChange={(event) =>
                        setEditingItem({
                          ...editingItem,
                          name: event.target.value,
                        })
                      }
                      required
                      maxLength={100}
                      className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500"
                    />
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingItem(null)}
                      className="rounded-lg border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/5"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
      </main>
    </AppShell>
  );
}