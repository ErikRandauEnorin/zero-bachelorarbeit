import { ProviderType } from "@prisma/client";
import { getPrisma } from "@/lib/prisma";
import { parseSigencloudData, sigencloudGet } from "@/lib/sigencloud-auth";
import {
  MEASUREMENT_TYPES,
  MEASUREMENT_UNITS,
  type NormalizedMeasurement,
} from "@/lib/monitoring/measurement-types";

type SigencloudSystem = { id?: string; systemId?: string };
type SigencloudSystemList =
  | SigencloudSystem[]
  | { list?: SigencloudSystem[]; records?: SigencloudSystem[] };
type SigencloudEnergyFlow = {
  gridPower?: number;    // Watt, +/- import/export
  pvPower?: number;      // Watt
  batteryPower?: number; // Watt, +/- charge/discharge
  loadPower?: number;    // Watt
  batterySoc?: number;   // %
};

function extractFirstSystemId(
  data: SigencloudSystemList | undefined,
): string | undefined {
  if (!data) return undefined;
  const systems = Array.isArray(data)
    ? data
    : (data.list ?? data.records ?? []);
  const first = systems[0];
  return first?.id ?? first?.systemId;
}

function wattsToKilowatts(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return value / 1000;
}

function mapSigencloudData(
  flow: SigencloudEnergyFlow,
  sourceRef: string,
  observedAt: Date,
): NormalizedMeasurement[] {
  const measurements: NormalizedMeasurement[] = [];

  const addMeasurement = (
    measurementType: NormalizedMeasurement["measurementType"],
    value: number | undefined,
    unit: string,
  ) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return;
    measurements.push({ measurementType, value, unit, observedAt, sourceRef });
  };

  addMeasurement(MEASUREMENT_TYPES.GRID_POWER,    wattsToKilowatts(flow.gridPower),    MEASUREMENT_UNITS.POWER_KW);
  addMeasurement(MEASUREMENT_TYPES.PV_POWER,      wattsToKilowatts(flow.pvPower),      MEASUREMENT_UNITS.POWER_KW);
  addMeasurement(MEASUREMENT_TYPES.BATTERY_POWER, wattsToKilowatts(flow.batteryPower), MEASUREMENT_UNITS.POWER_KW);
  addMeasurement(MEASUREMENT_TYPES.LOAD_POWER,    wattsToKilowatts(flow.loadPower),    MEASUREMENT_UNITS.POWER_KW);

  if (typeof flow.batterySoc === "number" && Number.isFinite(flow.batterySoc)) {
    measurements.push({
      measurementType: MEASUREMENT_TYPES.BATTERY_SOC,
      value: flow.batterySoc,
      unit: MEASUREMENT_UNITS.PERCENT,
      observedAt,
      sourceRef,
    });
  }

  return measurements;
}

/**
 * Löst die System-ID auf:
 * 1. providerDeviceId aus Mapping, wenn gesetzt und nicht "auto"
 * 2. sonst: erster Eintrag der /openapi/system-Liste
 */
async function resolveSystemId(mappedId: string): Promise<string> {
  if (mappedId && mappedId !== "auto") return mappedId;

  const systemList = await sigencloudGet<SigencloudSystemList>("/openapi/system");
  const resolved = extractFirstSystemId(parseSigencloudData(systemList.data));
  if (!resolved) throw new Error("Sigen Cloud lieferte keine System-ID.");
  return resolved;
}

export async function importSigencloudMeasurements(assetId: number) {
  const prisma = getPrisma();

  const mapping = await prisma.providerDeviceMapping.findFirst({
    where: { assetId, provider: ProviderType.SIGEN },
  });

  if (!mapping) {
    throw new Error(
      `Für Asset ${assetId} wurde kein Sigen-Provider-Mapping gefunden.`,
    );
  }

  const systemId = await resolveSystemId(mapping.providerDeviceId);

  const flowJson = await sigencloudGet<SigencloudEnergyFlow>(
    `/openapi/systems/${systemId}/energyFlow`,
  );
  const flow = parseSigencloudData(flowJson.data);
  if (!flow) {
    throw new Error(
      `Sigen Cloud lieferte für System ${systemId} keine Energieflussdaten.`,
    );
  }

  const observedAt = new Date();
  const measurements = mapSigencloudData(flow, systemId, observedAt);

  if (measurements.length === 0) {
    throw new Error(
      `Die Sigen-Cloud-Antwort für Asset ${assetId} enthielt keine verwendbaren Messwerte.`,
    );
  }

  const result = await prisma.assetMeasurement.createMany({
    data: measurements.map((m) => ({
      assetId,
      measurementType: m.measurementType,
      value: m.value,
      unit: m.unit,
      observedAt: m.observedAt,
      sourceProvider: ProviderType.SIGEN,
      sourceRef: m.sourceRef,
    })),
  });

  return {
    assetId,
    systemId,
    importedMeasurements: result.count,
    observedAt: observedAt.toISOString(),
  };
}