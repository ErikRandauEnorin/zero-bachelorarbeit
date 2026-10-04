import { ProviderType } from "@prisma/client";

import { getPrisma } from "@/lib/prisma";
import { weylandGet } from "@/lib/weyland-auth";
import { persistMeasurements } from
  "@/lib/monitoring/persist-measurements";
import {
  mapWeylandPowerData,
  type WeylandPowerData,
} from "@/lib/monitoring/providers/weyland-mapper";

type WeylandOverviewResponse = {
  code?: number;
  message?: string;
  data?: {
    power?: WeylandPowerData;
  };
};

export async function importWeylandMeasurements(
  assetId: number,
) {
  const prisma = getPrisma();

  const mapping =
    await prisma.providerDeviceMapping.findFirst({
      where: {
        assetId,
        provider: ProviderType.WEYLAND,
      },
    });

  if (!mapping) {
    throw new Error(
      `Für Asset ${assetId} wurde kein Weyland-Mapping gefunden.`,
    );
  }

  const response =
    await weylandGet<WeylandOverviewResponse>(
      "/api-open/ems/v1/overview",
      {
        deviceSn: mapping.providerDeviceId,
      },
    );

  const power = response.data?.power;

  if (!power) {
    throw new Error(
      "Weyland lieferte keine verwendbaren Leistungsdaten.",
    );
  }

  const observedAt = new Date();

  const measurements = mapWeylandPowerData(
    power,
    mapping.providerDeviceId,
    observedAt,
  );

  const persistence = await persistMeasurements(
    assetId,
    ProviderType.WEYLAND,
    measurements,
  );

  return {
    assetId,
    provider: ProviderType.WEYLAND,
    providerDeviceId: mapping.providerDeviceId,
    observedAt: observedAt.toISOString(),
    ...persistence,
  };
}