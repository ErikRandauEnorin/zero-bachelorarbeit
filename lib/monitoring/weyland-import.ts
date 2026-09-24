import { ProviderType } from "@prisma/client";

import { getPrisma } from "@/lib/prisma";
import {
  MEASUREMENT_TYPES,
  MEASUREMENT_UNITS,
  type NormalizedMeasurement,
} from "@/lib/monitoring/measurement-types";

export async function importWeylandMeasurements(assetId: number) {
  const prisma = getPrisma();

  const mapping = await prisma.providerDeviceMapping.findFirst({
    where: {
      assetId,
      provider: ProviderType.WEYLAND,
    },
  });

  if (!mapping) {
    throw new Error(
      `Für Asset ${assetId} wurde kein Weyland-Provider-Mapping gefunden.`,
    );
  }

  const providerData = await fetchCurrentWeylandData(
    mapping.providerDeviceId,
  );

  const measurements = mapWeylandData(
    providerData,
    mapping.providerDeviceId,
  );

  if (measurements.length === 0) {
    throw new Error(
      `Die Weyland-Antwort für Asset ${assetId} enthielt keine verwendbaren Messwerte.`,
    );
  }

  const result = await prisma.assetMeasurement.createMany({
    data: measurements.map((measurement) => ({
      assetId,
      measurementType: measurement.measurementType,
      value: measurement.value,
      unit: measurement.unit,
      observedAt: measurement.observedAt,
      sourceProvider: ProviderType.WEYLAND,
      sourceRef: measurement.sourceRef,
    })),
  });

  return {
    assetId,
    providerDeviceId: mapping.providerDeviceId,
    importedMeasurements: result.count,
    observedAt: measurements[0].observedAt.toISOString(),
  };
}

type WeylandCurrentData = {
  observedAt: Date;
  gridPowerKw?: number;
  pvPowerKw?: number;
  loadPowerKw?: number;
  batteryPowerKw?: number;
  batterySocPercent?: number;
};

async function fetchCurrentWeylandData(
  providerDeviceId: string,
): Promise<WeylandCurrentData> {
  void providerDeviceId;

  throw new Error(
    "Die Weyland-Anbindung wurde noch nicht mit der vorhandenen API-Route verbunden.",
  );
}

function mapWeylandData(
  data: WeylandCurrentData,
  sourceRef: string,
): NormalizedMeasurement[] {
  const measurements: NormalizedMeasurement[] = [];

  const addMeasurement = (
    measurementType: NormalizedMeasurement["measurementType"],
    value: number | undefined,
    unit: string,
  ) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return;
    }

    measurements.push({
      measurementType,
      value,
      unit,
      observedAt: data.observedAt,
      sourceRef,
    });
  };

  addMeasurement(
    MEASUREMENT_TYPES.GRID_POWER,
    data.gridPowerKw,
    MEASUREMENT_UNITS.POWER_KW,
  );

  addMeasurement(
    MEASUREMENT_TYPES.PV_POWER,
    data.pvPowerKw,
    MEASUREMENT_UNITS.POWER_KW,
  );

  addMeasurement(
    MEASUREMENT_TYPES.LOAD_POWER,
    data.loadPowerKw,
    MEASUREMENT_UNITS.POWER_KW,
  );

  addMeasurement(
    MEASUREMENT_TYPES.BATTERY_POWER,
    data.batteryPowerKw,
    MEASUREMENT_UNITS.POWER_KW,
  );

  addMeasurement(
    MEASUREMENT_TYPES.BATTERY_SOC,
    data.batterySocPercent,
    MEASUREMENT_UNITS.PERCENT,
  );

  return measurements;
}