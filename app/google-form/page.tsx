"use client";

import { useState } from "react";

type Result = {
  status: string;
  formUrl?: string;
  editUrl?: string;
  sheetUrl?: string;
  csvUrl?: string;
  message?: string;
};

export default function GoogleFormPage() {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function createForm() {
    if (!title.trim()) {
      setError("Please enter a form title.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/google-form/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok || data.status !== "success") {
        throw new Error(
          data.message || "Failed to create Google Form."
        );
      }

      setResult(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold">
          Google Form Generator
        </h1>

        <p className="mt-2 text-gray-600">
          Automatically create a Google Form, connect
          responses to Google Sheets, and generate a CSV file.
        </p>

        <div className="mt-8 rounded-xl border p-6">
          <label
            htmlFor="title"
            className="mb-2 block font-medium"
          >
            Form Title
          </label>

          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Customer Feedback Survey"
            className="w-full rounded-lg border px-4 py-3 outline-none"
          />

          <button
            type="button"
            onClick={createForm}
            disabled={loading}
            className="mt-5 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Google Form"}
          </button>

          {error && (
            <p className="mt-4 text-red-600">
              {error}
            </p>
          )}
        </div>

        {result?.status === "success" && (
          <div className="mt-6 rounded-xl border bg-green-50 p-6">
            <h2 className="text-xl font-semibold">
              Form Created Successfully
            </h2>

            <div className="mt-5 space-y-3">
              {result.formUrl && (
                <a
                  href={result.formUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 hover:underline"
                >
                  Open Google Form
                </a>
              )}

              {result.editUrl && (
                <a
                  href={result.editUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-blue-600 hover:underline"
                >
                  Edit Google Form
                </a>
              )}

              {result.sheetUrl && (
                <a
                  href={result.sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-green-700 hover:underline"
                >
                  Open Google Sheet
                </a>
              )}

              {result.csvUrl && (
                <a
                  href={result.csvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-red-600 hover:underline"
                >
                  Open CSV File
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
