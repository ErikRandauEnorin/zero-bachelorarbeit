import { NextResponse } from "next/server";
import { weylandGet } from "@/lib/weyland-auth";

// Run the handler on every request; the auth helper itself caches the
// bearer token in memory and only re-logs in shortly before it expires.
export const dynamic = "force-dynamic";

interface WeylandOverviewResponse {
  code?: number;
  message?: string;
  data?: {
    power?: {
      grid?: number; // Watt, +/- for import/export
      pv?: number; // Watt
      battery?: number; // Watt, +/- for charge/discharge
      load?: number; // Watt
      unit?: string;
    };
  };
}

/**
 * Current Weyland device overview (grid/PV/battery/load power) via the
 * Weyland Open Platform API.
 * Response: { gridPowerW, pvPowerW, batteryPowerW, loadPowerW, source, updatedAt }.
 */
export async function GET() {
  // Fallback used whenever the upstream API is unreachable, unauthenticated,
  // or returns no usable data — keeps the endpoint from ever hard-failing.
  const fallback = {
    gridPowerW: null,
    pvPowerW: null,
    batteryPowerW: null,
    loadPowerW: null,
    source: "fallback" as const,
    updatedAt: new Date().toISOString(),
  };

  try {
    const json = await weylandGet<WeylandOverviewResponse>(
      "/api-open/ems/v1/overview",
    );
    const power = json.data?.power;
    if (!power) return NextResponse.json(fallback);

    return NextResponse.json({
      gridPowerW: power.grid ?? null,
      pvPowerW: power.pv ?? null,
      batteryPowerW: power.battery ?? null,
      loadPowerW: power.load ?? null,
      source: "weyland" as const,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Network/login error or malformed response — serve the fallback instead of failing
    return NextResponse.json(fallback);
  }
}
