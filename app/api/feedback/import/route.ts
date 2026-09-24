import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const sentimentSchema = z.enum([
  "POS",
  "NEU",
  "NEG",
]);

const csvRowSchema = z.object({
  content: z
    .string()
    .trim()
    .max(
      5000,
      "Feedback content must be 5000 characters or fewer.",
    ),

  customerLabel: z
    .string()
    .trim()
    .max(
      200,
      "Customer label must be 200 characters or fewer.",
    ),

  channel: z
    .string()
    .trim()
    .max(
      100,
      "Channel must be 100 characters or fewer.",
    ),

  sentiment: z
    .string()
    .trim()
    .max(
      30,
      "Sentiment is invalid.",
    ),

  themeName: z
    .string()
    .trim()
    .max(
      200,
      "Theme must be 200 characters or fewer.",
    ),

  sourceRef: z
    .string()
    .trim()
    .max(
      500,
      "Source reference must be 500 characters or fewer.",
    ),
});

type CsvRow = z.infer<
  typeof csvRowSchema
>;

const importCorrectionSchema =
  z.object({
    rowIndex: z
      .number()
      .int()
      .min(0),

    content: z
      .string()
      .trim()
      .max(
        5000,
        "Feedback content must be 5000 characters or fewer.",
      ),

    customerLabel: z
      .string()
      .trim()
      .max(
        200,
        "Customer label must be 200 characters or fewer.",
      ),

    channel: z
      .string()
      .trim()
      .max(
        100,
        "Channel must be 100 characters or fewer.",
      ),

    sentiment: z
      .string()
      .trim()
      .max(
        30,
        "Sentiment is invalid.",
      ),

    themeName: z
      .string()
      .trim()
      .max(
        200,
        "Theme must be 200 characters or fewer.",
      ),

    sourceRef: z
      .string()
      .trim()
      .max(
        500,
        "Source reference must be 500 characters or fewer.",
      ),
  });

type ImportCorrection =
  z.infer<
    typeof importCorrectionSchema
  >;

function parseCsvLine(line: string) {
  const values: string[] = [];

  let current = "";
  let insideQuotes = false;

  for (
    let index = 0;
    index < line.length;
    index += 1
  ) {
    const character = line[index];

    if (character === '"') {
      if (
        insideQuotes &&
        line[index + 1] === '"'
      ) {
        current += '"';
        index += 1;
      } else {
        insideQuotes =
          !insideQuotes;
      }

      continue;
    }

    if (
      character === "," &&
      !insideQuotes
    ) {
      values.push(
        current.trim(),
      );

      current = "";

      continue;
    }

    current += character;
  }

  values.push(
    current.trim(),
  );

  return values;
}

function normalizeHeader(
  value: string,
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[\s_-]+/g,
      "",
    );
}

function normalizeSentiment(
  value: string,
) {
  const normalized =
    value
      .trim()
      .toLowerCase()
      .replace(
        /[\s_-]+/g,
        "",
      );

  if (
    normalized ===
      "positive" ||
    normalized === "pos"
  ) {
    return "POS";
  }

  if (
    normalized ===
      "neutral" ||
    normalized === "neu"
  ) {
    return "NEU";
  }

  if (
    normalized ===
      "negative" ||
    normalized === "neg"
  ) {
    return "NEG";
  }

  return "";
}

function findHeaderIndex(
  headers: string[],
  aliases: string[],
) {
  for (const alias of aliases) {
    const index =
      headers.indexOf(alias);

    if (index !== -1) {
      return index;
    }
  }

  return -1;
}

