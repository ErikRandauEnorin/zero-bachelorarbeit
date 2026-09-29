import { ProviderType } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { heatGet } from "@/lib/heat-auth";
import {
  MEASUREMENT_TYPES,
  MEASUREMENT_UNITS,
  type NormalizedMeasurement,
} from "@/lib/monitoring/measurement-types";

type HeatSite = { siteId: string };
type HeatAsset = { activePowerkW?: number; soc?: number };
type HeatSiteDetail = {
  siteId: string;
  reportedAt?: string;
  assets: {
    grid?: HeatAsset | null;
    bess?: HeatAsset | null;
    load?: HeatAsset | null;
    solar?: HeatAsset | null;
    heatpump?: HeatAsset | null;
  };
};

function mapHeatData(site: HeatSiteDetail): NormalizedMeasurement[] {
  const observedAt = site.reportedAt ? new Date(site.reportedAt) : new Date();
  const measurements: NormalizedMeasurement[] = [];
  const sourceRef = site.siteId;

  const addMeasurement = (
    measurementType: NormalizedMeasurement["measurementType"],
    value: number | undefined,
    unit: string,
  ) => {
    // Heat liefert bereits kW — keine Umrechnung nötig
    if (typeof value !== "number" || !Number.isFinite(value)) return;
    measurements.push({ measurementType, value, unit, observedAt, sourceRef });
  };

  const { grid, bess, load, solar, heatpump } = site.assets ?? {};

  addMeasurement(MEASUREMENT_TYPES.GRID_POWER,      grid?.activePowerkW,     MEASUREMENT_UNITS.POWER_KW);
  addMeasurement(MEASUREMENT_TYPES.PV_POWER,        solar?.activePowerkW,    MEASUREMENT_UNITS.POWER_KW);
  addMeasurement(MEASUREMENT_TYPES.BATTERY_POWER,   bess?.activePowerkW,     MEASUREMENT_UNITS.POWER_KW);
  addMeasurement(MEASUREMENT_TYPES.LOAD_POWER,      load?.activePowerkW,     MEASUREMENT_UNITS.POWER_KW);
  addMeasurement(MEASUREMENT_TYPES.HEAT_PUMP_POWER, heatpump?.activePowerkW, MEASUREMENT_UNITS.POWER_KW);

  if (typeof bess?.soc === "number" && Number.isFinite(bess.soc)) {
    measurements.push({
      measurementType: MEASUREMENT_TYPES.BATTERY_SOC,
      value: bess.soc,
      unit: MEASUREMENT_UNITS.PERCENT,
      observedAt,
      sourceRef,
    });
  }

  return measurements;
}

/**
 * Löst die Site-ID auf:
 * 1. providerDeviceId aus Mapping, wenn gesetzt und nicht "auto"
 * 2. sonst: erste Site des Accounts via API
 */
async function resolveSiteId(mappedId: string): Promise<string> {
  if (mappedId && mappedId !== "auto") return mappedId;

  const { sites } = await heatGet<{ sites: HeatSite[] }>("/public/sites");
  const siteId = sites?.[0]?.siteId;
  if (!siteId) throw new Error("Heat API lieferte keine Site-ID.");
  return siteId;
}

export async function importHeatMeasurements(assetId: number) {
  const prisma = getPrisma();

  const mapping = await prisma.providerDeviceMapping.findFirst({
    where: { assetId, provider: ProviderType.HEAT },
  });

  if (!mapping) {
    throw new Error(
      `Für Asset ${assetId} wurde kein Heat-Provider-Mapping gefunden.`,
    );
  }

  const siteId = await resolveSiteId(mapping.providerDeviceId);

  const site = await heatGet<HeatSiteDetail>(`/public/sites/${siteId}`);
  const measurements = mapHeatData(site);

  if (measurements.length === 0) {
    throw new Error(
      `Die Heat-API-Antwort für Asset ${assetId} enthielt keine verwendbaren Messwerte.`,
    );
  }

  const result = await prisma.assetMeasurement.createMany({
    data: measurements.map((m) => ({
      assetId,
      measurementType: m.measurementType,
      value: m.value,
      unit: m.unit,
      observedAt: m.observedAt,
      sourceProvider: ProviderType.HEAT,
      sourceRef: m.sourceRef,
    })),
  });

  return {
    assetId,
    siteId,
    importedMeasurements: result.count,
    observedAt: measurements[0].observedAt.toISOString(),
  };
}