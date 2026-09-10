// "aktiv" = active/connected, "getrennt" = disconnected
export type AssetStatus = "aktiv" | "getrennt";

/** Action triggered by a price rule (laden=charge, entladen=discharge, standby=idle). */
export type RuleAction = "laden" | "entladen" | "standby";

/** Comparison operator of a price rule against the spot price (ct/kWh). */
export type RuleOperator = "lte" | "gte" | "between";

/**
 * A price-dependent control rule: "If spot price <condition>, then <action>".
 * Rules are checked top to bottom; the first matching rule wins.
 */
export interface PriceRule {
  id: string;
  operator: RuleOperator;
  /** Threshold in ct/kWh (for "between", the lower bound) */
  price: number;
  /** Upper bound in ct/kWh, only used when operator === "between" */
  priceMax?: number;
  action: RuleAction;
  /** Power limit as % of connection capacity (for charging/discharging) */
  powerPct: number;
  enabled: boolean;
}

export interface Address {
  street: string;
  zip: string;
  city: string;
}

/** A battery storage container at a given location. */
export interface StorageAsset {
  id: string;
  /** Model name, e.g. "Megapack 2 XL" */
  model: string;
  manufacturer: string;
  /** Connection capacity (inverter power) in kW */
  connectionKw: number;
  /** Usable storage capacity in kWh */
  capacityKwh: number;
  /** Current state of charge in % */
  soc: number;
  /** Is the storage unit connected and active? */
  status: AssetStatus;
  address: Address;
  lat: number;
  lng: number;
  /** Year commissioned */
  commissioned: string;

  /** Price-dependent control rules (admin area) */
  priceRules: PriceRule[];
  /** Action to take when no rule matches */
  fallbackAction: RuleAction;
  /** Is automatic price-based control enabled? */
  automationEnabled: boolean;

  /** Operational figures shown in the status dialog */
  metrics: {
    /** Full cycles completed since commissioning */
    cycles: number;
    /** Total energy charged, in MWh */
    chargedTotalMwh: number;
    /** Total energy discharged, in MWh */
    dischargedTotalMwh: number;
    /** Energy charged today, in kWh */
    chargedTodayKwh: number;
    /** Energy discharged today, in kWh */
    dischargedTodayKwh: number;
    /** Round-trip efficiency in % */
    roundTripPct: number;
    /** Current power in kW (+ charging / − discharging) */
    powerKw: number;
    /** 7-day history for the mini chart in the dialog */
    weekly: DailyThroughput[];
    /** Daily history over several months (month filter, cost/revenue) */
    daily: DailyPoint[];
  };
}

export interface DailyThroughput {
  /** Abbreviation, e.g. "Mo" */
  day: string;
  /** Charged, in kWh */
  chargedKwh: number;
  /** Discharged, in kWh */
  dischargedKwh: number;
}

/** A single day in the history, with energy and revenue data. */
export interface DailyPoint {
  /** ISO date yyyy-mm-dd */
  date: string;
  /** Charged, in kWh */
  chargedKwh: number;
  /** Discharged, in kWh */
  dischargedKwh: number;
  /** Cost of charging, in € (buying electricity at cheap prices) */
  costEur: number;
  /** Revenue from discharging, in € (selling at expensive prices) */
  revenueEur: number;
}
