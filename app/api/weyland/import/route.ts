import { NextResponse } from "next/server";

import { importWeylandMeasurements } from "@/lib/monitoring/weyland-import";

type ImportRequestBody = {
  assetId?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ImportRequestBody;
    const assetId = Number(body.assetId);

    if (!Number.isInteger(assetId) || assetId <= 0) {
      return NextResponse.json(
        {
          error: "assetId muss eine positive Ganzzahl sein.",
        },
        {
          status: 400,
        },
      );
    }

    const result = await importWeylandMeasurements(assetId);

    return NextResponse.json(
      {
        message: "Weyland-Messwerte wurden importiert.",
        result,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Weyland-Import fehlgeschlagen:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Unbekannter Fehler beim Weyland-Import.";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 500,
      },
    );
  }
}