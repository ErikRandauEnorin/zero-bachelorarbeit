export const MEASUREMENT_TYPES = {
  GRID_POWER: "grid_power",
  PV_POWER: "pv_power",
  LOAD_POWER: "load_power",
  BATTERY_POWER: "battery_power",
  BATTERY_SOC: "battery_soc",
} as const;

export type MeasurementType =
  (typeof MEASUREMENT_TYPES)[keyof typeof MEASUREMENT_TYPES];

export const MEASUREMENT_UNITS = {
  POWER_KW: "kW",
  PERCENT: "%",
} as const;

export type NormalizedMeasurement = {
  measurementType: MeasurementType;
  value: number;
  unit: string;
  observedAt: Date;
  sourceRef?: string;
};