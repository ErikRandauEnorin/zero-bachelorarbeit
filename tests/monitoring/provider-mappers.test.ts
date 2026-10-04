import {
  describe,
  expect,
  it,
} from "vitest";

import { mapHeatSiteData } from
  "../../lib/monitoring/providers/heat-mapper";
import { mapWeylandPowerData } from
  "../../lib/monitoring/providers/weyland-mapper";

describe("Provider-Messwertnormalisierung", () => {
  it("normalisiert Weyland-Leistung von Watt nach Kilowatt", () => {
    const observedAt =
      new Date("2026-10-04T12:00:00.000Z");

    const result = mapWeylandPowerData(
      {
        grid: 1500,
        pv: 2400,
        battery: -500,
        load: 3400,
        unit: "W",
      },
      "weyland-device-test",
      observedAt,
    );

    expect(result).toEqual([
      {
        measurementType: "grid_power",
        value: 1.5,
        unit: "kW",
        observedAt,
        sourceRef: "weyland-device-test",
      },
      {
        measurementType: "pv_power",
        value: 2.4,
        unit: "kW",
        observedAt,
        sourceRef: "weyland-device-test",
      },
      {
        measurementType:
          "battery_power",
        value: -0.5,
        unit: "kW",
        observedAt,
        sourceRef: "weyland-device-test",
      },
      {
        measurementType: "load_power",
        value: 3.4,
        unit: "kW",
        observedAt,
        sourceRef: "weyland-device-test",
      },
    ]);
  });

  it("übernimmt HEAT-Leistung in Kilowatt und den Providerzeitstempel", () => {
    const fallback =
      new Date("2026-10-04T12:00:00.000Z");

    const result = mapHeatSiteData(
      {
        siteId: "heat-site-test",
        reportedAt:
          "2026-10-04T11:59:00.000Z",
        assets: {
          grid: {
            activePowerkW: 1.5,
          },
          solar: {
            activePowerkW: 2.4,
          },
          bess: {
            activePowerkW: -0.5,
            soc: 64,
          },
          load: {
            activePowerkW: 3.4,
          },
          heatpump: {
            activePowerkW: 0.8,
          },
        },
      },
      fallback,
    );

    expect(result).toContainEqual({
      measurementType: "grid_power",
      value: 1.5,
      unit: "kW",
      observedAt: new Date(
        "2026-10-04T11:59:00.000Z",
      ),
      sourceRef: "heat-site-test",
    });

    expect(result).toContainEqual({
      measurementType: "battery_soc",
      value: 64,
      unit: "%",
      observedAt: new Date(
        "2026-10-04T11:59:00.000Z",
      ),
      sourceRef: "heat-site-test",
    });

    expect(result).toContainEqual({
      measurementType:
        "heat_pump_power",
      value: 0.8,
      unit: "kW",
      observedAt: new Date(
        "2026-10-04T11:59:00.000Z",
      ),
      sourceRef: "heat-site-test",
    });
  });

  it("bildet beide Provider auf denselben kanonischen Netzleistungstyp ab", () => {
    const observedAt =
      new Date("2026-10-04T12:00:00.000Z");

    const weyland = mapWeylandPowerData(
      {
        grid: 1500,
      },
      "weyland-device-test",
      observedAt,
    );

    const heat = mapHeatSiteData(
      {
        siteId: "heat-site-test",
        reportedAt:
          observedAt.toISOString(),
        assets: {
          grid: {
            activePowerkW: 1.5,
          },
        },
      },
      observedAt,
    );

    expect(weyland[0].measurementType)
      .toBe("grid_power");

    expect(heat[0].measurementType)
      .toBe("grid_power");

    expect(weyland[0].unit).toBe("kW");
    expect(heat[0].unit).toBe("kW");

    expect(weyland[0].value).toBe(1.5);
    expect(heat[0].value).toBe(1.5);
  });

  it("verwirft ungültige Werte", () => {
    const observedAt =
      new Date("2026-10-04T12:00:00.000Z");

    const weyland = mapWeylandPowerData(
      {
        grid: null,
        pv: Number.NaN,
      },
      "weyland-device-test",
      observedAt,
    );

    const heat = mapHeatSiteData(
      {
        siteId: "heat-site-test",
        assets: {
          grid: {
            activePowerkW:
              Number.POSITIVE_INFINITY,
          },
          bess: {
            soc: 120,
          },
        },
      },
      observedAt,
    );

    expect(weyland).toEqual([]);
    expect(heat).toEqual([]);
  });
});