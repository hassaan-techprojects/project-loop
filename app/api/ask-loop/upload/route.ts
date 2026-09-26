import { NextResponse } from "next/server";

import { auth } from "@/auth";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_TEXT_LENGTH = 60000;

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      error: message,
    },
    {
      status,
    }
  );
}

function cleanExtractedText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

async function extractPdfText(buffer: Buffer) {
  /*
   * pdfjs-dist is loaded only when a PDF is uploaded.
   *
   * The legacy Node build is intentionally used because PDF.js
   * documents this build for Node environments.
   */
  const { getDocument } = await import(
    "pdfjs-dist/legacy/build/pdf.mjs"
  );

  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
  });

  const pdfDocument = await loadingTask.promise;

  try {
    const pageTexts: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);

      try {
        const textContent = await page.getTextContent();

        const pageText = textContent.items
          .map((item) => {
            if ("str" in item && typeof item.str === "string") {
              return item.str;
            }

            return "";
          })
          .filter(Boolean)
          .join(" ");

        if (pageText.trim()) {
          pageTexts.push(pageText);
        }
      } finally {
        page.cleanup();
      }
    }

    return pageTexts.join("\n\n");
  } finally {
    await pdfDocument.destroy();
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.workspaceId) {
      return jsonError("Unauthorized.", 401);
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError(
        "Please provide a CSV or PDF file.",
        400
      );
    }

    if (file.size === 0) {
      return jsonError(
        "The uploaded file is empty.",
        400
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return jsonError(
        "The file is too large. Please upload a file smaller than 10 MB.",
        400
      );
    }

    const lowerName = file.name.toLowerCase();

    const isCsv =
      file.type === "text/csv" ||
      lowerName.endsWith(".csv");

    const isPdf =
      file.type === "application/pdf" ||
      lowerName.endsWith(".pdf");

    if (!isCsv && !isPdf) {
      return jsonError(
        "Only CSV and PDF files are supported.",
        400
      );
    }

    const buffer = Buffer.from(
      await file.arrayBuffer()
    );

    let text = "";

    if (isCsv) {
      text = buffer.toString("utf-8");
    } else {
      text = await extractPdfText(buffer);
    }

    const cleanedText = cleanExtractedText(text);

    if (!cleanedText) {
      return jsonError(
        "The file was read successfully, but no readable text was found. If this is a scanned or image-only PDF, text extraction cannot read it yet.",
        400
      );
    }

    return NextResponse.json({
      name: file.name,
      type: isCsv ? "CSV" : "PDF",
      size: file.size,
      text: cleanedText,
    });
  } catch (error) {
    console.error(
      "Ask LOOP file upload error:",
      error
    );

    return jsonError(
      "Unable to read the uploaded file. Please check that the file is a valid CSV or PDF.",
      500
    );
  }
}