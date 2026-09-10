import type {
  DailyPoint,
  DailyThroughput,
  PriceRule,
  RuleAction,
  StorageAsset,
} from "./types";

/** Default arbitrage rules: charge when cheap, discharge when expensive. */
function defaultRules(id: string): PriceRule[] {
  return [
    {
      id: `${id}-r1`,
      operator: "lte",
      price: 5,
      action: "laden",
      powerPct: 100,
      enabled: true,
    },
    {
      id: `${id}-r2`,
      operator: "gte",
      price: 25,
      action: "entladen",
      powerPct: 100,
      enabled: true,
    },
    {
      id: `${id}-r3`,
      operator: "between",
      price: 5,
      priceMax: 12,
      action: "laden",
      powerPct: 50,
      enabled: false,
    },
  ];
}

const FALLBACK: RuleAction = "standby";

// Weekday abbreviations (German: Mo=Mon, Di=Tue, Mi=Wed, Do=Thu, Fr=Fri, Sa=Sat, So=Sun)
const DAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

/** Deterministic 7-day history, so server and client render identically. */
function week(seed: number, base: number, active: boolean): DailyThroughput[] {
  return DAYS.map((day, i) => {
    if (!active && i >= 5) {
      // Disconnected assets: no throughput for the last two days of the week
      return { day, chargedKwh: 0, dischargedKwh: 0 };
    }
    const wobble = ((seed * 7 + i * 13) % 11) / 10; // 0.0 – 1.0 deterministic pseudo-randomness
    const charged = Math.round(base * (0.7 + wobble * 0.6));
    const discharged = Math.round(base * (0.65 + ((wobble + 0.3) % 1) * 0.6));
    return { day, chargedKwh: charged, dischargedKwh: discharged };
  });
}

/**
 * Deterministic daily history over ~6 months (2026-02-01 to 2026-07-20),
 * including cost (charging) and revenue (discharging). Fixed date range so
 * server and client render identically and the month filter stays stable.
 */
