"use client";

import {
  MapPin,
  Plug,
  BatteryCharging,
  ChevronRight,
  SlidersHorizontal,
  ArrowDownToLine,
  ArrowUpFromLine,
  Pause,
} from "lucide-react";
import type { RuleAction, StorageAsset } from "@/lib/types";
import { nf } from "@/lib/format";
import { ACTION_LABEL, evaluateRules } from "@/lib/price-rules";
import StorageThumbnail from "./StorageThumbnail";

// Small pill showing the current automation state: either "off" or the
// action (charge/discharge/standby) currently selected by the price rules.
function AutomationChip({
  action,
  enabled,
}: {
  action: RuleAction;
  enabled: boolean;
}) {
  if (!enabled) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-navy-900/8 px-2 py-0.5 text-[11px] font-semibold text-navy-900/45">
        <Pause size={11} /> Automatik aus
      </span>
    );
  }
  // Styling/icon per action type
  const map = {
    laden: { t: "text-signal-green", b: "bg-signal-green/12", i: <ArrowDownToLine size={11} /> },
    entladen: { t: "text-lime-600", b: "bg-lime-400/25", i: <ArrowUpFromLine size={11} /> },
    standby: { t: "text-navy-900/55", b: "bg-navy-900/8", i: <Pause size={11} /> },
  }[action];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${map.b} ${map.t}`}
    >
      {map.i} Auto: {ACTION_LABEL[action]}
    </span>
  );
}

// Thin horizontal bar visualizing the state-of-charge percentage.
function SocBar({ soc, active }: { soc: number; active: boolean }) {
  const color = active ? "bg-signal-green" : "bg-signal-red";
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-navy-900/10">
      <div
        className={`h-full rounded-full ${color} transition-all`}
        style={{ width: `${soc}%` }}
      />
    </div>
  );
}

// Card summarizing a single storage asset in the list view: model, key
// specs, current charge level, and (in admin mode) automation status plus
// quick actions to open the status or price-control dialogs.
export default function AssetCard({
  asset,
  selected,
  adminMode,
  spotPriceCt,
  onSelect,
  onOpenStatus,
  onOpenAdmin,
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
  // Determine what the price rules would currently do, given the live spot price
  const evalResult = evaluateRules(asset.priceRules, asset.fallbackAction, spotPriceCt);

  return (
    <button
      onClick={onSelect}
      className={`w-full rounded-card border bg-white p-4 text-left shadow-card transition ${
        selected
          ? "border-lime-500 ring-1 ring-lime-400"
          : "border-black/5 hover:border-navy-900/15"
      }`}
    >
      <div className="flex gap-4">
        {/* Model illustration */}
        <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-xl bg-mist p-1.5">
          <StorageThumbnail soc={asset.soc} status={asset.status} className="h-full w-full" />
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-navy-900">{asset.model}</h3>
              <p className="text-xs text-navy-900/50">{asset.manufacturer}</p>
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                active
                  ? "bg-signal-green/12 text-signal-green"
                  : "bg-signal-red/12 text-signal-red"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  active ? "bg-signal-green" : "bg-signal-red"
                }`}
              />
              {active ? "aktiv" : "getrennt"}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-navy-900/70">
            <div className="flex items-center gap-1.5">
              <Plug size={13} className="text-navy-500" />
              <span className="font-mono text-navy-900">{nf(asset.connectionKw)}</span> kW
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

          {/* State of charge */}
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-navy-900/50">Ladestand</span>
              <span className="font-mono font-semibold text-navy-900">{asset.soc}%</span>
            </div>
            <SocBar soc={asset.soc} active={active} />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div>
          {adminMode && (
            <AutomationChip action={evalResult.action} enabled={asset.automationEnabled} />
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* These are <span> elements styled as buttons (since the whole card
              is already a <button>, nested <button>s would be invalid HTML),
              so role/tabIndex/onKeyDown are added manually for accessibility. */}
          {adminMode && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onOpenAdmin();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpenAdmin();
                }
              }}
              className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-navy-900/15 px-3 py-1.5 text-xs font-semibold text-navy-900 transition hover:border-navy-900/30 hover:bg-mist"
            >
              <SlidersHorizontal size={13} />
              Preissteuerung
            </span>
          )}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onOpenStatus();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onOpenStatus();
              }
            }}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-lime-400 px-3.5 py-1.5 text-xs font-semibold text-navy-900 transition hover:bg-lime-300"
          >
            Status
            <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </button>
  );
}
