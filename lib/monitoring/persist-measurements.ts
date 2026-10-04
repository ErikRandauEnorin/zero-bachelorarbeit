import {
  MeasurementQuality,
  ProviderType,
} from "@prisma/client";

import { getPrisma } from "@/lib/prisma";
import type {
  NormalizedMeasurement,
} from "@/lib/monitoring/measurement-types";

export async function persistMeasurements(
  assetId: number,
  provider: ProviderType,
  measurements: NormalizedMeasurement[],
) {
  if (measurements.length === 0) {
    throw new Error(
      "Die Providerantwort enthielt keine gültigen Messwerte.",
    );
  }

  const result = await getPrisma()
    .assetMeasurement
    .createMany({
      data: measurements.map((measurement) => ({
        assetId,
        measurementType:
          measurement.measurementType,
        value: measurement.value,
        unit: measurement.unit,
        observedAt: measurement.observedAt,
        quality: MeasurementQuality.VALID,
        sourceProvider: provider,
        sourceRef: measurement.sourceRef,
      })),
      skipDuplicates: true,
    });

  return {
    attemptedMeasurements: measurements.length,
    insertedMeasurements: result.count,
    skippedDuplicates:
      measurements.length - result.count,
  };
}