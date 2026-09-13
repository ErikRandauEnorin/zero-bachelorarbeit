import { NextResponse } from "next/server";
import { heatGet } from "@/lib/heat-auth";

// Run the handler on every request; the auth helper attaches a static
// bearer token, so there is no session/login to cache.
export const dynamic = "force-dynamic";

interface HeatSite {
  siteId: string;
  siteName?: string;
  isOnline?: boolean;
}

interface HeatAsset {
  id?: string;
  type?: string;
  activePowerkW?: number;
  soc?: number; // %, bess only
}

interface HeatSiteDetail extends HeatSite {
  reportedAt?: string;
  assets: {
    grid?: HeatAsset | null;
    bess?: HeatAsset | null;
    load?: HeatAsset | null;
    solar?: HeatAsset | null;
    ev?: HeatAsset | null;
    heatpump?: HeatAsset | null;
    genset?: HeatAsset | null;
    wind?: HeatAsset | null;
  };
}

// kW (as delivered by HEAT) -> W, to match the Watt convention of the other
// site integrations. `null`/`undefined` assets are a valid state, not an error.
function toWatts(kw: number | undefined): number | null {
  return kw != null ? kw * 1000 : null;
}

/**
 * Current HEAT Cloud site overview (grid/PV/battery/load power) via the
 * HEAT Cloud API. Uses HEAT_SITE_ID if set, otherwise the first site
 * returned by the account.
 * Response: { gridPowerW, pvPowerW, batteryPowerW, loadPowerW, batterySoc, isOnline, siteId, siteName, source, updatedAt }.
 */
export async function GET() {
  // Fallback used whenever the upstream API is unreachable, unauthenticated,
  // has no site onboarded yet, or returns no usable data — keeps the
  // endpoint from ever hard-failing.
  const fallback = {
    gridPowerW: null,
    pvPowerW: null,
    batteryPowerW: null,
    loadPowerW: null,
    batterySoc: null,
    isOnline: null,
    siteId: null,
    siteName: null,
    source: "fallback" as const,
    updatedAt: new Date().toISOString(),
  };

  try {
    let siteId = process.env.HEAT_SITE_ID;
    if (!siteId) {
      const { sites } = await heatGet<{ sites: HeatSite[] }>("/public/sites");
      siteId = sites?.[0]?.siteId;
    }
    if (!siteId) return NextResponse.json(fallback);

    const site = await heatGet<HeatSiteDetail>(`/public/sites/${siteId}`);
    const { grid, bess, load, solar } = site.assets ?? {};

    return NextResponse.json({
      gridPowerW: toWatts(grid?.activePowerkW),
      pvPowerW: toWatts(solar?.activePowerkW),
      batteryPowerW: toWatts(bess?.activePowerkW),
      loadPowerW: toWatts(load?.activePowerkW),
      batterySoc: bess?.soc ?? null,
      isOnline: site.isOnline ?? null,
      siteId: site.siteId,
      siteName: site.siteName ?? null,
      source: "heat" as const,
      updatedAt: site.reportedAt ?? new Date().toISOString(),
    });
  } catch {
    // Network/auth error, no site onboarded, or malformed response — serve
    // the fallback instead of failing.
    return NextResponse.json(fallback);
  }
}
