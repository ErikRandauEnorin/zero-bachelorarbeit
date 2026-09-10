"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Coins,
  Gauge,
  MoveHorizontal,
  RefreshCw,
  X,
  Zap,
} from "lucide-react";
import type { DailyPoint, StorageAsset } from "@/lib/types";
import { nf, nf1 } from "@/lib/format";

const MONTH_NAMES = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

// Formats a "yyyy-mm" key (from a DailyPoint date prefix) as "Month Year".
function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

// Formats a number as a Euro amount using German locale conventions.
function euro(n: number): string {
  return `${n.toLocaleString("de-DE", { maximumFractionDigits: 0 })} €`;
}

/** ISO calendar week number for a given date. */
function isoWeek(y: number, mIdx: number, d: number): number {
  const date = new Date(Date.UTC(y, mIdx, d));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = date.getTime();
  date.setUTCMonth(0, 1);
  if (date.getUTCDay() !== 4) {
    date.setUTCMonth(0, 1 + ((4 - date.getUTCDay() + 7) % 7));
  }
  return 1 + Math.round((firstThursday - date.getTime()) / (7 * 86_400_000));
}

interface BarDatum {
  label: string;
  chargedKwh: number;
  dischargedKwh: number;
  costEur: number;
  revenueEur: number;
}

/** Full-detail chart tooltip: shows all figures for the hovered day/week. */
function ChartTooltip({
  active,
  payload,
  granularity,
  selectedMonth,
}: {
  active?: boolean;
  payload?: { payload: BarDatum }[];
  granularity: Granularity;
  selectedMonth: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0].payload;
  const net = d.revenueEur - d.costEur;
  const title =
    granularity === "tage"
      ? `${d.label}. ${monthLabel(selectedMonth)}`
      : `${d.label} · ${monthLabel(selectedMonth)}`;

  return (
    <div className="min-w-[190px] rounded-xl border border-black/10 bg-white px-3 py-2 text-xs shadow-[0_8px_24px_rgb(7_41_59_/_0.14)]">
      <div className="mb-1.5 font-semibold text-navy-900">{title}</div>

      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-signal-green" />
        <span className="text-navy-900/60">Beladen</span>
        <span className="ml-auto font-mono font-semibold text-navy-900">
          {nf(d.chargedKwh)} kWh
        </span>
      </div>
      <div className="mb-1 pl-3.5 text-[11px] text-signal-red">
        Kosten {euro(d.costEur)}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-lime-500" />
        <span className="text-navy-900/60">Entladen</span>
        <span className="ml-auto font-mono font-semibold text-navy-900">
          {nf(d.dischargedKwh)} kWh
        </span>
      </div>
      <div className="pl-3.5 text-[11px] text-signal-green">
        Einnahmen {euro(d.revenueEur)}
      </div>

      <div className="mt-1.5 flex items-center border-t border-black/5 pt-1.5">
        <span className="text-navy-900/60">Netto</span>
        <span
          className={`ml-auto font-mono font-semibold ${
            net >= 0 ? "text-signal-green" : "text-signal-red"
          }`}
        >
          {euro(net)}
        </span>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  unit,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  accent?: "green" | "lime" | "sky";
}) {
  const tone =
    accent === "green"
      ? "text-signal-green"
      : accent === "sky"
        ? "text-navy-500"
        : "text-lime-600";
  return (
    <div className="rounded-2xl border border-black/5 bg-mist p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-navy-900/55">
        <span className={tone}>{icon}</span>
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-mono text-2xl font-semibold text-navy-900">{value}</span>
        <span className="text-sm text-navy-900/45">{unit}</span>
      </div>
    </div>
  );
}

// "tage" = days, "wochen" = weeks
type Granularity = "tage" | "wochen";
// "energie" = energy (kWh), "erloes" = revenue/cost (€)
type Metric = "energie" | "erloes";

