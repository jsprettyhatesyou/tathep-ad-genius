import { cn } from "@/lib/utils";
import type { LeadTier, AIClass, Priority, AccountStatus, Stage } from "@/lib/mock-data";

export function TierBadge({ tier, className }: { tier: LeadTier; className?: string }) {
  const styles: Record<LeadTier, string> = {
    Platinum: "bg-violet-50 text-violet-700 ring-violet-200",
    Gold: "bg-amber-50 text-amber-700 ring-amber-200",
    Silver: "bg-slate-100 text-slate-700 ring-slate-200",
    Bronze: "bg-orange-50 text-orange-700 ring-orange-200",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", styles[tier], className)}>
      {tier}
    </span>
  );
}

export function AIClassBadge({ value }: { value: AIClass }) {
  const map: Record<AIClass, { icon: string; cls: string }> = {
    Hot: { icon: "🔥", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
    Warm: { icon: "🌤", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
    Cold: { icon: "❄️", cls: "bg-sky-50 text-sky-700 ring-sky-200" },
    "Agency Upsell": { icon: "🏢", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  };
  const { icon, cls } = map[value];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", cls)}>
      <span>{icon}</span> {value}
    </span>
  );
}

export function PriorityDot({ p }: { p: Priority }) {
  const map: Record<Priority, string> = {
    Urgent: "bg-rose-500",
    High: "bg-orange-500",
    Medium: "bg-amber-400",
    Low: "bg-emerald-500",
  };
  return <span className={cn("inline-block h-2 w-2 rounded-full", map[p])} title={p} />;
}

export function StatusBadge({ status }: { status: AccountStatus }) {
  const map: Record<AccountStatus, { dot: string; label: string; cls: string }> = {
    Prospect: { dot: "bg-amber-400", label: "Prospect", cls: "text-amber-700 bg-amber-50 ring-amber-200" },
    Active: { dot: "bg-emerald-500", label: "Active", cls: "text-emerald-700 bg-emerald-50 ring-emerald-200" },
    Recurring: { dot: "bg-sky-500", label: "Recurring", cls: "text-sky-700 bg-sky-50 ring-sky-200" },
    Inactive: { dot: "bg-rose-500", label: "Inactive", cls: "text-rose-700 bg-rose-50 ring-rose-200" },
    Lost: { dot: "bg-slate-500", label: "Lost", cls: "text-slate-700 bg-slate-100 ring-slate-200" },
  };
  const { dot, label, cls } = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", cls)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} /> {label}
    </span>
  );
}

export function AccountTypeBadge({ type }: { type: "Direct Client" | "Agency" }) {
  const cls = type === "Agency"
    ? "bg-indigo-50 text-indigo-700 ring-indigo-200"
    : "bg-fresco/10 text-fresco ring-cyan-200";
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset", cls)}>
      {type}
    </span>
  );
}

export function ClientTypeBadge({ value }: { value?: string }) {
  const map: Record<string, { icon: string; cls: string }> = {
    "Direct Client": { icon: "🎯", cls: "bg-fresco/10 text-fresco ring-cyan-200" },
    Agency: { icon: "🏢", cls: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
    Partner: { icon: "🤝", cls: "bg-violet-50 text-violet-700 ring-violet-200" },
    Influencer: { icon: "⭐", cls: "bg-pink-50 text-pink-700 ring-pink-200" },
    Reseller: { icon: "🔁", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
    Internal: { icon: "🏠", cls: "bg-slate-100 text-slate-700 ring-slate-200" },
  };
  const v = value || "Direct Client";
  const { icon, cls } = map[v] ?? map["Direct Client"];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset", cls)}>
      <span>{icon}</span> {v}
    </span>
  );
}

export function StageBadge({ stage }: { stage: Stage }) {
  const colors: Record<Stage, string> = {
    "New Lead": "bg-slate-100 text-slate-700",
    Qualifying: "bg-cyan-50 text-cyan-700",
    "Needs Analysis": "bg-blue-50 text-blue-700",
    "Proposal Sent": "bg-indigo-50 text-indigo-700",
    Negotiation: "bg-amber-50 text-amber-700",
    Won: "bg-emerald-50 text-emerald-700",
    Lost: "bg-rose-50 text-rose-700",
    "On Hold": "bg-slate-100 text-slate-600",
  };
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", colors[stage])}>
      {stage}
    </span>
  );
}

export function ScoreChip({ score }: { score: number }) {
  const tone = score >= 80 ? "from-violet-500 to-fuchsia-500"
    : score >= 60 ? "from-amber-400 to-orange-500"
    : score >= 40 ? "from-slate-400 to-slate-500"
    : "from-orange-400 to-rose-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full bg-gradient-to-r", tone)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium tabular-nums text-slate-600">{score}</span>
    </div>
  );
}
