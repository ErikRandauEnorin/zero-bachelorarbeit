"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Pause,
  Plus,
  ShieldCheck,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import type { PriceRule, RuleAction, RuleOperator, StorageAsset } from "@/lib/types";
import { ACTION_LABEL, conditionLabel, evaluateRules } from "@/lib/price-rules";
import { nf } from "@/lib/format";

const ACTIONS: RuleAction[] = ["laden", "entladen", "standby"];
// Dropdown options for the rule operator select, with German labels
// ("höchstens" = at most, "mindestens" = at least, "zwischen" = between)
const OPERATORS: { value: RuleOperator; label: string }[] = [
  { value: "lte", label: "≤ (höchstens)" },
  { value: "gte", label: "≥ (mindestens)" },
  { value: "between", label: "zwischen" },
];

// Returns the text color, background color, and icon associated with an action.
function actionTone(a: RuleAction) {
  return a === "laden"
    ? { text: "text-signal-green", bg: "bg-signal-green/12", icon: <ArrowDownToLine size={14} /> }
    : a === "entladen"
      ? { text: "text-lime-600", bg: "bg-lime-400/25", icon: <ArrowUpFromLine size={14} /> }
      : { text: "text-navy-900/55", bg: "bg-navy-900/8", icon: <Pause size={14} /> };
}

// Module-level counter to generate unique ids for newly added rules
// within a single session (not persisted).
let uid = 0;
const newId = (assetId: string) => `${assetId}-new-${++uid}`;

