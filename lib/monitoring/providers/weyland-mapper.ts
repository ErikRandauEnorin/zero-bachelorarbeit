import {
  MEASUREMENT_TYPES,
  MEASUREMENT_UNITS,
  type NormalizedMeasurement,
} from "../measurement-types";
import { wattsToKilowatts } from "../normalization";

export type WeylandPowerData = {
  grid?: number | null;
  pv?: number | null;
  battery?: number | null;
  load?: number | null;
  unit?: string;
};

export function mapWeylandPowerData(
  power: WeylandPowerData,
  sourceRef: string,
  observedAt: Date,
): NormalizedMeasurement[] {
  const measurements: NormalizedMeasurement[] = [];

  const addPowerMeasurement = (
    measurementType:
      NormalizedMeasurement["measurementType"],
    sourceValue: unknown,
  ) => {
    const value = wattsToKilowatts(sourceValue);

    if (value === undefined) {
      return;
    }

    measurements.push({
      measurementType,
      value,
      unit: MEASUREMENT_UNITS.POWER_KW,
      observedAt,
      sourceRef,
    });
  };

  addPowerMeasurement(
    MEASUREMENT_TYPES.GRID_POWER,
    power.grid,
  );

  addPowerMeasurement(
    MEASUREMENT_TYPES.PV_POWER,
    power.pv,
  );

  addPowerMeasurement(
    MEASUREMENT_TYPES.BATTERY_POWER,
    power.battery,
  );

  addPowerMeasurement(
    MEASUREMENT_TYPES.LOAD_POWER,
    power.load,
  );

  return measurements;
}