import { NextResponse } from "next/server";
import { parseSigencloudData, sigencloudGet } from "@/lib/sigencloud-auth";

// Run the handler on every request; the auth helper itself caches the
// bearer token in memory and only re-logs in shortly before it expires.
export const dynamic = "force-dynamic";

interface SigencloudSystem {
  id?: string;
  systemId?: string;
}

// The system list can come back as a bare array, as { list: [...] } /
// { records: [...] }, or — if no system is onboarded yet — as `{}`.
type SigencloudSystemList =
  | SigencloudSystem[]
  | { list?: SigencloudSystem[]; records?: SigencloudSystem[] };

interface SigencloudEnergyFlow {
  gridPower?: number; // Watt, +/- for import/export
  pvPower?: number; // Watt
  batteryPower?: number; // Watt, +/- for charge/discharge
  loadPower?: number; // Watt
  batterySoc?: number; // %
}

function extractSystems(data: SigencloudSystemList | undefined): SigencloudSystem[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.list ?? data.records ?? [];
}

/**
 * Current Sigen Cloud system overview (grid/PV/battery/load power) via the
 * Sigen Cloud OpenAPI. Looks up the first system on the account, then reads
 * its live energy flow.
 * Response: { gridPowerW, pvPowerW, batteryPowerW, loadPowerW, batterySoc, source, updatedAt }.
 */
export async function GET() {
  // Fallback used whenever the upstream API is unreachable, unauthenticated,
  // has no system onboarded yet, or returns no usable data — keeps the
  // endpoint from ever hard-failing.
  const fallback = {
    gridPowerW: null,
    pvPowerW: null,
    batteryPowerW: null,
    loadPowerW: null,
    batterySoc: null,
    source: "fallback" as const,
    updatedAt: new Date().toISOString(),
  };

  try {
    const systemList = await sigencloudGet<SigencloudSystemList>("/openapi/system");
    const [system] = extractSystems(parseSigencloudData(systemList.data));
    const systemId = system?.id ?? system?.systemId;
    if (!systemId) return NextResponse.json(fallback);

    const flowJson = await sigencloudGet<SigencloudEnergyFlow>(
      `/openapi/systems/${systemId}/energyFlow`,
    );
    const flow = parseSigencloudData(flowJson.data);
    if (!flow) return NextResponse.json(fallback);

    return NextResponse.json({
      gridPowerW: flow.gridPower ?? null,
      pvPowerW: flow.pvPower ?? null,
      batteryPowerW: flow.batteryPower ?? null,
      loadPowerW: flow.loadPower ?? null,
      batterySoc: flow.batterySoc ?? null,
      source: "sigencloud" as const,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Network/login error, no system onboarded, or malformed response —
    // serve the fallback instead of failing.
    return NextResponse.json(fallback);
  }
}
