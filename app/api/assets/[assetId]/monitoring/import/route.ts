import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  AUTH_COOKIE_NAME,
  verifySessionToken,
} from "@/lib/auth";
import {
  IMPORTABLE_PROVIDERS,
  importProviderMeasurements,
  parseImportableProvider,
} from "@/lib/monitoring/import-measurements";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ assetId: string }>;
  },
) {
  const cookieStore = await cookies();

  const session = verifySessionToken(
    cookieStore.get(AUTH_COOKIE_NAME)?.value,
  );

  if (!session) {
    return NextResponse.json(
      { error: "Nicht authentifiziert." },
      { status: 401 },
    );
  }

  if (session.role !== "ADMIN") {
    return NextResponse.json(
      {
        error:
          "Nur Administratoren dürfen Providerdaten importieren.",
      },
      { status: 403 },
    );
  }

  const { assetId: assetIdRaw } = await params;
  const assetId = Number(assetIdRaw);

  if (
    !Number.isInteger(assetId) ||
    assetId <= 0
  ) {
    return NextResponse.json(
      {
        error:
          "assetId muss eine positive Ganzzahl sein.",
      },
      { status: 400 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error:
          "Request-Body muss gültiges JSON sein.",
      },
      { status: 400 },
    );
  }

  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return NextResponse.json(
      {
        error:
          "Request-Body muss ein JSON-Objekt sein.",
      },
      { status: 400 },
    );
  }

  const provider = parseImportableProvider(
    (body as Record<string, unknown>).provider,
  );

  if (!provider) {
    return NextResponse.json(
      {
        error: "Provider wird nicht unterstützt.",
        supportedProviders:
          IMPORTABLE_PROVIDERS,
      },
      { status: 400 },
    );
  }

  const prisma = getPrisma();

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      name: true,
    },
  });

  if (!asset) {
    return NextResponse.json(
      {
        error: `Asset ${assetId} wurde nicht gefunden.`,
      },
      { status: 404 },
    );
  }

  const mapping =
    await prisma.providerDeviceMapping.findFirst({
      where: {
        assetId,
        provider,
      },
      select: {
        providerDeviceId: true,
      },
    });

  if (!mapping) {
    return NextResponse.json(
      {
        error:
          `Für Asset ${assetId} existiert kein ${provider}-Mapping.`,
      },
      { status: 409 },
    );
  }

  try {
    const result =
      await importProviderMeasurements(
        assetId,
        provider,
      );

    return NextResponse.json({
      ok: true,
      asset: {
        id: asset.id,
        name: asset.name,
      },
      result,
    });
  } catch (error) {
    console.error(
      `Providerimport fehlgeschlagen: asset=${assetId}, provider=${provider}`,
      error instanceof Error
        ? error.message
        : "Unbekannter Fehler",
    );

    return NextResponse.json(
      {
        error:
          "Die Providerdaten konnten nicht importiert werden.",
      },
      { status: 502 },
    );
  }
}