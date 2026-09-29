import { NextResponse } from "next/server";
import { importSigencloudMeasurements } from "@/lib/monitoring/sigencloud-import";

export const dynamic = "force-dynamic";

type ImportRequestBody = { assetId?: unknown };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ImportRequestBody;
    const assetId = Number(body.assetId);

    if (!Number.isInteger(assetId) || assetId <= 0) {
      return NextResponse.json(
        { error: "assetId muss eine positive Ganzzahl sein." },
        { status: 400 },
      );
    }

    const result = await importSigencloudMeasurements(assetId);

    return NextResponse.json(
      { message: "Sigen-Cloud-Messwerte wurden importiert.", result },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}