// Admin dialog for editing an asset's price-based automation rules:
// shows the live evaluation result, lets the user add/reorder/edit/remove
// rules, set a fallback action, and toggle automation on/off.
export default function PriceControlDialog({
  asset,
  spotPriceCt,
  priceSourceLabel,
  onClose,
  onSave,
}: {
  asset: StorageAsset;
  spotPriceCt: number;
  priceSourceLabel?: string;
  onClose: () => void;
  onSave: (
    assetId: string,
    rules: PriceRule[],
    fallback: RuleAction,
    automationEnabled: boolean,
  ) => void;
}) {
  // Local editable copy of the rules; only committed to the parent via
  // onSave when the user clicks "Regeln speichern" (save rules).
  const [rules, setRules] = useState<PriceRule[]>(asset.priceRules);
  const [fallback, setFallback] = useState<RuleAction>(asset.fallbackAction);
  const [automation, setAutomation] = useState(asset.automationEnabled);

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

  // Live-evaluate the (possibly unsaved) rules against the current spot price
  const evalResult = evaluateRules(rules, fallback, spotPriceCt);
  const activeTone = actionTone(evalResult.action);
  const resultingKw =
    evalResult.action === "standby"
      ? 0
      : Math.round((asset.connectionKw * evalResult.powerPct) / 100);

  // Updates one rule's fields in place, by id.
  function patch(id: string, next: Partial<PriceRule>) {
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...next } : r)));
  }
  // Removes one rule by id.
  function remove(id: string) {
    setRules((rs) => rs.filter((r) => r.id !== id));
  }
  // Appends a new rule with sensible defaults (charge when price ≤ 10 ct/kWh).
  function add() {
    setRules((rs) => [
      ...rs,
      {
        id: newId(asset.id),
        operator: "lte",
        price: 10,
        action: "laden",
        powerPct: 100,
        enabled: true,
      },
    ]);
  }
  // Swaps a rule with its neighbor to change evaluation priority (rules are
  // checked top to bottom).
  function move(index: number, dir: -1 | 1) {
    setRules((rs) => {
      const next = [...rs];
      const j = index + dir;
      if (j < 0 || j >= next.length) return rs;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Preissteuerung ${asset.manufacturer} ${asset.model}`}
    >
      <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.5rem] border border-black/5 bg-white shadow-float">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-black/5 p-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-navy-900/55">
              <ShieldCheck size={14} className="text-lime-600" /> Adminbereich ·
              Preissteuerung
            </div>
            <h2 className="mt-1 text-xl font-semibold text-navy-900">
              {asset.manufacturer} {asset.model}
            </h2>
            <p className="text-sm text-navy-900/50">
              Automatik am Day-Ahead-/Spotmarkt: Regeln von oben nach unten geprüft,
              erste zutreffende gewinnt.
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

        {/* Live evaluation result */}
        <div className="flex flex-wrap items-center gap-4 border-b border-black/5 bg-mist px-6 py-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-navy-500" />
            <div>
              <div className="text-[11px] font-medium text-navy-900/50">
                Börsenpreis aktuell
              </div>
              <div className="font-mono text-lg font-semibold text-navy-900">
                {spotPriceCt.toLocaleString("de-DE", { minimumFractionDigits: 1 })}{" "}
                <span className="text-sm font-normal text-navy-900/45">ct/kWh</span>
              </div>
              {priceSourceLabel && (
                <div className="text-[10px] font-medium text-navy-900/45">
                  {priceSourceLabel}
                </div>
              )}
            </div>
          </div>
          <div className="text-navy-900/30">→</div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${activeTone.bg} ${activeTone.text}`}
            >
              {activeTone.icon}
              {ACTION_LABEL[evalResult.action]}
              {evalResult.action !== "standby" && ` · ${nf(resultingKw)} kW`}
            </span>
            <span className="text-xs text-navy-900/45">
              {evalResult.ruleId ? "greifende Regel" : "Fallback (keine Regel trifft)"}
            </span>
          </div>
          <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm font-medium text-navy-900">
            <span className="text-navy-900/60">Automatik</span>
            <button
              type="button"
              onClick={() => setAutomation((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition ${
                automation ? "bg-signal-green" : "bg-navy-900/20"
              }`}
              aria-pressed={automation}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                  automation ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </label>
        </div>

        {/* Rules */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-3">
            {rules.map((rule, i) => {
              const active = rule.id === evalResult.ruleId;
              const tone = actionTone(rule.action);
              return (
                <div
                  key={rule.id}
                  className={`rounded-2xl border p-4 transition ${
                    active
                      ? "border-lime-500 bg-lime-50 ring-1 ring-lime-400"
                      : rule.enabled
                        ? "border-black/10 bg-white"
                        : "border-black/5 bg-mist opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-navy-900 text-[11px] font-bold text-lime-400">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-navy-900/70">
                      Wenn Börsenpreis
                    </span>
                    {active && (
                      <span className="ml-auto rounded-full bg-lime-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy-900">
                        aktiv
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    {/* Operator */}
                    <Field label="Bedingung">
                      <select
                        value={rule.operator}
                        onChange={(e) =>
                          patch(rule.id, { operator: e.target.value as RuleOperator })
                        }
                        className="input"
                      >
                        {OPERATORS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    {/* Price(s) */}
                    <Field label="ct/kWh">
                      <input
                        type="number"
                        step="0.1"
                        value={rule.price}
                        onChange={(e) =>
                          patch(rule.id, { price: Number(e.target.value) })
                        }
                        className="input w-24"
                      />
                    </Field>
                    {rule.operator === "between" && (
                      <>
                        <span className="pb-2 text-navy-900/40">–</span>
                        <Field label="bis ct/kWh">
                          <input
                            type="number"
                            step="0.1"
                            value={rule.priceMax ?? ""}
                            onChange={(e) =>
                              patch(rule.id, { priceMax: Number(e.target.value) })
                            }
                            className="input w-24"
                          />
                        </Field>
                      </>
                    )}

                    <span className="pb-2 text-sm font-medium text-navy-900/70">
                      → dann
                    </span>

                    {/* Action */}
                    <Field label="Aktion">
                      <select
                        value={rule.action}
                        onChange={(e) =>
                          patch(rule.id, { action: e.target.value as RuleAction })
                        }
                        className={`input font-semibold ${tone.text}`}
                      >
                        {ACTIONS.map((a) => (
                          <option key={a} value={a}>
                            {ACTION_LABEL[a]}
                          </option>
                        ))}
                      </select>
                    </Field>

                    {/* Power */}
                    {rule.action !== "standby" && (
                      <Field label="Leistung %">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={rule.powerPct}
                          onChange={(e) =>
                            patch(rule.id, { powerPct: Number(e.target.value) })
                          }
                          className="input w-20"
                        />
                      </Field>
                    )}

                    {/* Row actions (reorder, toggle, delete) */}
                    <div className="ml-auto flex items-center gap-1 pb-1">
                      <button
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="rounded-lg px-1.5 py-1 text-navy-900/40 transition hover:bg-mist hover:text-navy-900 disabled:opacity-30"
                        aria-label="nach oben"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => move(i, 1)}
                        disabled={i === rules.length - 1}
                        className="rounded-lg px-1.5 py-1 text-navy-900/40 transition hover:bg-mist hover:text-navy-900 disabled:opacity-30"
                        aria-label="nach unten"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => patch(rule.id, { enabled: !rule.enabled })}
                        className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${
                          rule.enabled
                            ? "text-signal-green hover:bg-signal-green/10"
                            : "text-navy-900/40 hover:bg-mist"
                        }`}
                      >
                        {rule.enabled ? "aktiv" : "aus"}
                      </button>
                      <button
                        onClick={() => remove(rule.id)}
                        className="rounded-lg p-1.5 text-navy-900/40 transition hover:bg-signal-red/10 hover:text-signal-red"
                        aria-label="Regel löschen"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-navy-900/45">
                    {conditionLabel(rule)} → {ACTION_LABEL[rule.action]}
                    {rule.action !== "standby" && ` mit ${rule.powerPct}% Leistung`}
                  </p>
                </div>
              );
            })}
          </div>

          <button
            onClick={add}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-navy-900/20 py-3 text-sm font-semibold text-navy-900/60 transition hover:border-lime-500 hover:bg-lime-50 hover:text-navy-900"
          >
            <Plus size={16} /> Regel hinzufügen
          </button>

          {/* Fallback action (used when no rule matches) */}
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-black/5 bg-mist p-4">
            <Pause size={16} className="text-navy-900/40" />
            <span className="text-sm font-medium text-navy-900/70">
              Wenn keine Regel zutrifft:
            </span>
            <select
              value={fallback}
              onChange={(e) => setFallback(e.target.value as RuleAction)}
              className="input font-semibold text-navy-900"
            >
              {ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {ACTION_LABEL[a]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-black/5 bg-white px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-semibold text-navy-900/60 transition hover:bg-mist hover:text-navy-900"
          >
            Abbrechen
          </button>
          <button
            onClick={() => onSave(asset.id, rules, fallback, automation)}
            className="rounded-full bg-lime-400 px-5 py-2 text-sm font-bold text-navy-900 transition hover:bg-lime-300"
          >
            Regeln speichern
          </button>
        </div>
      </div>
    </div>
  );
}

// Small labeled wrapper for a single form control in the rule row.
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-navy-900/40">
        {label}
      </span>
      {children}
    </label>
  );
}
