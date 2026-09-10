"use client";

import { useState } from "react";

import AppShell from "@/components/app-shell";

type IntegrationResponse = {
  message?: string;
  integration?: {
    id: string;
    workspaceId: string;
    webhookSecret: string;
    createdAt: string;
  };
  error?: string;
};

export default function GoogleFormIntegrationPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IntegrationResponse | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function createIntegration() {
    setLoading(true);
    setResult(null);
    setCopied(null);

    try {
      const response = await fetch(
        "/api/integrations/google-form",
        {
          method: "POST",
        }
      );

      const data =
        (await response.json()) as IntegrationResponse;

      if (!response.ok) {
        setResult({
          error:
            data.error ||
            "Failed to create Google Form integration.",
        });
        return;
      }

      setResult(data);
    } catch {
      setResult({
        error:
          "Unable to connect to the LOOP server.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function copyValue(
    value: string,
    type: string
  ) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(type);

      window.setTimeout(() => {
        setCopied(null);
      }, 2000);
    } catch {
      setCopied(null);
    }
  }

  return (
    <AppShell>
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-purple-600">
            Integrations
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            Google Form Integration
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Connect a Google Form to LOOP so customer responses
            can be automatically added to your workspace feedback.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Workspace integration
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Create a secure integration for the currently
              signed-in workspace. The integration secret is
              generated securely by LOOP.
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-purple-100 bg-purple-50 p-4">
            <p className="text-sm font-medium text-purple-900">
              Important
            </p>

            <p className="mt-1 text-sm leading-6 text-purple-800">
              The webhook secret is private. Do not share it
              publicly or commit it to GitHub.
            </p>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={createIntegration}
              disabled={loading || Boolean(result?.integration)}
              className="rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Creating integration..."
                : result?.integration
                  ? "Integration created"
                  : "Create Google Form integration"}
            </button>
          </div>

          {result?.error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">
                {result.error}
              </p>
            </div>
          )}

          {result?.integration && (
            <div className="mt-8 space-y-5">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Integration created successfully
                </h3>

                <p className="mt-1 text-sm text-slate-600">
                  Save the values below. The webhook secret is
                  displayed here only because it was just generated.
                </p>
              </div>

              <div>
                <label
                  htmlFor="workspaceId"
                  className="block text-sm font-medium text-slate-700"
                >
                  Workspace ID
                </label>

                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    id="workspaceId"
                    value={result.integration.workspaceId}
                    readOnly
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-700 outline-none"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      copyValue(
                        result.integration!.workspaceId,
                        "workspace"
                      )
                    }
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {copied === "workspace"
                      ? "Copied"
                      : "Copy"}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="webhookSecret"
                  className="block text-sm font-medium text-slate-700"
                >
                  Webhook Secret
                </label>

                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    id="webhookSecret"
                    value={result.integration.webhookSecret}
                    readOnly
                    type="text"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-700 outline-none"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      copyValue(
                        result.integration!.webhookSecret,
                        "secret"
                      )
                    }
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {copied === "secret"
                      ? "Copied"
                      : "Copy"}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="apiUrl"
                  className="block text-sm font-medium text-slate-700"
                >
                  LOOP Google Form API URL
                </label>

                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    id="apiUrl"
                    value="/api/feedback/google-form"
                    readOnly
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 font-mono text-sm text-slate-700 outline-none"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      copyValue(
                        "/api/feedback/google-form",
                        "api"
                      )
                    }
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {copied === "api"
                      ? "Copied"
                      : "Copy"}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">
                  Keep this secret safe
                </p>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  You will use the Workspace ID and Webhook Secret
                  in your Google Apps Script configuration. If you
                  lose the secret, we will add a secure rotate-secret
                  option rather than exposing the stored secret again.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
      </main>
    </AppShell>
  );
}