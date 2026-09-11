import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const createFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Google Form title is required.")
    .max(200, "Google Form title must be 200 characters or fewer."),
});

const appsScriptSuccessSchema = z.object({
  status: z.literal("success"),
  message: z.string().optional(),
  formUrl: z.string().url(),
  editUrl: z.string().url(),
  sheetUrl: z.string().url(),
  csvUrl: z.string().url(),
  formId: z.string().optional(),
  spreadsheetId: z.string().optional(),
  csvFileId: z.string().optional(),
});

const appsScriptErrorSchema = z.object({
  status: z.literal("error"),
  message: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id || !session.user.workspaceId) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          error:
            "Only workspace admins can create Google Forms.",
        },
        { status: 403 }
      );
    }

    const body: unknown = await request.json();

    const parsedBody =
      createFormSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error:
            parsedBody.error.issues[0]?.message ||
            "Invalid Google Form request.",
        },
        { status: 400 }
      );
    }

    const { title } = parsedBody.data;

    const workspaceId =
      session.user.workspaceId;

    const integration =
      await prisma.googleFormIntegration.findUnique({
        where: {
          workspaceId,
        },
        select: {
          workspaceId: true,
          webhookSecret: true,
        },
      });

    if (!integration) {
      return NextResponse.json(
        {
          error:
            "Google Form integration is not configured for this workspace.",
        },
        { status: 404 }
      );
    }

    const appsScriptUrl =
      process.env.GOOGLE_FORM_APPS_SCRIPT_URL;

    if (!appsScriptUrl) {
      return NextResponse.json(
        {
          error:
            "Google Form Apps Script URL is not configured on the server.",
        },
        { status: 500 }
      );
    }

    const appsScriptResponse =
      await fetch(appsScriptUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          workspaceId: integration.workspaceId,
          webhookSecret: integration.webhookSecret,
        }),
        cache: "no-store",
      });

    const responseText =
      await appsScriptResponse.text();

    let responseData: unknown;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      console.error(
        "Google Apps Script returned non-JSON response:",
        responseText
      );

      return NextResponse.json(
        {
          error:
            "Google Apps Script returned an invalid response.",
        },
        { status: 502 }
      );
    }

    const appsScriptError =
      appsScriptErrorSchema.safeParse(
        responseData
      );

    if (appsScriptError.success) {
      return NextResponse.json(
        {
          error:
            appsScriptError.data.message ||
            "Google Apps Script failed to create the form.",
        },
        { status: 502 }
      );
    }

    const appsScriptSuccess =
      appsScriptSuccessSchema.safeParse(
        responseData
      );

    if (!appsScriptSuccess.success) {
      console.error(
        "Unexpected Google Apps Script response:",
        responseData
      );

      return NextResponse.json(
        {
          error:
            "Google Apps Script returned an invalid response.",
        },
        { status: 502 }
      );
    }

    if (!appsScriptResponse.ok) {
      return NextResponse.json(
        {
          error:
            "Google Apps Script failed to create the Google Form.",
        },
        { status: 502 }
      );
    }

    const form =
      appsScriptSuccess.data;

    return NextResponse.json(
      {
        message:
          form.message ||
          "Google Form created successfully.",
        form: {
          formUrl: form.formUrl,
          editUrl: form.editUrl,
          sheetUrl: form.sheetUrl,
          csvUrl: form.csvUrl,
          formId: form.formId,
          spreadsheetId: form.spreadsheetId,
          csvFileId: form.csvFileId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Google Form creation error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to create Google Form.",
      },
      { status: 500 }
    );
  }
}