"use client";

import { useEffect, useState } from "react";

import AppShell from "@/components/app-shell";

type Integration = {
  id: string;
  workspaceId: string;
  createdAt: string;
};

type IntegrationResponse = {
  message?: string;
  integration?: Integration & {
    webhookSecret?: string;
  };
  error?: string;
};

type FormResponse = {
  message?: string;
  form?: {
    formUrl: string;
    editUrl: string;
    sheetUrl: string;
    csvUrl: string;
    formId?: string;
    spreadsheetId?: string;
    csvFileId?: string;
  };
  error?: string;
};

export default function GoogleFormIntegrationPage() {
  const [integration, setIntegration] =
    useState<Integration | null>(null);

  const [loadingIntegration, setLoadingIntegration] =
    useState(true);

  const [integrationLoading, setIntegrationLoading] =
    useState(false);

  const [formLoading, setFormLoading] =
    useState(false);

  const [formTitle, setFormTitle] =
    useState("LOOP Customer Feedback");

  const [integrationError, setIntegrationError] =
    useState<string | null>(null);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [formResult, setFormResult] =
    useState<FormResponse["form"] | null>(null);

  const [newSecret, setNewSecret] =
    useState<string | null>(null);

  const [copied, setCopied] =
    useState<string | null>(null);

  useEffect(() => {
    async function loadIntegration() {
      try {
        const response = await fetch(
          "/api/integrations/google-form",
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data =
          (await response.json()) as IntegrationResponse;

        if (!response.ok) {
          if (response.status === 404) {
            setIntegration(null);
          } else {
            setIntegrationError(
              data.error ||
                "Failed to load Google Form integration."
            );
          }

          return;
        }

        setIntegration(data.integration || null);
      } catch {
        setIntegrationError(
          "Unable to connect to the LOOP server."
        );
      } finally {
        setLoadingIntegration(false);
      }
    }

    void loadIntegration();
  }, []);

  async function createIntegration() {
    setIntegrationLoading(true);
    setIntegrationError(null);
    setNewSecret(null);
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
        setIntegrationError(
          data.error ||
            "Failed to create Google Form integration."
        );
        return;
      }

      if (data.integration) {
        setIntegration({
          id: data.integration.id,
          workspaceId: data.integration.workspaceId,
          createdAt: data.integration.createdAt,
        });

        setNewSecret(
          data.integration.webhookSecret || null
        );
      }
    } catch {
      setIntegrationError(
        "Unable to connect to the LOOP server."
      );
    } finally {
      setIntegrationLoading(false);
    }
  }

  async function createGoogleForm() {
    setFormLoading(true);
    setFormError(null);
    setFormResult(null);
    setCopied(null);

    try {
      const response = await fetch(
        "/api/integrations/google-form/create-form",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: formTitle,
          }),
        }
      );

      const data =
        (await response.json()) as FormResponse;

      if (!response.ok) {
        setFormError(
          data.error ||
            "Failed to create Google Form."
        );
        return;
      }

      setFormResult(data.form || null);
    } catch {
      setFormError(
        "Unable to connect to the LOOP server."
      );
    } finally {
      setFormLoading(false);
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

          {integrationError && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-800">
                {integrationError}
              </p>
            </div>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Workspace integration
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                LOOP uses a secure workspace-specific integration
                so Google Form submissions are connected to the
                correct workspace.
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-purple-100 bg-purple-50 p-4">
              <p className="text-sm font-medium text-purple-900">
                Security
              </p>

              <p className="mt-1 text-sm leading-6 text-purple-800">
                The webhook secret is kept on the LOOP server and
                is never sent to the browser when creating a Google
                Form.
              </p>
            </div>

            {loadingIntegration ? (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-600">
                  Checking workspace integration...
                </p>
              </div>
            ) : !integration ? (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={createIntegration}
                  disabled={integrationLoading}
                  className="rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {integrationLoading
                    ? "Creating integration..."
                    : "Create Google Form integration"}
                </button>
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-semibold text-green-900">
                    Google Form integration is ready
                  </p>

                  <p className="mt-1 text-sm leading-6 text-green-800">
                    Your workspace is connected and ready to create
                    a Google Form.
                  </p>
                </div>

                {newSecret && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900">
                      Webhook secret created
                    </p>

                    <p className="mt-1 text-sm leading-6 text-amber-800">
                      This secret was generated now. Save it securely
                      if you need it for a separate manual integration.
                      It will not be displayed again after this page
                      is refreshed.
                    </p>

                    <div className="mt-4">
                      <label
                        htmlFor="webhookSecret"
                        className="block text-sm font-medium text-amber-900"
                      >
                        Webhook Secret
                      </label>

                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          id="webhookSecret"
                          value={newSecret}
                          readOnly
                          type="text"
                          className="min-w-0 flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2.5 font-mono text-sm text-slate-700 outline-none"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            copyValue(
                              newSecret,
                              "secret"
                            )
                          }
                          className="rounded-lg border border-amber-300 bg-white px-4 py-2.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
                        >
                          {copied === "secret"
                            ? "Copied"
                            : "Copy"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="formTitle"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Google Form title
                  </label>

                  <input
                    id="formTitle"
                    type="text"
                    value={formTitle}
                    onChange={(event) =>
                      setFormTitle(event.target.value)
                    }
                    maxLength={200}
                    placeholder="LOOP Customer Feedback"
                    className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Enter the name customers will see for the
                    Google Form.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={createGoogleForm}
                  disabled={
                    formLoading ||
                    !formTitle.trim()
                  }
                  className="rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {formLoading
                    ? "Creating Google Form..."
                    : "Create Google Form"}
                </button>

                {formError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-800">
                      {formError}
                    </p>
                  </div>
                )}

                {formResult && (
                  <div className="space-y-5 rounded-xl border border-green-200 bg-green-50 p-5">
                    <div>
                      <h3 className="text-base font-semibold text-green-900">
                        Google Form created successfully
                      </h3>

                      <p className="mt-1 text-sm leading-6 text-green-800">
                        Your Google Form is now connected to this
                        LOOP workspace. Customer submissions will be
                        sent to the LOOP feedback system.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="formUrl"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Customer Form URL
                      </label>

                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          id="formUrl"
                          value={formResult.formUrl}
                          readOnly
                          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            copyValue(
                              formResult.formUrl,
                              "form"
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {copied === "form"
                            ? "Copied"
                            : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="editUrl"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Google Form Edit URL
                      </label>

                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          id="editUrl"
                          value={formResult.editUrl}
                          readOnly
                          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            copyValue(
                              formResult.editUrl,
                              "edit"
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {copied === "edit"
                            ? "Copied"
                            : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="sheetUrl"
                        className="block text-sm font-medium text-slate-700"
                      >
                        Response Spreadsheet URL
                      </label>

                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          id="sheetUrl"
                          value={formResult.sheetUrl}
                          readOnly
                          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            copyValue(
                              formResult.sheetUrl,
                              "sheet"
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {copied === "sheet"
                            ? "Copied"
                            : "Copy"}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="csvUrl"
                        className="block text-sm font-medium text-slate-700"
                      >
                        CSV File URL
                      </label>

                      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                        <input
                          id="csvUrl"
                          value={formResult.csvUrl}
                          readOnly
                          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            copyValue(
                              formResult.csvUrl,
                              "csv"
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {copied === "csv"
                            ? "Copied"
                            : "Copy"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </AppShell>
  );
}