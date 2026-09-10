"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Container, Search, ShieldCheck, TrendingUp, Zap, ZapOff } from "lucide-react";
import type { PriceRule, RuleAction, StorageAsset } from "@/lib/types";
import { nf } from "@/lib/format";
import { currentSpotPriceCt } from "@/lib/price-rules";
import AssetCard from "./AssetCard";
import StatusDialog from "./StatusDialog";
import PriceControlDialog from "./PriceControlDialog";

// Leaflet accesses `window` → must be loaded client-side only (no SSR).
const AssetMap = dynamic(() => import("./AssetMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-mist text-sm text-navy-900/40">
      Karte wird geladen … {/* "Loading map …" */}
    </div>
  ),
});

// "alle" = all, "aktiv" = active, "getrennt" = disconnected
type Filter = "alle" | "aktiv" | "getrennt";

// Main asset overview screen: header with KPIs and admin toggle, a
// searchable/filterable list of assets on the left, a map on the right,
// and the status/price-control dialogs when opened.
export default function AssetsView({
  assets: initialAssets,
}: {
  assets: StorageAsset[];
}) {
  // Local, mutable copy of the assets so price-rule edits can update the UI
  // without a full page reload (no backend persistence yet).
  const [assets, setAssets] = useState<StorageAsset[]>(initialAssets);
  const [selectedId, setSelectedId] = useState<string | null>(assets[0]?.id ?? null);
  const [statusAssetId, setStatusAssetId] = useState<string | null>(null);
  const [adminAssetId, setAdminAssetId] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState(false);
  const [filter, setFilter] = useState<Filter>("alle");
  const [query, setQuery] = useState("");

  // Live spot price state; starts with the static fallback value and is
  // refreshed from the API once the component mounts.
  const [spotPriceCt, setSpotPriceCt] = useState(currentSpotPriceCt);
  const [priceSource, setPriceSource] = useState<"awattar" | "fallback">("fallback");
  const [slotLabel, setSlotLabel] = useState("");

  // Fetch the current spot price once on mount. `alive` guards against
  // updating state after the component has unmounted.
  useEffect(() => {
    let alive = true;
    fetch("/api/spot-price")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (typeof d.priceCt === "number") setSpotPriceCt(d.priceCt);
        if (d.source === "awattar" || d.source === "fallback") setPriceSource(d.source);
        if (typeof d.slotLabel === "string") setSlotLabel(d.slotLabel);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Short label next to the price KPI: shows the live slot time, or
  // "Richtwert" (reference value) when using the static fallback.
  const priceHint =
    priceSource === "awattar" ? `Live${slotLabel ? ` · ${slotLabel}` : ""}` : "Richtwert";

  // Persists price-rule changes from the admin dialog into local state.
  function saveRules(
    assetId: string,
    rules: PriceRule[],
    fallback: RuleAction,
    automationEnabled: boolean,
  ) {
    setAssets((prev) =>
      prev.map((a) =>
        a.id === assetId
          ? { ...a, priceRules: rules, fallbackAction: fallback, automationEnabled }
          : a,
      ),
    );
    setAdminAssetId(null);
  }

  const activeCount = assets.filter((a) => a.status === "aktiv").length;
  const totalMw = assets
    .filter((a) => a.status === "aktiv")
    .reduce((s, a) => s + a.connectionKw, 0);

  // Assets currently shown in the list, after applying the status filter
  // and the free-text search query.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assets.filter((a) => {
      if (filter !== "alle" && a.status !== filter) return false;
      if (!q) return true;
      return (
        a.model.toLowerCase().includes(q) ||
        a.manufacturer.toLowerCase().includes(q) ||
        a.address.city.toLowerCase().includes(q)
      );
    });
  }, [assets, filter, query]);

  const statusAsset = assets.find((a) => a.id === statusAssetId) ?? null;
  const adminAsset = assets.find((a) => a.id === adminAssetId) ?? null;

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-black/5 bg-white px-8 py-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-lime-600">
            <Container size={15} /> Assets
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-navy-900">Batteriespeicher</h1>
        </div>
        <div className="flex flex-wrap items-stretch justify-end gap-3">
          <Kpi label="Standorte" value={nf(assets.length)} icon={<Container size={16} />} />
          <Kpi
            label="Aktiv"
            value={`${activeCount}/${assets.length}`}
            icon={<Zap size={16} />}
            tone="green"
          />
          <Kpi
            label="Börsenpreis"
            value={`${spotPriceCt.toLocaleString("de-DE", { minimumFractionDigits: 1 })} ct`}
            icon={<TrendingUp size={16} />}
            tone="lime"
            hint={priceHint}
            live={priceSource === "awattar"}
          />
          <button
            onClick={() => setAdminMode((v) => !v)}
            className={`flex items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition ${
              adminMode
                ? "border-navy-900 bg-navy-900 text-lime-400 shadow-card"
                : "border-black/5 bg-white text-navy-900/70 shadow-card hover:text-navy-900"
            }`}
          >
            <ShieldCheck size={16} />
            Adminbereich
          </button>
        </div>
      </header>

      {/* Content: list on the left, map on the right */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(380px,460px)_1fr]">
        {/* Asset list */}
        <div className="flex min-h-0 flex-col border-r border-black/5 bg-background">
          <div className="space-y-3 border-b border-black/5 bg-white px-5 py-4">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-900/40"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Modell, Hersteller oder Ort suchen …"
                className="w-full rounded-xl border border-black/10 bg-mist py-2 pl-9 pr-3 text-sm text-navy-900 placeholder:text-navy-900/40 focus:border-lime-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              {(
                [
                  ["alle", "Alle", null],
                  ["aktiv", "Aktiv", <Zap key="z" size={13} />],
                  ["getrennt", "Getrennt", <ZapOff key="zo" size={13} />],
                ] as [Filter, string, React.ReactNode][]
              ).map(([id, label, icon]) => (
                <button
                  key={id}
                  onClick={() => setFilter(id)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    filter === id
                      ? "bg-navy-900 text-lime-400"
                      : "bg-mist text-navy-900/60 hover:text-navy-900"
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {visible.map((a) => (
              <AssetCard
                key={a.id}
                asset={a}
                selected={a.id === selectedId}
                adminMode={adminMode}
                spotPriceCt={spotPriceCt}
                onSelect={() => setSelectedId(a.id)}
                onOpenStatus={() => setStatusAssetId(a.id)}
                onOpenAdmin={() => setAdminAssetId(a.id)}
              />
            ))}
            {visible.length === 0 && (
              <p className="pt-8 text-center text-sm text-navy-900/40">
                Keine Speicher gefunden.
              </p>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="relative min-h-[420px]">
          <AssetMap assets={assets} selectedId={selectedId} onSelect={setSelectedId} />
          <div className="pointer-events-none absolute bottom-4 left-4 z-[500] flex gap-3 rounded-xl border border-black/5 bg-white/90 px-3 py-2 text-xs font-medium text-navy-900/80 shadow-card backdrop-blur">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-signal-green" /> aktiv
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-signal-red" /> getrennt
            </span>
          </div>
        </div>
      </div>

      {statusAsset && (
        <StatusDialog asset={statusAsset} onClose={() => setStatusAssetId(null)} />
      )}
      {adminAsset && (
        <PriceControlDialog
          asset={adminAsset}
          spotPriceCt={spotPriceCt}
          priceSourceLabel={
            priceSource === "awattar"
              ? `Live · EPEX Day-Ahead${slotLabel ? ` · ${slotLabel}` : ""}`
              : "Richtwert (Live-Preis nicht verfügbar)"
          }
          onClose={() => setAdminAssetId(null)}
          onSave={saveRules}
        />
      )}
    </div>
  );
}

// Small KPI tile used in the header (e.g. site count, active count, price).
function Kpi({
  label,
  value,
  icon,
  tone,
  hint,
  live,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "green" | "lime";
  hint?: string;
  live?: boolean;
}) {
  const t =
    tone === "green" ? "text-signal-green" : tone === "lime" ? "text-lime-600" : "text-navy-500";
  return (
    <div className="rounded-xl border border-black/5 bg-white px-4 py-2 shadow-card">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-navy-900/50">
        <span className={t}>{icon}</span>
        {label}
      </div>
      <div className="mt-0.5 font-mono text-lg font-semibold text-navy-900">{value}</div>
      {hint && (
        <div className="flex items-center gap-1 text-[10px] font-medium text-navy-900/45">
          {live && (
            <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-signal-green" />
          )}
          {hint}
        </div>
      )}
    </div>
  );
}
