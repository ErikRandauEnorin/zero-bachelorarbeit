import { ProviderType } from "@prisma/client";

import { importHeatMeasurements } from
  "@/lib/monitoring/heat-import";
import { importWeylandMeasurements } from
  "@/lib/monitoring/weyland-import";

export const IMPORTABLE_PROVIDERS = [
  ProviderType.WEYLAND,
  ProviderType.HEAT,
] as const;

export type ImportableProvider =
  (typeof IMPORTABLE_PROVIDERS)[number];

export function parseImportableProvider(
  value: unknown,
): ImportableProvider | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();

  if (normalized === ProviderType.WEYLAND) {
    return ProviderType.WEYLAND;
  }

  if (normalized === ProviderType.HEAT) {
    return ProviderType.HEAT;
  }

  return null;
}

export async function importProviderMeasurements(
  assetId: number,
  provider: ImportableProvider,
) {
  switch (provider) {
    case ProviderType.WEYLAND:
      return importWeylandMeasurements(assetId);

    case ProviderType.HEAT:
      return importHeatMeasurements(assetId);
  }
}