import { NextResponse } from "next/server";

import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/assets/[assetId]/monitoring/history
 *
 * Gibt historische Messwerte eines Assets zurück (Anwendungsfall Monitoring,
 * Kap. 5.1 der Bachelorarbeit). Unterstützt Filterung nach Zeitraum und
 * Messgrößentyp sowie einfache Offset-Paginierung.
 *
 * Query-Parameter:
 *   from            ISO-8601-Zeitstempel (Pflicht) – untere Grenze (inklusiv)
 *   to              ISO-8601-Zeitstempel (optional) – obere Grenze (inklusiv), Standard: jetzt
 *   measurementType Komma-getrennte Liste von Messgrößentypen (optional)
 *   limit           Maximale Anzahl Datensätze (optional, Standard: 500, Max: 2000)
 *   offset          Datensätze überspringen für Paginierung (optional, Standard: 0)
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

  // --- from (Pflichtparameter) ---
  const fromRaw = searchParams.get("from");
  if (!fromRaw) {
    return NextResponse.json(
      { error: "Query-Parameter 'from' ist erforderlich (ISO-8601)." },
      { status: 400 },
    );
  }
  const from = new Date(fromRaw);
  if (isNaN(from.getTime())) {
    return NextResponse.json(
      { error: "'from' ist kein gültiger ISO-8601-Zeitstempel." },
      { status: 400 },
    );
  }

  // --- to (optional, Standard: jetzt) ---
  const toRaw = searchParams.get("to");
  const to = toRaw ? new Date(toRaw) : new Date();
  if (isNaN(to.getTime())) {
    return NextResponse.json(
      { error: "'to' ist kein gültiger ISO-8601-Zeitstempel." },
      { status: 400 },
    );
  }

  if (from >= to) {
    return NextResponse.json(
      { error: "'from' muss vor 'to' liegen." },
      { status: 400 },
    );
  }

  // --- measurementType (optional, Komma-getrennt) ---
  const typeRaw = searchParams.get("measurementType");
  const measurementTypes = typeRaw
    ? typeRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : undefined;

  // --- limit / offset ---
  const MAX_LIMIT = 2000;
  const DEFAULT_LIMIT = 500;
  const limit = Math.min(Number(searchParams.get("limit") ?? DEFAULT_LIMIT), MAX_LIMIT);
  const offset = Number(searchParams.get("offset") ?? 0);

  if (!Number.isFinite(limit) || limit <= 0) {
    return NextResponse.json(
      { error: "'limit' muss eine positive Zahl sein (max. 2000)." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(offset) || offset < 0) {
    return NextResponse.json(
      { error: "'offset' muss eine nicht-negative Zahl sein." },
      { status: 400 },
    );
  }

  const prisma = getPrisma();

  const whereClause = {
    assetId,
    observedAt: { gte: from, lte: to },
    ...(measurementTypes?.length ? { measurementType: { in: measurementTypes } } : {}),
  };

  const [measurements, total] = await prisma.$transaction([
    prisma.assetMeasurement.findMany({
      where: whereClause,
      orderBy: { observedAt: "asc" },
      take: limit,
      skip: offset,
    }),
    prisma.assetMeasurement.count({ where: whereClause }),
  ]);

  return NextResponse.json({
    assetId,
    from: from.toISOString(),
    to: to.toISOString(),
    total,
    limit,
    offset,
    count: measurements.length,
    measurements,
  });
}