// Pure pricing helpers for quotations / invoices. No I/O, no secrets — shared by
// the UI (live totals while editing) and the server functions (authoritative
// recompute before persisting, so totals can never be tampered client-side).
import type { Deal, Screen, DocLineItem } from "./mock-data";

export const DEFAULT_VAT_RATE = 7;

const round = (n: number) => Math.round(n);

/** amount = qty * unitPrice (rounded to whole baht). */
export function lineAmount(item: Pick<DocLineItem, "qty" | "unitPrice">): number {
  return round((item.qty || 0) * (item.unitPrice || 0));
}

/** Normalize a list of line items so each `amount` matches qty * unitPrice. */
export function normalizeLineItems(items: DocLineItem[]): DocLineItem[] {
  return (items ?? []).map((it) => ({
    ...it,
    qty: Number(it.qty) || 0,
    unitPrice: Number(it.unitPrice) || 0,
    amount: lineAmount(it),
  }));
}

export interface DocTotals {
  subtotal: number;
  discount: number;
  vatRate: number;
  vatAmount: number;
  total: number;
}

/**
 * subtotal = Σ line amounts
 * taxable  = max(subtotal − discount, 0)
 * vat      = taxable × vatRate%
 * total    = taxable + vat
 */
export function computeDocTotals(
  items: DocLineItem[],
  discount = 0,
  vatRate = DEFAULT_VAT_RATE,
): DocTotals {
  const subtotal = normalizeLineItems(items).reduce((s, it) => s + it.amount, 0);
  const disc = Math.min(Math.max(discount || 0, 0), subtotal);
  const taxable = subtotal - disc;
  const vatAmount = round(taxable * ((vatRate || 0) / 100));
  return {
    subtotal,
    discount: disc,
    vatRate: vatRate || 0,
    vatAmount,
    total: taxable + vatAmount,
  };
}

// "1 Month" / "3 Months" / "2 Weeks" / "15 Days" → a quantity + unit + which
// screen rate to bill against. Falls back to a single monthly line.
function durationToBilling(duration?: string): {
  qty: number;
  unit: string;
  rate: keyof Pick<Screen, "rateDaily" | "rateMonthly">;
  dayMultiplier: number; // days represented, for daily-rate fallback
} {
  const d = (duration ?? "").toLowerCase();
  const n = parseInt(d, 10) || 1;
  if (/week/.test(d)) return { qty: n * 7, unit: "วัน", rate: "rateDaily", dayMultiplier: n * 7 };
  if (/day/.test(d)) return { qty: n, unit: "วัน", rate: "rateDaily", dayMultiplier: n };
  // default: months
  return { qty: n, unit: "เดือน", rate: "rateMonthly", dayMultiplier: n * 30 };
}

// deal.screens may store screen NAMES (from SCREEN_INVENTORY) or ids — match both.
function findScreen(screens: Screen[], key: string): Screen | undefined {
  return screens.find((s) => s.id === key || s.name === key);
}

/**
 * Seed a document's line items from a deal: one row per selected billboard,
 * priced by the deal's duration. If a screen can't be matched (no rate known)
 * a zero-priced row is created for the user to fill in. When the deal has no
 * screens, a single line carries the whole deal value.
 */
export function buildLineItemsFromDeal(deal: Deal, screens: Screen[]): DocLineItem[] {
  const billing = durationToBilling(deal.duration);
  const list = deal.screens ?? [];

  if (list.length === 0) {
    return [
      {
        description: deal.campaignType
          ? `${deal.campaignType} — ${deal.duration ?? ""}`.trim()
          : deal.name,
        qty: 1,
        unit: "งาน",
        unitPrice: deal.value || 0,
        amount: deal.value || 0,
      },
    ];
  }

  return list.map((key) => {
    const s = findScreen(screens, key);
    let unitPrice = 0;
    if (s) {
      unitPrice = (s[billing.rate] as number) || 0;
      // fallback: derive a monthly figure from the daily rate when missing
      if (!unitPrice && billing.rate === "rateMonthly") unitPrice = (s.rateDaily || 0) * 30;
      if (!unitPrice && billing.rate === "rateDaily") unitPrice = Math.round((s.rateMonthly || 0) / 30);
    }
    const label = s ? `${s.name}${s.province ? ` · ${s.province}` : ""}` : key;
    const item = {
      description: `จอ ${label} (${deal.campaignType ?? "โฆษณา DOOH"})`,
      screenId: s?.id ?? key,
      qty: billing.qty,
      unit: billing.unit,
      unitPrice,
      amount: 0,
    };
    item.amount = lineAmount(item);
    return item;
  });
}

/** Default validity / due window (days) per document type. */
export function defaultDueDays(type: "quotation" | "invoice"): number {
  return type === "quotation" ? 14 : 7;
}

/** YYYY-MM-DD that is `days` after the given ISO date. */
export function addDays(isoDate: string, days: number): string {
  const base = isoDate ? new Date(isoDate) : new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}
