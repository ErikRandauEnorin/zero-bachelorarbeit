import {
  MEASUREMENT_TYPES,
  MEASUREMENT_UNITS,
  type NormalizedMeasurement,
} from "../measurement-types";
import {
  finiteNumber,
  resolveObservedAt,
  validPercentage,
} from "../normalization";

export type HeatAssetData = {
  activePowerkW?: number | null;
  soc?: number | null;
};

export type HeatSiteData = {
  siteId: string;
  reportedAt?: string;
  assets?: {
    grid?: HeatAssetData | null;
    bess?: HeatAssetData | null;
    load?: HeatAssetData | null;
    solar?: HeatAssetData | null;
    heatpump?: HeatAssetData | null;
  };
};

export function mapHeatSiteData(
  site: HeatSiteData,
  fallbackObservedAt: Date,
): NormalizedMeasurement[] {
  const observedAt = resolveObservedAt(
    site.reportedAt,
    fallbackObservedAt,
  );

  const sourceRef = site.siteId;
  const measurements: NormalizedMeasurement[] = [];

  const addPowerMeasurement = (
    measurementType:
      NormalizedMeasurement["measurementType"],
    sourceValue: unknown,
  ) => {
    const value = finiteNumber(sourceValue);

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

  const assets = site.assets ?? {};

  addPowerMeasurement(
    MEASUREMENT_TYPES.GRID_POWER,
    assets.grid?.activePowerkW,
  );

  addPowerMeasurement(
    MEASUREMENT_TYPES.PV_POWER,
    assets.solar?.activePowerkW,
  );

  addPowerMeasurement(
    MEASUREMENT_TYPES.BATTERY_POWER,
    assets.bess?.activePowerkW,
  );

  addPowerMeasurement(
    MEASUREMENT_TYPES.LOAD_POWER,
    assets.load?.activePowerkW,
  );

  addPowerMeasurement(
    MEASUREMENT_TYPES.HEAT_PUMP_POWER,
    assets.heatpump?.activePowerkW,
  );

  const batterySoc = validPercentage(
    assets.bess?.soc,
  );

  if (batterySoc !== undefined) {
    measurements.push({
      measurementType:
        MEASUREMENT_TYPES.BATTERY_SOC,
      value: batterySoc,
      unit: MEASUREMENT_UNITS.PERCENT,
      observedAt,
      sourceRef,
    });
  }

  return measurements;
}