function parseCsv(
  csvText: string,
) {
  const lines =
    csvText
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .map((line) =>
        line.trim(),
      )
      .filter(Boolean);

  if (lines.length < 1) {
    throw new Error(
      "The CSV file does not contain any data.",
    );
  }

  const rawFirstRow =
    parseCsvLine(lines[0]);

  const normalizedHeaders =
    rawFirstRow.map(
      normalizeHeader,
    );

  const contentAliases = [
    "content",
    "feedback",
    "feedbackcontent",
    "feedbacktext",
    "comment",
    "comments",
    "message",
    "review",
    "reviewtext",
    "text",
  ];

  const customerAliases = [
    "customerlabel",
    "customer",
    "customername",
    "customerid",
    "username",
    "user",
    "name",
  ];

  const channelAliases = [
    "channel",
    "feedbackchannel",
    "sourcechannel",
    "platform",
    "sourceplatform",
  ];

  const sentimentAliases = [
    "sentiment",
    "sentimentlabel",
    "mood",
    "feeling",
  ];

  const themeAliases = [
    "theme",
    "topic",
    "category",
    "feedbacktheme",
  ];

  const sourceAliases = [
    "sourceref",
    "sourcereference",
    "source",
    "reference",
    "referenceid",
    "sourceid",
  ];

  const contentIndex =
    findHeaderIndex(
      normalizedHeaders,
      contentAliases,
    );

  const customerIndex =
    findHeaderIndex(
      normalizedHeaders,
      customerAliases,
    );

  const channelIndex =
    findHeaderIndex(
      normalizedHeaders,
      channelAliases,
    );

  const sentimentIndex =
    findHeaderIndex(
      normalizedHeaders,
      sentimentAliases,
    );

  const themeIndex =
    findHeaderIndex(
      normalizedHeaders,
      themeAliases,
    );

  const sourceIndex =
    findHeaderIndex(
      normalizedHeaders,
      sourceAliases,
    );

  const recognizedHeader =
    contentIndex !== -1 ||
    customerIndex !== -1 ||
    channelIndex !== -1 ||
    sentimentIndex !== -1 ||
    themeIndex !== -1 ||
    sourceIndex !== -1;

  /*
   * There is intentionally NO column-mapping step.
   *
   * If known headers are found, use them.
   *
   * If no recognizable headers are found,
   * fall back to positional columns:
   *
   * 1 = content
   * 2 = customer
   * 3 = channel
   * 4 = sentiment
   * 5 = theme
   * 6 = source reference
   */
  const dataStartIndex =
    recognizedHeader ? 1 : 0;

  const effectiveContentIndex =
    contentIndex !== -1
      ? contentIndex
      : recognizedHeader
        ? -1
        : 0;

  const effectiveCustomerIndex =
    customerIndex !== -1
      ? customerIndex
      : recognizedHeader
        ? -1
        : 1;

  const effectiveChannelIndex =
    channelIndex !== -1
      ? channelIndex
      : recognizedHeader
        ? -1
        : 2;

  const effectiveSentimentIndex =
    sentimentIndex !== -1
      ? sentimentIndex
      : recognizedHeader
        ? -1
        : 3;

  const effectiveThemeIndex =
    themeIndex !== -1
      ? themeIndex
      : recognizedHeader
        ? -1
        : 4;

  const effectiveSourceIndex =
    sourceIndex !== -1
      ? sourceIndex
      : recognizedHeader
        ? -1
        : 5;

  const rows: CsvRow[] = [];

  for (
    let index = dataStartIndex;
    index < lines.length;
    index += 1
  ) {
    const values =
      parseCsvLine(
        lines[index],
      );

    const row = {
      content:
        effectiveContentIndex ===
        -1
          ? ""
          : values[
              effectiveContentIndex
            ] ?? "",

      customerLabel:
        effectiveCustomerIndex ===
        -1
          ? ""
          : values[
              effectiveCustomerIndex
            ] ?? "",

      channel:
        effectiveChannelIndex ===
        -1
          ? ""
          : values[
              effectiveChannelIndex
            ] ?? "",

      sentiment:
        effectiveSentimentIndex ===
        -1
          ? ""
          : normalizeSentiment(
              values[
                effectiveSentimentIndex
              ] ?? "",
            ),

      themeName:
        effectiveThemeIndex ===
        -1
          ? ""
          : values[
              effectiveThemeIndex
            ] ?? "",

      sourceRef:
        effectiveSourceIndex ===
        -1
          ? ""
          : values[
              effectiveSourceIndex
            ] ?? "",
    };

    const parsed =
      csvRowSchema.safeParse(
        row,
      );

    if (!parsed.success) {
      const firstIssue =
        parsed.error.issues[0];

      throw new Error(
        `Invalid data on CSV row ${
          index + 1
        }. ${
          firstIssue?.message ??
          "Please check the CSV values."
        }`,
      );
    }

    rows.push(
      parsed.data,
    );
  }

  if (rows.length === 0) {
    throw new Error(
      "The CSV does not contain any feedback rows.",
    );
  }

  if (rows.length > 500) {
    throw new Error(
      "A maximum of 500 feedback rows can be imported at once.",
    );
  }

  return rows;
}

