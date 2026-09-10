import { NextResponse } from "next/server";
import { currentSpotPriceCt } from "@/lib/price-rules";

// Run the handler on every request (to pick up the current hourly slot);
// the upstream data itself is cached for 15 minutes via the fetch cache.
export const dynamic = "force-dynamic";

interface AwattarSlot {
  start_timestamp: number;
  end_timestamp: number;
  marketprice: number; // Eur/MWh
  unit: string;
}

/**
 * Current day-ahead/spot price (EPEX, DE-LU) via aWATTar.
 * Response: { priceCt, source, slotLabel, updatedAt }.
 * ct/kWh = marketprice(Eur/MWh) / 10.
 */
export async function GET() {
  // Static fallback value used whenever the upstream API is unreachable
  // or returns no usable data.
  const fallback = {
    priceCt: currentSpotPriceCt,
    source: "fallback" as const,
    slotLabel: "",
    updatedAt: new Date().toISOString(),
  };

  try {
    const res = await fetch("https://api.awattar.de/v1/marketdata", {
      next: { revalidate: 900 }, // Reuse the fetch result for up to 15 minutes
    });
    if (!res.ok) return NextResponse.json(fallback);

    const json = (await res.json()) as { data?: AwattarSlot[] };
    const slots = json.data ?? [];
    const now = Date.now();
    // Find the slot covering the current time, falling back to the first slot
    const slot =
      slots.find((d) => now >= d.start_timestamp && now < d.end_timestamp) ??
      slots[0];
    if (!slot) return NextResponse.json(fallback);

    const priceCt = Math.round((slot.marketprice / 10) * 10) / 10;
    const time = new Intl.DateTimeFormat("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Berlin",
    });
    // Human-readable time range for the active slot, e.g. "14:00–15:00"
    const slotLabel = `${time.format(slot.start_timestamp)}–${time.format(
      slot.end_timestamp,
    )}`;

    return NextResponse.json({
      priceCt,
      source: "awattar" as const,
      slotLabel,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    // Network error or malformed response — serve the fallback instead of failing
    return NextResponse.json(fallback);
  }
}