// Detail dialog for a single asset: shows key operational metrics plus a
// filterable bar chart of charge/discharge throughput and cost/revenue
// over time (by day or by week, for a selected month).
export default function StatusDialog({
  asset,
  onClose,
}: {
  asset: StorageAsset;
  onClose: () => void;
}) {
  const m = asset.metrics;
  const active = asset.status === "aktiv";

  // Distinct months (yyyy-mm) available in the daily data
  const months = useMemo(() => {
    const set = new Set<string>();
    for (const p of m.daily) set.add(p.date.slice(0, 7));
    return [...set].sort();
  }, [m.daily]);

  const [selectedMonth, setSelectedMonth] = useState(
    () => months[months.length - 1] ?? "",
  );
  const [granularity, setGranularity] = useState<Granularity>("tage");
  const [metric, setMetric] = useState<Metric>("energie");

  // Close on Escape and lock body scroll while the modal is open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Daily data points belonging to the currently selected month
  const monthDays = useMemo(
    () => m.daily.filter((p) => p.date.slice(0, 7) === selectedMonth),
    [m.daily, selectedMonth],
  );

  // Sum of charged/discharged energy and cost/revenue across the selected month
  const totals = useMemo(() => {
    return monthDays.reduce(
      (acc, p) => {
        acc.chargedKwh += p.chargedKwh;
        acc.dischargedKwh += p.dischargedKwh;
        acc.costEur += p.costEur;
        acc.revenueEur += p.revenueEur;
        return acc;
      },
      { chargedKwh: 0, dischargedKwh: 0, costEur: 0, revenueEur: 0 },
    );
  }, [monthDays]);

  // Bar chart data: either one bar per day, or aggregated per calendar week
  const bars: BarDatum[] = useMemo(() => {
    if (granularity === "tage") {
      return monthDays.map((p: DailyPoint) => ({
        label: String(Number(p.date.slice(8, 10))),
        chargedKwh: p.chargedKwh,
        dischargedKwh: p.dischargedKwh,
        costEur: p.costEur,
        revenueEur: p.revenueEur,
      }));
    }
    // Aggregate by calendar week
    const byWeek = new Map<number, BarDatum>();
    for (const p of monthDays) {
      const [y, mo, da] = p.date.split("-").map(Number);
      const w = isoWeek(y, mo - 1, da);
      const cur =
        byWeek.get(w) ??
        { label: `KW ${w}`, chargedKwh: 0, dischargedKwh: 0, costEur: 0, revenueEur: 0 };
      cur.chargedKwh += p.chargedKwh;
      cur.dischargedKwh += p.dischargedKwh;
      cur.costEur += p.costEur;
      cur.revenueEur += p.revenueEur;
      byWeek.set(w, cur);
    }
    return [...byWeek.values()];
  }, [monthDays, granularity]);

  const isEnergy = metric === "energie";
  const keyA = isEnergy ? "chargedKwh" : "costEur";
  const keyB = isEnergy ? "dischargedKwh" : "revenueEur";
  const labelA = isEnergy ? "Beladen" : "Kosten (Beladen)"; // "Charged" : "Cost (charging)"
  const labelB = isEnergy ? "Entladen" : "Einnahmen (Entladen)"; // "Discharged" : "Revenue (discharging)"
  const unit = isEnergy ? "kWh" : "€";
  // Cost bars are red, revenue bars are green; for energy: charged is
  // green, discharged is lime.
  const colorA = isEnergy ? "#16a34a" : "#dc2626";
  const colorB = isEnergy ? "#a6cf12" : "#16a34a";

  const barWidth = granularity === "tage" ? 40 : 96;
  const innerWidth = Math.max(bars.length * barWidth, 480);
  // The chart viewport is roughly 520px wide — beyond that, the chart
  // needs to scroll horizontally.
  const scrollable = innerWidth > 520;
  const net = totals.revenueEur - totals.costEur;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Status ${asset.manufacturer} ${asset.model}`}
    >
      <div
        className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[1.5rem] border border-black/5 bg-white shadow-float">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-black/5 p-6">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-2.5 w-2.5 rounded-full ${
                  active ? "bg-signal-green" : "bg-signal-red"
                }`}
              />
              <span className="text-xs font-semibold uppercase tracking-wider text-navy-900/55">
                {active ? "Angeschlossen · aktiv" : "Getrennt"}
              </span>
            </div>
            <h2 className="mt-1 text-xl font-semibold text-navy-900">
              {asset.manufacturer} {asset.model}
            </h2>
            <p className="text-sm text-navy-900/50">
              {asset.address.street}, {asset.address.zip} {asset.address.city}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-navy-900/50 transition hover:bg-mist hover:text-navy-900"
            aria-label="Schließen"
          >
            <X size={20} />
          </button>
        </div>

        {/* Key figures */}
        <div className="grid grid-cols-2 gap-3 p-6 sm:grid-cols-3">
          <Stat
            icon={<RefreshCw size={15} />}
            label="Ladezyklen"
            value={nf(m.cycles)}
            unit="Zyklen"
          />
          <Stat
            icon={<Gauge size={15} />}
            label="Ladestand"
            value={String(asset.soc)}
            unit="%"
            accent="green"
          />
          <Stat
            icon={<Zap size={15} />}
            label="Leistung aktuell"
            value={m.powerKw === 0 ? "0" : nf(Math.abs(m.powerKw))}
            unit={m.powerKw < 0 ? "kW entladen" : m.powerKw > 0 ? "kW laden" : "kW"}
            accent="sky"
          />
          <Stat
            icon={<ArrowDownToLine size={15} />}
            label="Beladen gesamt"
            value={nf1(m.chargedTotalMwh)}
            unit="MWh"
            accent="lime"
          />
          <Stat
            icon={<ArrowUpFromLine size={15} />}
            label="Entladen gesamt"
            value={nf1(m.dischargedTotalMwh)}
            unit="MWh"
            accent="lime"
          />
          <Stat
            icon={<Gauge size={15} />}
            label="Round-Trip-η"
            value={String(m.roundTripPct)}
            unit="%"
          />
        </div>

        {/* Throughput history */}
        <div className="px-6 pb-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-medium uppercase tracking-wider text-navy-900/50">
              Durchsatz-Verlauf
            </div>
            {/* Toggles: Days/Weeks granularity + Energy/Revenue metric */}
            <div className="flex gap-2">
              <Toggle
                options={[
                  ["tage", "Tage"],
                  ["wochen", "Wochen"],
                ]}
                value={granularity}
                onChange={(v) => setGranularity(v as Granularity)}
              />
              <Toggle
                options={[
                  ["energie", "Energie"],
                  ["erloes", "Erlös"],
                ]}
                value={metric}
                onChange={(v) => setMetric(v as Metric)}
              />
            </div>
          </div>

          {/* Month filter */}
          <div className="no-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 pb-1">
            {months.map((key) => (
              <button
                key={key}
                onClick={() => setSelectedMonth(key)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  key === selectedMonth
                    ? "bg-navy-900 text-lime-400"
                    : "bg-mist text-navy-900/60 hover:text-navy-900"
                }`}
              >
                {monthLabel(key)}
              </button>
            ))}
          </div>

          {/* Cost / revenue summary tiles */}
          <div className="mb-3 grid grid-cols-3 gap-3">
            <SummaryTile
              icon={<ArrowDownToLine size={14} />}
              label="Beladen"
              main={`${nf(totals.chargedKwh)} kWh`}
              sub={`Kosten ${euro(totals.costEur)}`}
              tone="cost"
            />
            <SummaryTile
              icon={<ArrowUpFromLine size={14} />}
              label="Entladen"
              main={`${nf(totals.dischargedKwh)} kWh`}
              sub={`Einnahmen ${euro(totals.revenueEur)}`}
              tone="revenue"
            />
            <SummaryTile
              icon={<Coins size={14} />}
              label="Netto"
              main={euro(net)}
              sub={net >= 0 ? "Überschuss" : "Verlust"}
              tone={net >= 0 ? "revenue" : "cost"}
            />
          </div>

          {/* Chart – scrolls horizontally when it doesn't fit */}
          <div className="relative">
            {scrollable && (
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-14 rounded-r-2xl bg-gradient-to-l from-mist to-transparent" />
            )}
            <div className="no-scrollbar overflow-x-auto rounded-2xl border border-black/5 bg-mist p-3">
              <div style={{ width: innerWidth, height: 224 }}>
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bars} barGap={2} margin={{ top: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#c9d6de" opacity={0.7} />
                  <XAxis
                    dataKey="label"
                    stroke="#5c7383"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    interval={granularity === "tage" ? "preserveStartEnd" : 0}
                  />
                  <YAxis
                    stroke="#5c7383"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    cursor={{ fill: "#0b1620", opacity: 0.05 }}
                    content={
                      <ChartTooltip
                        granularity={granularity}
                        selectedMonth={selectedMonth}
                      />
                    }
                  />
                  <Legend
                    formatter={(v) => (v === keyA ? labelA : labelB)}
                    wrapperStyle={{ fontSize: 12, color: "#5c7383" }}
                  />
                  <Bar dataKey={keyA} fill={colorA} radius={[3, 3, 0, 0]} />
                  <Bar dataKey={keyB} fill={colorB} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-navy-900/45">
            <span>
              {unit === "kWh" ? "Energiedurchsatz je " : "Kosten & Einnahmen je "}
              {granularity === "tage" ? "Tag" : "Kalenderwoche"}
            </span>
            {scrollable && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-900/5 px-2.5 py-1 font-medium text-navy-900/60">
                <MoveHorizontal size={13} className="text-lime-600" />
                horizontal scrollen für alle {granularity === "tage" ? "Tage" : "Wochen"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Small segmented-control toggle used for the granularity/metric switches.
function Toggle({
  options,
  value,
  onChange,
}: {
  options: [string, string][];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-full bg-mist p-0.5">
      {options.map(([val, label]) => (
        <button
          key={val}
          onClick={() => onChange(val)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            value === val ? "bg-white text-navy-900 shadow-sm" : "text-navy-900/50"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// Small tile showing one summary figure (charged/discharged/net) with a subtitle.
function SummaryTile({
  icon,
  label,
  main,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  main: string;
  sub: string;
  tone: "cost" | "revenue";
}) {
  const toneClass = tone === "cost" ? "text-signal-red" : "text-signal-green";
  return (
    <div className="rounded-2xl border border-black/5 bg-mist p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-navy-900/55">
        <span className={toneClass}>{icon}</span>
        {label}
      </div>
      <div className="mt-1 font-mono text-base font-semibold text-navy-900">{main}</div>
      <div className={`text-[11px] font-medium ${toneClass}`}>{sub}</div>
    </div>
  );
}