function namesMatch(
  first: string,
  second: string,
) {
  return (
    first
      .trim()
      .toLowerCase() ===
    second
      .trim()
      .toLowerCase()
  );
}

export async function POST(
  request: Request,
) {
  try {
    const session =
      await auth();

    if (
      !session?.user?.id ||
      !session.user.workspaceId
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    if (
      session.user.role !==
        "ADMIN" &&
      session.user.role !==
        "ANALYST"
    ) {
      return NextResponse.json(
        {
          error:
            "Only admins and analysts can import feedback.",
        },
        {
          status: 403,
        },
      );
    }

    const formData =
      await request.formData();

    const file =
      formData.get("file");

    const correctionsValue =
      formData.get(
        "corrections",
      );

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error:
            "Please select a CSV file.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !file.name
        .toLowerCase()
        .endsWith(".csv")
    ) {
      return NextResponse.json(
        {
          error:
            "Only CSV files are supported.",
        },
        {
          status: 400,
        },
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        {
          error:
            "The CSV file is empty.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {
      return NextResponse.json(
        {
          error:
            "CSV files must be 5 MB or smaller.",
        },
        {
          status: 400,
        },
      );
    }

    const rows =
      parseCsv(
        await file.text(),
      );

    let corrections: ImportCorrection[] =
      [];

    if (
      correctionsValue
    ) {
      try {
        const parsedCorrections =
          JSON.parse(
            String(
              correctionsValue,
            ),
          ) as unknown;

        if (
          !Array.isArray(
            parsedCorrections,
          )
        ) {
          throw new Error(
            "Invalid correction data.",
          );
        }

        corrections =
          parsedCorrections.map(
            (
              correction,
            ) => {
              const parsed =
                importCorrectionSchema.safeParse(
                  correction,
                );

              if (
                !parsed.success
              ) {
                throw new Error(
                  parsed.error
                    .issues[0]
                    ?.message ??
                    "Invalid CSV correction data.",
                );
              }

              return parsed.data;
            },
          );
      } catch (error) {
        return NextResponse.json(
          {
            error:
              error instanceof
              Error
                ? error.message
                : "Invalid CSV correction data.",
          },
          {
            status: 400,
          },
        );
      }
    }

    const correctionMap =
      new Map<
        number,
        ImportCorrection
      >();

    for (
      const correction of corrections
    ) {
      if (
        correction.rowIndex >=
        rows.length
      ) {
        return NextResponse.json(
          {
            error:
              `Correction row ${correction.rowIndex + 1} does not exist in the CSV.`,
          },
          {
            status: 400,
          },
        );
      }

      correctionMap.set(
        correction.rowIndex,
        correction,
      );
    }

    const workspaceId =
      session.user.workspaceId;

    const activeChannels =
      await prisma.channel.findMany(
        {
          where: {
            workspaceId,
            isActive: true,
          },

          select: {
            id: true,
            name: true,
          },
        },
      );

    const activeThemes =
      await prisma.theme.findMany(
        {
          where: {
            workspaceId,
            isActive: true,
          },

          select: {
            id: true,
            name: true,
          },
        },
      );

    const correctedRows =
      rows.map(
        (row, rowIndex) => {
          const correction =
            correctionMap.get(
              rowIndex,
            );

          if (!correction) {
            return row;
          }

          return {
            content:
              correction.content.trim(),

            customerLabel:
              correction.customerLabel.trim(),

            channel:
              correction.channel.trim(),

            sentiment:
              correction.sentiment.trim(),

            themeName:
              correction.themeName.trim(),

            sourceRef:
              correction.sourceRef.trim(),
          };
        },
      );

    /*
     * Final validation happens on the server.
     * This prevents a direct API request from bypassing
     * the correction UI.
     */

    const missingContentIndex =
      correctedRows.findIndex(
        (row) =>
          !row.content.trim(),
      );

    if (
      missingContentIndex !==
      -1
    ) {
      return NextResponse.json(
        {
          error:
            `Feedback row ${missingContentIndex + 1} is missing Feedback Content.`,
        },
        {
          status: 400,
        },
      );
    }

    const missingCustomerIndex =
      correctedRows.findIndex(
        (row) =>
          !row.customerLabel.trim(),
      );

    if (
      missingCustomerIndex !==
      -1
    ) {
      return NextResponse.json(
        {
          error:
            `Feedback row ${missingCustomerIndex + 1} is missing Customer Label. Please enter the customer label before importing.`,
        },
        {
          status: 400,
        },
      );
    }

    const invalidChannelRow =
      correctedRows.find(
        (row) => {
          if (
            !row.channel.trim()
          ) {
            return true;
          }

          return !activeChannels.some(
            (channel) =>
              namesMatch(
                channel.name,
                row.channel,
              ),
          );
        },
      );

    if (
      invalidChannelRow
    ) {
      const rowIndex =
        correctedRows.indexOf(
          invalidChannelRow,
        );

      return NextResponse.json(
        {
          error:
            `Feedback row ${rowIndex + 1} requires a valid active Channel. Disabled or unavailable channels cannot be imported.`,
        },
        {
          status: 400,
        },
      );
    }

    const invalidSentimentRow =
      correctedRows.find(
        (row) => {
          const parsed =
            sentimentSchema.safeParse(
              row.sentiment,
            );

          return !parsed.success;
        },
      );

    if (
      invalidSentimentRow
    ) {
      const rowIndex =
        correctedRows.indexOf(
          invalidSentimentRow,
        );

      return NextResponse.json(
        {
          error:
            `Feedback row ${rowIndex + 1} requires a valid Sentiment: Positive, Neutral, or Negative.`,
        },
        {
          status: 400,
        },
      );
    }

    const invalidThemeRow =
      correctedRows.find(
        (row) => {
          if (
            !row.themeName.trim()
          ) {
            return true;
          }

          return !activeThemes.some(
            (theme) =>
              namesMatch(
                theme.name,
                row.themeName,
              ),
          );
        },
      );

    if (
      invalidThemeRow
    ) {
      const rowIndex =
        correctedRows.indexOf(
          invalidThemeRow,
        );

      return NextResponse.json(
        {
          error:
            `Feedback row ${rowIndex + 1} requires a valid active Theme. Disabled or unavailable themes cannot be imported.`,
        },
        {
          status: 400,
        },
      );
    }

    const activeChannelMap =
      new Map(
        activeChannels.map(
          (channel) => [
            channel.name
              .trim()
              .toLowerCase(),
            channel.name,
          ],
        ),
      );

    const activeThemeMap =
      new Map(
        activeThemes.map(
          (theme) => [
            theme.name
              .trim()
              .toLowerCase(),
            {
              id: theme.id,
              name: theme.name,
            },
          ],
        ),
      );

    const importedCount =
      await prisma.$transaction(
        async (tx) => {
          let count = 0;

          for (
            const row of correctedRows
          ) {
            const canonicalChannel =
              activeChannelMap.get(
                row.channel
                  .trim()
                  .toLowerCase(),
              );

            const canonicalTheme =
              activeThemeMap.get(
                row.themeName
                  .trim()
                  .toLowerCase(),
              );

            if (
              !canonicalChannel
            ) {
              throw new Error(
                "A selected channel is no longer available.",
              );
            }

            if (
              !canonicalTheme
            ) {
              throw new Error(
                "A selected theme is no longer available.",
              );
            }

            const created =
              await tx.feedback.create(
                {
                  data: {
                    content:
                      row.content.trim(),

                    channel:
                      canonicalChannel,

                    customerLabel:
                      row.customerLabel.trim(),

                    sourceRef:
                      row.sourceRef.trim() ||
                      null,

                    sentiment:
                      row.sentiment as
                        | "POS"
                        | "NEU"
                        | "NEG",

                    sentimentScore:
                      null,

                    status:
                      "NEW",

                    workspaceId,
                  },

                  select: {
                    id: true,
                  },
                },
              );

            await tx.feedbackTheme.create(
              {
                data: {
                  feedbackId:
                    created.id,

                  themeId:
                    canonicalTheme.id,

                  confidence: 1,
                },
              },
            );

            count += 1;
          }

          return count;
        },
      );

    return NextResponse.json(
      {
        message:
          "Feedback imported successfully.",
        importedCount,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "CSV feedback import API error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to import feedback.",
      },
      {
        status: 500,
      },
    );
  }
}