function daily(seed: number, base: number, active: boolean): DailyPoint[] {
  const points: DailyPoint[] = [];
  const start = new Date(2026, 1, 1); // 2026-02-01
  const end = new Date(2026, 6, 20); // 2026-07-20
  const totalDays = Math.round((+end - +start) / 86_400_000);

  for (let i = 0; i <= totalDays; i++) {
    const d = new Date(2026, 1, 1 + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;

    // Disconnected assets: no throughput for the last 18 days of the range
    const disconnected = !active && i > totalDays - 18;
    const weekday = d.getDay(); // 0 Sun … 6 Sat
    const wobble = ((seed * 13 + i * 17) % 23) / 22; // 0…1 deterministic pseudo-randomness
    const weekendDip = weekday === 0 || weekday === 6 ? 0.6 : 1;

    const chargedKwh = disconnected
      ? 0
      : Math.round(base * (0.55 + wobble * 0.7) * weekendDip);
    const dischargedKwh = disconnected
      ? 0
      : Math.round(base * (0.5 + ((wobble + 0.35) % 1) * 0.7) * weekendDip);

    // Cheap purchase price (3–9 ct), expensive sale price (16–30 ct)
    const chargeCt = 3 + ((seed + i * 3) % 7);
    const dischargeCt = 16 + ((seed * 2 + i * 5) % 15);

    points.push({
      date: iso,
      chargedKwh,
      dischargedKwh,
      costEur: Math.round((chargedKwh * chargeCt) / 100),
      revenueEur: Math.round((dischargedKwh * dischargeCt) / 100),
    });
  }
  return points;
}

type BaseAsset = Omit<
  StorageAsset,
  "priceRules" | "fallbackAction" | "automationEnabled" | "metrics"
> & {
  metrics: Omit<StorageAsset["metrics"], "daily">;
};

// Hand-authored demo fleet of storage assets (fictional data), used to
// populate the UI before a real backend/data source is wired up.
const baseAssets: BaseAsset[] = [
  {
    id: "bess-berlin-01",
    model: "Megapack 2 XL",
    manufacturer: "Tesla",
    connectionKw: 1927,
    capacityKwh: 3916,
    soc: 78,
    status: "aktiv",
    address: { street: "Wolfener Str. 32", zip: "12681", city: "Berlin" },
    lat: 52.5382,
    lng: 13.5261,
    commissioned: "2024",
    metrics: {
      cycles: 412,
      chargedTotalMwh: 1613,
      dischargedTotalMwh: 1452,
      chargedTodayKwh: 2840,
      dischargedTodayKwh: 2610,
      roundTripPct: 90,
      powerKw: 1240,
      weekly: week(1, 2700, true),
    },
  },
  {
    id: "bess-hamburg-02",
    model: "PowerTitan 2.0",
    manufacturer: "Sungrow",
    connectionKw: 2500,
    capacityKwh: 5015,
    soc: 54,
    status: "aktiv",
    address: { street: "Am Sandtorkai 48", zip: "20457", city: "Hamburg" },
    lat: 53.5436,
    lng: 9.9955,
    commissioned: "2025",
    metrics: {
      cycles: 168,
      chargedTotalMwh: 842,
      dischargedTotalMwh: 761,
      chargedTodayKwh: 3620,
      dischargedTodayKwh: 3410,
      roundTripPct: 89,
      powerKw: -1870,
      weekly: week(2, 3500, true),
    },
  },
  {
    id: "bess-leipzig-03",
    model: "Battery-Box HVS",
    manufacturer: "BYD",
    connectionKw: 630,
    capacityKwh: 1280,
    soc: 12,
    status: "getrennt",
    address: { street: "Zwickauer Str. 174", zip: "04277", city: "Leipzig" },
    lat: 51.3103,
    lng: 12.3762,
    commissioned: "2023",
    metrics: {
      cycles: 890,
      chargedTotalMwh: 1104,
      dischargedTotalMwh: 998,
      chargedTodayKwh: 0,
      dischargedTodayKwh: 0,
      roundTripPct: 87,
      powerKw: 0,
      weekly: week(3, 900, false),
    },
  },
  {
    id: "bess-muenchen-04",
    model: "EnerOne+",
    manufacturer: "CATL",
    connectionKw: 1720,
    capacityKwh: 3440,
    soc: 66,
    status: "aktiv",
    address: { street: "Frankfurter Ring 193", zip: "80807", city: "München" },
    lat: 48.1978,
    lng: 11.5803,
    commissioned: "2024",
    metrics: {
      cycles: 305,
      chargedTotalMwh: 1188,
      dischargedTotalMwh: 1071,
      chargedTodayKwh: 2210,
      dischargedTodayKwh: 2450,
      roundTripPct: 91,
      powerKw: 980,
      weekly: week(4, 2300, true),
    },
  },
  {
    id: "bess-koeln-05",
    model: "Gridstack Pro",
    manufacturer: "Fluence",
    connectionKw: 2000,
    capacityKwh: 4000,
    soc: 41,
    status: "aktiv",
    address: { street: "Merkenicher Str. 224", zip: "50735", city: "Köln" },
    lat: 51.0035,
    lng: 6.9705,
    commissioned: "2025",
    metrics: {
      cycles: 97,
      chargedTotalMwh: 471,
      dischargedTotalMwh: 419,
      chargedTodayKwh: 3010,
      dischargedTodayKwh: 2780,
      roundTripPct: 88,
      powerKw: -640,
      weekly: week(5, 2900, true),
    },
  },
  {
    id: "bess-bremen-06",
    model: "Sigenstor 8.0",
    manufacturer: "Sigenergy",
    connectionKw: 400,
    capacityKwh: 800,
    soc: 0,
    status: "getrennt",
    address: { street: "Hansator 3", zip: "28217", city: "Bremen" },
    lat: 53.1128,
    lng: 8.7648,
    commissioned: "2023",
    metrics: {
      cycles: 1210,
      chargedTotalMwh: 968,
      dischargedTotalMwh: 872,
      chargedTodayKwh: 0,
      dischargedTodayKwh: 0,
      roundTripPct: 86,
      powerKw: 0,
      weekly: week(6, 620, false),
    },
  },
  {
    id: "bess-stuttgart-07",
    model: "Megapack 2 XL",
    manufacturer: "Tesla",
    connectionKw: 1927,
    capacityKwh: 3916,
    soc: 93,
    status: "aktiv",
    address: { street: "Heilbronner Str. 380", zip: "70469", city: "Stuttgart" },
    lat: 48.8107,
    lng: 9.1832,
    commissioned: "2025",
    metrics: {
      cycles: 143,
      chargedTotalMwh: 561,
      dischargedTotalMwh: 503,
      chargedTodayKwh: 3380,
      dischargedTodayKwh: 1240,
      roundTripPct: 90,
      powerKw: 1710,
      weekly: week(7, 2600, true),
    },
  },
  {
    id: "bess-hannover-08",
    model: "PowerTitan 2.0",
    manufacturer: "Sungrow",
    connectionKw: 2500,
    capacityKwh: 5015,
    soc: 61,
    status: "aktiv",
    address: { street: "Vahrenwalder Str. 269", zip: "30179", city: "Hannover" },
    lat: 52.4085,
    lng: 9.7364,
    commissioned: "2024",
    metrics: {
      cycles: 261,
      chargedTotalMwh: 1302,
      dischargedTotalMwh: 1177,
      chargedTodayKwh: 4020,
      dischargedTodayKwh: 3890,
      roundTripPct: 89,
      powerKw: -2100,
      weekly: week(8, 3900, true),
    },
  },
];

// Derives the full StorageAsset objects from the base data by attaching
// default price rules and generated daily history (scaled to each asset's
// weekly throughput).
export const mockAssets: StorageAsset[] = baseAssets.map((a, i) => {
  const scale = Math.max(1, ...a.metrics.weekly.map((w) => w.chargedKwh));
  return {
    ...a,
    priceRules: defaultRules(a.id),
    fallbackAction: FALLBACK,
    automationEnabled: a.status === "aktiv",
    metrics: {
      ...a.metrics,
      daily: daily(i + 1, scale, a.status === "aktiv"),
    },
  };
});
