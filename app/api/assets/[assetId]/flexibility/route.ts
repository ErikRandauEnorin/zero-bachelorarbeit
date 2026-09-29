import { NextResponse } from "next/server";

import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/assets/[assetId]/flexibility
 *
 * Gibt alle Flexibilitätsprofile eines Assets zurück (Anwendungsfall
 * Flexibilität, Kap. 5.2 der Bachelorarbeit).
 *
 * Optional kann mit ?activeAt=<ISO-8601> gefiltert werden, sodass nur
 * Profile zurückgegeben werden, bei denen der Zeitpunkt im Fenster
 * [availableFrom, availableTo] liegt (oder das Fenster unbegrenzt ist).
 */
export async function GET(
  request: Request,
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

  const { searchParams } = new URL(request.url);
  const activeAtRaw = searchParams.get("activeAt");
  let activeAt: Date | undefined;

  if (activeAtRaw) {
    activeAt = new Date(activeAtRaw);
    if (isNaN(activeAt.getTime())) {
      return NextResponse.json(
        { error: "'activeAt' ist kein gültiger ISO-8601-Zeitstempel." },
        { status: 400 },
      );
    }
  }

  const prisma = getPrisma();

  const profiles = await prisma.assetFlexibilityProfile.findMany({
    where: {
      assetId,
      ...(activeAt
        ? {
            AND: [
              {
                OR: [
                  { availableFrom: null },
                  { availableFrom: { lte: activeAt } },
                ],
              },
              {
                OR: [
                  { availableTo: null },
                  { availableTo: { gte: activeAt } },
                ],
              },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    assetId,
    count: profiles.length,
    ...(activeAt ? { activeAt: activeAt.toISOString() } : {}),
    profiles,
  });
}

/**
 * POST /api/assets/[assetId]/flexibility
 *
 * Legt ein neues Flexibilitätsprofil für ein Asset an.
 *
 * Body (JSON, alle Felder optional):
 *   minPowerKw     number   – Minimale Leistung in kW
 *   maxPowerKw     number   – Maximale Leistung in kW
 *   minSocPercent  number   – Minimaler Ladezustand in %
 *   maxSocPercent  number   – Maximaler Ladezustand in %
 *   availableFrom  string   – ISO-8601 Beginn des Verfügbarkeitsfensters
 *   availableTo    string   – ISO-8601 Ende des Verfügbarkeitsfensters
 *   notes          string   – Freitext für zusätzliche Restriktionen
 */
export async function POST(
  request: Request,
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

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request-Body muss gültiges JSON sein." },
      { status: 400 },
    );
  }

  const {
    minPowerKw,
    maxPowerKw,
    minSocPercent,
    maxSocPercent,
    availableFrom: availableFromRaw,
    availableTo: availableToRaw,
    rampUpMinutes,
    rampDownMinutes,
    minRuntimeMinutes,
    notes,
  } = body;

  // Numerische Float-Felder validieren
  for (const [key, val] of Object.entries({
    minPowerKw,
    maxPowerKw,
    minSocPercent,
    maxSocPercent,
  })) {
    if (val !== undefined && (typeof val !== "number" || !Number.isFinite(val))) {
      return NextResponse.json(
        { error: `'${key}' muss eine Zahl sein.` },
        { status: 400 },
      );
    }
  }

  // Ganzzahl-Felder validieren
  for (const [key, val] of Object.entries({
    rampUpMinutes,
    rampDownMinutes,
    minRuntimeMinutes,
  })) {
    if (val !== undefined && (!Number.isInteger(val) || (val as number) < 0)) {
      return NextResponse.json(
        { error: `'${key}' muss eine nicht-negative Ganzzahl sein.` },
        { status: 400 },
      );
    }
  }

  // Plausibilitätsprüfungen
  if (
    minPowerKw !== undefined &&
    maxPowerKw !== undefined &&
    (minPowerKw as number) > (maxPowerKw as number)
  ) {
    return NextResponse.json(
      { error: "'minPowerKw' darf nicht größer als 'maxPowerKw' sein." },
      { status: 400 },
    );
  }
  if (
    minSocPercent !== undefined &&
    maxSocPercent !== undefined &&
    (minSocPercent as number) > (maxSocPercent as number)
  ) {
    return NextResponse.json(
      { error: "'minSocPercent' darf nicht größer als 'maxSocPercent' sein." },
      { status: 400 },
    );
  }

  // Zeitstempel parsen
  let availableFrom: Date | undefined;
  let availableTo: Date | undefined;

  if (availableFromRaw !== undefined) {
    availableFrom = new Date(availableFromRaw as string);
    if (isNaN(availableFrom.getTime())) {
      return NextResponse.json(
        { error: "'availableFrom' ist kein gültiger ISO-8601-Zeitstempel." },
        { status: 400 },
      );
    }
  }
  if (availableToRaw !== undefined) {
    availableTo = new Date(availableToRaw as string);
    if (isNaN(availableTo.getTime())) {
      return NextResponse.json(
        { error: "'availableTo' ist kein gültiger ISO-8601-Zeitstempel." },
        { status: 400 },
      );
    }
  }
  if (availableFrom && availableTo && availableFrom >= availableTo) {
    return NextResponse.json(
      { error: "'availableFrom' muss vor 'availableTo' liegen." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();

  // Prüfen ob das Asset existiert
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) {
    return NextResponse.json(
      { error: `Asset ${assetId} nicht gefunden.` },
      { status: 404 },
    );
  }

  const profile = await prisma.assetFlexibilityProfile.create({
    data: {
      assetId,
      minPowerKw: minPowerKw as number | undefined,
      maxPowerKw: maxPowerKw as number | undefined,
      minSocPercent: minSocPercent as number | undefined,
      maxSocPercent: maxSocPercent as number | undefined,
      availableFrom,
      availableTo,
      rampUpMinutes: rampUpMinutes as number | undefined,
      rampDownMinutes: rampDownMinutes as number | undefined,
      minRuntimeMinutes: minRuntimeMinutes as number | undefined,
      notes: typeof notes === "string" ? notes : undefined,
    },
  });

  return NextResponse.json({ profile }, { status: 201 });
}