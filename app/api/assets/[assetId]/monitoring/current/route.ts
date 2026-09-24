import { NextResponse } from "next/server";

import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId: assetIdRaw } = await params;
  const assetId = Number(assetIdRaw);

  if (!Number.isInteger(assetId) || assetId <= 0) {
    return NextResponse.json(
      { error: "assetId muss eine positive Ganzzahl sein." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();

  const measurements = await prisma.assetMeasurement.findMany({
    where: { assetId },
    orderBy: { observedAt: "desc" },
    distinct: ["measurementType"],
  });

  if (measurements.length === 0) {
    return NextResponse.json(
      { error: `Keine Messwerte für Asset ${assetId} gefunden.` },
      { status: 404 },
    );
  }

  return NextResponse.json({ assetId, measurements });
}