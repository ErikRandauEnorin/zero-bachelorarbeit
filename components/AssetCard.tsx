"use client";

import { useEffect, useState } from "react";
import {
  MapPin, Plug, BatteryCharging, ChevronRight,
  SlidersHorizontal, ArrowDownToLine, ArrowUpFromLine, Pause,
} from "lucide-react";
import type { RuleAction, StorageAsset } from "@/lib/types";
import { nf } from "@/lib/format";
import { ACTION_LABEL, evaluateRules } from "@/lib/price-rules";
import StorageThumbnail from "./StorageThumbnail";

// ---------------------------------------------------------------------------
// Types for the monitoring/current API response
// ---------------------------------------------------------------------------

interface Measurement {
  id: number;
  assetId: number;
  measurementType: string;
  observedAt: string;
  value: number;
  unit: string;
  sourceProvider: string;
  sourceRef: string;
  createdAt: string;
}

interface MonitoringCurrentResponse {
  assetId: number;
  measurements: Measurement[];
}

// Helper: extract a value by measurementType, returns undefined if not found.
function pick(measurements: Measurement[], type: string): number | undefined {
  return measurements.find((m) => m.measurementType === type)?.value;
}

// ---------------------------------------------------------------------------
// AutomationChip + SocBar (unverändert)
// ---------------------------------------------------------------------------

function AutomationChip({ action, enabled }: { action: RuleAction; enabled: boolean }) {
  if (!enabled) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-navy-900/8 px-2 py-0.5 text-[11px] font-semibold text-navy-900/45">
        <Pause size={11} /> Automatik aus
      </span>
    );
  }
  const map = {
    laden:    { t: "text-signal-green", b: "bg-signal-green/12", i: <ArrowDownToLine size={11} /> },
    entladen: { t: "text-lime-600",     b: "bg-lime-400/25",     i: <ArrowUpFromLine size={11} /> },
    standby:  { t: "text-navy-900/55",  b: "bg-navy-900/8",      i: <Pause size={11} /> },
  }[action];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${map.b} ${map.t}`}>
      {map.i} Auto: {ACTION_LABEL[action]}
    </span>
  );
}

function SocBar({ soc, active }: { soc: number; active: boolean }) {
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-navy-900/10">
      <div
        className={`h-full rounded-full ${active ? "bg-signal-green" : "bg-signal-red"} transition-all`}
        style={{ width: `${soc}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// AssetCard
//
// Stammdaten (model, capacityKwh, address, …) → asset-Prop (Server/Prisma)
// Telemetrie  (soc, powerKw)                  → monitoring/current API (live)
//
// Diese Trennung entspricht der Architekturkonzeption der Bachelorarbeit:
//   • Stammdaten  → Asset-Tabelle        (stabil, provider-unabhängig)
//   • Telemetrie  → AssetMeasurement     (Zeitreihe, provider-gesourct)
// ---------------------------------------------------------------------------

export default function AssetCard({
  asset, selected, adminMode, spotPriceCt,
  onSelect, onOpenStatus, onOpenAdmin,
}: {
  asset: StorageAsset;
  selected: boolean;
  adminMode: boolean;
  spotPriceCt: number;
  onSelect: () => void;
  onOpenStatus: () => void;
  onOpenAdmin: () => void;
}) {
  const active = asset.status === "aktiv";

  // Live-Telemetrie – Startwert aus dem statischen Asset-Prop (Seed/Fallback)
  const [liveSoc, setLiveSoc] = useState<number>(asset.soc);
  const [livePowerKw, setLivePowerKw] = useState<number>(asset.metrics.powerKw);
  const [telemetryLoading, setTelemetryLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    fetch(`/api/assets/${asset.id}/monitoring/current`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<MonitoringCurrentResponse>;
      })
      .then((data) => {
        if (!alive) return;
        const soc   = pick(data.measurements, "battery_soc");
        const power = pick(data.measurements, "grid_power");
        if (soc   !== undefined) setLiveSoc(soc);
        if (power !== undefined) setLivePowerKw(power);
      })
      .catch(() => {
        // Fehler → Fallback-Werte bleiben erhalten, kein UI-Crash
      })
      .finally(() => {
        if (alive) setTelemetryLoading(false);
      });

    return () => { alive = false; };
  }, [asset.id]);

  const evalResult = evaluateRules(asset.priceRules, asset.fallbackAction, spotPriceCt);

  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-card border bg-white p-4 text-left shadow-card transition ${
        selected ? "border-lime-500 ring-1 ring-lime-400" : "border-black/5 hover:border-navy-900/15"
      }`}
    >
      <div className="flex gap-4">
        <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-xl bg-mist p-1.5">
          <StorageThumbnail soc={liveSoc} status={asset.status} className="h-full w-full" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-navy-900">{asset.model}</h3>
              <p className="text-xs text-navy-900/50">{asset.manufacturer}</p>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              active ? "bg-signal-green/12 text-signal-green" : "bg-signal-red/12 text-signal-red"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-signal-green" : "bg-signal-red"}`} />
              {active ? "aktiv" : "getrennt"}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-navy-900/70">
            <div className="flex items-center gap-1.5">
              <Plug size={13} className="text-navy-500" />
              {/* Live-Leistung: + = Laden, − = Entladen */}
              <span className="font-mono text-navy-900">
                {telemetryLoading ? "…" : nf(livePowerKw)}
              </span>{" "}kW
            </div>
            <div className="flex items-center gap-1.5">
              <BatteryCharging size={13} className="text-navy-500" />
              <span className="font-mono text-navy-900">{nf(asset.capacityKwh)}</span> kWh
            </div>
            <div className="col-span-2 flex items-center gap-1.5 truncate">
              <MapPin size={13} className="shrink-0 text-navy-500" />
              <span className="truncate">
                {asset.address.street}, {asset.address.zip} {asset.address.city}
              </span>
            </div>
          </div>

          {/* Ladestand aus Live-Telemetrie */}
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-navy-900/50">Ladestand</span>
              <span className="font-mono font-semibold text-navy-900">
                {telemetryLoading ? "…" : `${liveSoc}%`}
              </span>
            </div>
            <SocBar soc={liveSoc} active={active} />
          </div>
        </div>
      </div>

      {/* Actions (unverändert) */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div>
          {adminMode && <AutomationChip action={evalResult.action} enabled={asset.automationEnabled} />}
        </div>
        <div className="flex items-center gap-2">
          {adminMode && (
            <span
              role="button" tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onOpenAdmin(); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onOpenAdmin(); } }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-navy-900/15 px-3 py-1.5 text-xs font-semibold text-navy-900 transition hover:border-navy-900/30 hover:bg-mist"
            >
              <SlidersHorizontal size={13} /> Preissteuerung
            </span>
          )}
          <span
            role="button" tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onOpenStatus(); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onOpenStatus(); } }}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-lime-400 px-3.5 py-1.5 text-xs font-semibold text-navy-900 transition hover:bg-lime-300"
          >
            Status <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </button>
  );
}