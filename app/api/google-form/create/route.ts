import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const title = String(body.title || "").trim();

    if (!title) {
      return NextResponse.json(
        {
          status: "error",
          message: "Form title is required.",
        },
        { status: 400 }
      );
    }

    const appsScriptUrl =
      process.env.GOOGLE_APPS_SCRIPT_URL;

    if (!appsScriptUrl) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Google Apps Script URL is not configured.",
        },
        { status: 500 }
      );
    }

    const response = await fetch(appsScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        title,
      }),
      cache: "no-store",
    });

    const text = await response.text();

    let result;

    try {
      result = JSON.parse(text);
    } catch {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Google Apps Script did not return valid JSON.",
          response: text.substring(0, 500),
        },
        { status: 502 }
      );
    }

    if (!response.ok || result.status !== "success") {
      return NextResponse.json(
        result,
        { status: 400 }
      );
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error(
      "Google Form creation error:",
      error
    );

    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong.",
      },
      { status: 500 }
    );
  }
}