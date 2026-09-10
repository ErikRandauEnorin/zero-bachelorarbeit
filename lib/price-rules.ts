import type { PriceRule, RuleAction, RuleOperator } from "./types";

/** Current market-wide day-ahead/spot electricity price in ct/kWh. */
export const currentSpotPriceCt = 6.4;

// German-language display labels for each rule action, used in the UI.
export const ACTION_LABEL: Record<RuleAction, string> = {
  laden: "Laden", // "Charge"
  entladen: "Entladen", // "Discharge"
  standby: "Standby",
};

// German-language display labels/symbols for each comparison operator.
export const OPERATOR_LABEL: Record<RuleOperator, string> = {
  lte: "≤",
  gte: "≥",
  between: "zwischen", // "between"
};

export interface RuleEvaluation {
  action: RuleAction;
  powerPct: number;
  /** id of the matching rule, null = fallback action was used */
  ruleId: string | null;
}

/** Checks a single rule's price condition against the current spot price. */
export function matchesRule(rule: PriceRule, priceCt: number): boolean {
  switch (rule.operator) {
    case "lte":
      return priceCt <= rule.price;
    case "gte":
      return priceCt >= rule.price;
    case "between":
      return priceCt >= rule.price && priceCt <= (rule.priceMax ?? rule.price);
  }
}

// Evaluates the rule list top to bottom; the first enabled, matching rule
// wins. If none match, the fallback action is used.
export function evaluateRules(
  rules: PriceRule[],
  fallback: RuleAction,
  priceCt: number,
): RuleEvaluation {
  for (const rule of rules) {
    if (rule.enabled && matchesRule(rule, priceCt)) {
      return { action: rule.action, powerPct: rule.powerPct, ruleId: rule.id };
    }
  }
  return { action: fallback, powerPct: 0, ruleId: null };
}

/** Human-readable condition text, e.g. "≤ 5 ct/kWh" or "zwischen 8 – 18 ct/kWh" (between 8 – 18 ct/kWh). */
export function conditionLabel(rule: PriceRule): string {
  if (rule.operator === "between") {
    return `zwischen ${fmt(rule.price)} – ${fmt(rule.priceMax ?? rule.price)} ct/kWh`;
  }
  return `${OPERATOR_LABEL[rule.operator]} ${fmt(rule.price)} ct/kWh`;
}

// Formats a number using German locale conventions, at most one decimal place.
function fmt(n: number): string {
  return n.toLocaleString("de-DE", { maximumFractionDigits: 1 });
}
