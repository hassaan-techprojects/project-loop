"use client";

export default function ReportExportButton() {
  function handleExport() {
    window.print();
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      className="inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80 print:hidden"
      style={{
        backgroundColor: "var(--primary)",
        borderColor: "var(--primary)",
        color: "#FFFFFF",
      }}
    >
      Export PDF
    </button>
  );
}