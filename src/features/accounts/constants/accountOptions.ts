// Option lists + small display maps for the Accounts module.
// Re-uses the shared CRM enums where possible.

export const ACCOUNT_FILTERS = [
  "All",
  "Agencies Only",
  "Direct Clients",
  "Active Clients",
  "Recurring",
  "Prospects",
] as const;
export type AccountFilter = (typeof ACCOUNT_FILTERS)[number];

// Sort options for the left list.
export const ACCOUNT_SORTS = [
  { value: "revenue", label: "Lifetime revenue" },
  { value: "score", label: "Account score" },
  { value: "activity", label: "Last activity" },
  { value: "name", label: "Company name" },
] as const;
export type AccountSort = (typeof ACCOUNT_SORTS)[number]["value"];

// Buying-process role → short label / tone for contact rows.
export const ROLE_TONE: Record<string, string> = {
  "Decision Maker": "bg-tt-success-100 text-tt-success-700",
  "Budget Holder": "bg-tt-warning-100 text-tt-warning-700",
  Influencer: "bg-tt-info-100 text-tt-info-700",
  Gatekeeper: "bg-taptap-neutral-100 text-taptap-neutral-600",
  User: "bg-taptap-100 text-taptap-700",
  Procurement: "bg-taptap-aux-100 text-taptap-aux-700",
};

export const RISK_TONE: Record<string, string> = {
  high: "border-tt-danger-200 bg-tt-danger-50 text-tt-danger-700",
  medium: "border-tt-warning-200 bg-tt-warning-50 text-tt-warning-700",
  low: "border-tt-success-200 bg-tt-success-50 text-tt-success-700",
};
