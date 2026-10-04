import { ProviderType } from "@prisma/client";

import { heatGet } from "@/lib/heat-auth";
import { getPrisma } from "@/lib/prisma";
import { persistMeasurements } from
  "@/lib/monitoring/persist-measurements";
import {
  mapHeatSiteData,
  type HeatSiteData,
} from "@/lib/monitoring/providers/heat-mapper";

type HeatSiteReference = {
  siteId: string;
};

async function resolveHeatSiteId(
  mappedId: string,
): Promise<string> {
  if (mappedId && mappedId !== "auto") {
    return mappedId;
  }

  const response =
    await heatGet<{ sites?: HeatSiteReference[] }>(
      "/public/sites",
    );

  const siteId = response.sites?.[0]?.siteId;

  if (!siteId) {
    throw new Error(
      "HEAT lieferte keine verwendbare Site-ID.",
    );
  }

  return siteId;
}

export async function importHeatMeasurements(
  assetId: number,
) {
  const prisma = getPrisma();

  const mapping =
    await prisma.providerDeviceMapping.findFirst({
      where: {
        assetId,
        provider: ProviderType.HEAT,
      },
    });

  if (!mapping) {
    throw new Error(
      `Für Asset ${assetId} wurde kein HEAT-Mapping gefunden.`,
    );
  }

  const siteId = await resolveHeatSiteId(
    mapping.providerDeviceId,
  );

  const site = await heatGet<HeatSiteData>(
    `/public/sites/${siteId}`,
  );

  if (!site.siteId) {
    site.siteId = siteId;
  }

  const fallbackObservedAt = new Date();

  const measurements = mapHeatSiteData(
    site,
    fallbackObservedAt,
  );

  const persistence = await persistMeasurements(
    assetId,
    ProviderType.HEAT,
    measurements,
  );

  const observedAt =
    measurements[0]?.observedAt ??
    fallbackObservedAt;

  return {
    assetId,
    provider: ProviderType.HEAT,
    providerDeviceId: siteId,
    observedAt: observedAt.toISOString(),
    ...persistence,
  };
}