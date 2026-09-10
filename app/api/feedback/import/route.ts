import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const csvRowSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Feedback content is required.")
    .max(5000, "Feedback content must be 5000 characters or fewer."),
  channel: z
    .string()
    .trim()
    .min(1, "Channel is required.")
    .max(100, "Channel must be 100 characters or fewer."),
  customerLabel: z
    .string()
    .trim()
    .max(200, "Customer label must be 200 characters or fewer.")
    .optional()
    .or(z.literal("")),
  sourceRef: z
    .string()
    .trim()
    .max(500, "Source reference must be 500 characters or fewer.")
    .optional()
    .or(z.literal("")),
});

type CsvRow = z.infer<typeof csvRowSchema>;

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (insideQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }

      continue;
    }

    if (character === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());

  return values;
}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function parseCsv(csvText: string) {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error(
      "The CSV must contain a header row and at least one feedback row."
    );
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);

  const contentIndex = headers.indexOf("content");
  const channelIndex = headers.indexOf("channel");
  const customerIndex = headers.indexOf("customerlabel");
  const sourceIndex = headers.indexOf("sourceref");

  if (contentIndex === -1) {
    throw new Error('The CSV must contain a "content" column.');
  }

  if (channelIndex === -1) {
    throw new Error('The CSV must contain a "channel" column.');
  }

  const rows: CsvRow[] = [];

  for (let index = 1; index < lines.length; index += 1) {
    const values = parseCsvLine(lines[index]);

    const row = {
      content: values[contentIndex] ?? "",
      channel: values[channelIndex] ?? "",
      customerLabel:
        customerIndex === -1 ? "" : values[customerIndex] ?? "",
      sourceRef: sourceIndex === -1 ? "" : values[sourceIndex] ?? "",
    };

    const parsed = csvRowSchema.safeParse(row);

    if (!parsed.success) {
      throw new Error(
        `Invalid data on CSV row ${index + 1}. Please check the content and channel values.`
      );
    }

    rows.push(parsed.data);
  }

  if (rows.length > 500) {
    throw new Error("A maximum of 500 feedback rows can be imported at once.");
  }

  return rows;
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.workspaceId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const role = session.user.role;

    if (role !== "ADMIN" && role !== "ANALYST") {
      return NextResponse.json(
        {
          error: "Only admins and analysts can import feedback.",
        },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please select a CSV file." },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json(
        { error: "Only CSV files are supported." },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "The CSV file is empty." },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "CSV files must be 5 MB or smaller." },
        { status: 400 }
      );
    }

    const csvText = await file.text();
    const rows = parseCsv(csvText);

    const feedback = await prisma.feedback.createMany({
      data: rows.map((row) => ({
        content: row.content,
        channel: row.channel,
        customerLabel: row.customerLabel || null,
        sourceRef: row.sourceRef || null,
        sentiment: null,
        sentimentScore: null,
        status: "NEW",
        workspaceId: session.user.workspaceId,
      })),
    });

    return NextResponse.json(
      {
        message: "Feedback imported successfully.",
        importedCount: feedback.count,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("CSV feedback import API error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to import feedback.";

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}