// Pure derivations of account-level metrics & tasks from related records.
// No I/O. Used by the Accounts detail panel and the left-list cards.
import type { Company, Deal, Activity, Campaign, Priority } from "@/lib/mock-data";
import type { AccountMetrics, AccountTask } from "../types/account";

const OPEN_EXCLUDE = new Set(["Won", "Lost"]);

export const todayISO = () => new Date().toISOString().slice(0, 10);

// "YYYY-MM-DD" out of an ISO-ish string, else "".
export const toDate = (s?: string) =>
  s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "";

const maxDate = (dates: (string | undefined)[]) => {
  const valid = dates.map(toDate).filter(Boolean).sort();
  return valid.length ? valid[valid.length - 1] : undefined;
};

export function computeAccountMetrics(
  company: Company,
  deals: Deal[],
  activities: Activity[],
  campaigns: Campaign[],
): AccountMetrics {
  const won = deals.filter((d) => d.stage === "Won");
  const open = deals.filter((d) => !OPEN_EXCLUDE.has(d.stage));
  const year = String(new Date().getFullYear());

  const lifetimeRevenue =
    won.reduce((s, d) => s + (d.value || 0), 0) || company.totalDealValue || 0;
  const revenueYTD = won
    .filter((d) => (d.expectedClose || "").slice(0, 4) === year)
    .reduce((s, d) => s + (d.value || 0), 0);

  const today = todayISO();
  const futureFollowUps = [
    ...deals.map((d) => toDate(d.nextFollowUp)),
    ...activities.filter((a) => a.status === "Planned").map((a) => toDate(a.date)),
  ]
    .filter((d) => d && d >= today)
    .sort();

  return {
    lifetimeRevenue,
    revenueYTD,
    openOpportunities: open.length,
    closedWonOpportunities: won.length,
    openPipelineValue: open.reduce((s, d) => s + (d.value || 0), 0),
    totalCampaigns: campaigns.length,
    lastCampaignDate: maxDate(campaigns.flatMap((c) => [c.end, c.start])),
    lastActivityAt: maxDate(activities.map((a) => a.date)),
    nextFollowUpAt: futureFollowUps[0] || undefined,
  };
}

// Next-actions list = planned activities + deal follow-ups (no tasks table yet).
export function deriveTasks(
  company: Company,
  deals: Deal[],
  activities: Activity[],
): AccountTask[] {
  const today = todayISO();
  const tasks: AccountTask[] = [];

  for (const a of activities) {
    if (a.status !== "Planned") continue;
    const due = toDate(a.date);
    const overdue = !!due && due < today;
    tasks.push({
      id: `act-${a.id}`,
      title: a.nextAction || a.title,
      dueDate: due || undefined,
      owner: a.assignedTo || company.assignedTo,
      status: a.status,
      priority: overdue ? "High" : "Medium",
      source: "activity",
      overdue,
      refId: a.id,
    });
  }

  for (const d of deals) {
    const due = toDate(d.nextFollowUp);
    if (!due) continue;
    if (["Won", "Lost"].includes(d.stage)) continue;
    const overdue = due < today;
    tasks.push({
      id: `deal-${d.id}`,
      title: `ติดตามดีล: ${d.name}`,
      dueDate: due,
      owner: company.assignedTo,
      status: "Planned",
      priority: (d.priority as Priority) || "Medium",
      source: "deal",
      overdue,
      refId: d.id,
    });
  }

  // overdue first, then by soonest due date
  return tasks.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
    return (a.dueDate || "9999").localeCompare(b.dueDate || "9999");
  });
}
