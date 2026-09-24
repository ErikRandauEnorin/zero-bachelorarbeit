import { cookies } from "next/headers";
import Sidebar from "@/components/Sidebar";
import AssetsView from "@/components/AssetsView";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { getPrisma } from "@/lib/prisma";
import type { StorageAsset } from "@/lib/types";

export default async function Home() {
  const session = verifySessionToken((await cookies()).get(AUTH_COOKIE_NAME)?.value);
  if (!session) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-background px-4 py-8">
        <div className="rounded-[2rem] border border-black/5 bg-white/95 p-10 text-center shadow-float backdrop-blur-sm">
          <p className="text-lg font-semibold text-navy-950">Bitte zuerst einloggen.</p>
          <p className="mt-3 text-sm text-navy-900/60">Du wirst automatisch zur Login-Seite weitergeleitet.</p>
          <a
            href="/login"
            className="mt-6 inline-flex rounded-xl bg-navy-900 px-5 py-3 text-sm font-semibold text-lime-400 transition hover:bg-navy-800"
          >
            Zur Anmeldung
          </a>
        </div>
      </div>
    );
  }

  const prisma = getPrisma();
  const dbAssets = await prisma.asset.findMany({
    include: { tenant: true },
    orderBy: { id: "asc" },
  });

  // Map DB assets → StorageAsset shape expected by AssetsView.
  // Live monitoring values (soc, powerKw, metrics) are placeholders here;
  // AssetCard will fetch them from /api/assets/[id]/monitoring/current.
  const assets: StorageAsset[] = dbAssets.map((a) => ({
    id: String(a.id),
    model: a.name ?? a.type ?? `Asset ${a.id}`,
    manufacturer: a.tenant.name,
    connectionKw: 0,
    capacityKwh: 0,
    soc: 0,
    status: "aktiv",
    address: { street: "", zip: "", city: "" },
    lat: 0,
    lng: 0,
    commissioned: a.createdAt.getFullYear().toString(),
    priceRules: [],
    fallbackAction: "standby",
    automationEnabled: false,
    metrics: {
      cycles: 0,
      chargedTotalMwh: 0,
      dischargedTotalMwh: 0,
      chargedTodayKwh: 0,
      dischargedTodayKwh: 0,
      roundTripPct: 0,
      powerKw: 0,
      weekly: [],
      daily: [],
    },
  }));

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <Sidebar />
      <main className="min-w-0 flex-1">
        <AssetsView assets={assets} />
      </main>
    </div>
  );
}