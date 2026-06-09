import { cn } from "@/lib/utils";
import type { LeadTier, AIClass, Priority, AccountStatus, Stage } from "@/lib/mock-data";

// TapTap semantic badge tones (bg-100 / text-700 / ring-200)
const TONE = {
  primary: "bg-taptap-100 text-taptap-700 ring-taptap-200",
  aux: "bg-taptap-aux-100 text-taptap-aux-700 ring-taptap-aux-200",
  success: "bg-tt-success-100 text-tt-success-700 ring-tt-success-200",
  warning: "bg-tt-warning-100 text-tt-warning-700 ring-tt-warning-200",
  danger: "bg-tt-danger-100 text-tt-danger-700 ring-tt-danger-200",
  info: "bg-tt-info-100 text-tt-info-700 ring-tt-info-200",
  neutral: "bg-taptap-neutral-100 text-taptap-neutral-600 ring-taptap-neutral-200",
} as const;

export function TierBadge({ tier, className }: { tier: LeadTier; className?: string }) {
  const styles: Record<LeadTier, string> = {
    Platinum: TONE.info,
    Gold: TONE.warning,
    Silver: TONE.neutral,
    Bronze: TONE.aux,
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", styles[tier], className)}>
      {tier}
    </span>
  );
}

export function AIClassBadge({ value }: { value: AIClass }) {
  const map: Record<AIClass, string> = {
    Hot: TONE.danger,
    Warm: TONE.warning,
    Cold: TONE.info,
    "Agency Upsell": TONE.primary,
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", map[value])}>
      {value}
    </span>
  );
}

export function PriorityDot({ p }: { p: Priority }) {
  const map: Record<Priority, string> = {
    Urgent: "bg-tt-danger-600",
    High: "bg-taptap-aux-600",
    Medium: "bg-tt-warning-600",
    Low: "bg-tt-success-600",
  };
  return <span className={cn("inline-block h-2 w-2 rounded-full", map[p])} title={p} />;
}

export function StatusBadge({ status }: { status: AccountStatus }) {
  const map: Record<AccountStatus, { dot: string; label: string; cls: string }> = {
    Prospect: { dot: "bg-tt-warning-600", label: "Prospect", cls: TONE.warning },
    Active: { dot: "bg-tt-success-600", label: "Active", cls: TONE.success },
    Recurring: { dot: "bg-taptap-600", label: "Recurring", cls: TONE.primary },
    Inactive: { dot: "bg-taptap-neutral-500", label: "Inactive", cls: TONE.neutral },
    Lost: { dot: "bg-tt-danger-600", label: "Lost", cls: TONE.danger },
  };
  const { dot, label, cls } = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", cls)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} /> {label}
    </span>
  );
}

export function AccountTypeBadge({ type }: { type: "Direct Client" | "Agency" }) {
  const cls = type === "Agency" ? TONE.info : TONE.primary;
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset", cls)}>
      {type}
    </span>
  );
}

export function ClientTypeBadge({ value }: { value?: string }) {
  const map: Record<string, string> = {
    "Direct Client": TONE.primary,
    Agency: TONE.info,
    Partner: TONE.success,
    Influencer: TONE.aux,
    Reseller: TONE.warning,
    Internal: TONE.neutral,
  };
  const v = value || "Direct Client";
  const cls = map[v] ?? map["Direct Client"];
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset", cls)}>
      {v}
    </span>
  );
}

export function StageBadge({ stage }: { stage: Stage }) {
  const colors: Record<Stage, string> = {
    Lead: "bg-taptap-neutral-100 text-taptap-neutral-600",
    Qualified: "bg-tt-info-100 text-tt-info-700",
    "Proposal Sent": "bg-taptap-100 text-taptap-700",
    Negotiation: "bg-taptap-aux-100 text-taptap-aux-700",
    "Waiting Payment": "bg-tt-warning-100 text-tt-warning-700",
    "Campaign Setup": "bg-tt-info-100 text-tt-info-700",
    Running: "bg-taptap-100 text-taptap-700",
    Won: "bg-tt-success-100 text-tt-success-700",
    Lost: "bg-tt-danger-100 text-tt-danger-700",
    "On Hold": "bg-taptap-neutral-100 text-taptap-neutral-500",
  };
  return (
    <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", colors[stage])}>
      {stage}
    </span>
  );
}

export function ScoreChip({ score }: { score: number }) {
  const tone = score >= 80 ? "from-taptap-500 to-taptap-700"
    : score >= 60 ? "from-tt-info-400 to-tt-info-600"
    : score >= 40 ? "from-tt-warning-400 to-tt-warning-600"
    : "from-tt-danger-400 to-tt-danger-600";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-taptap-neutral-100">
        <div className={cn("h-full rounded-full bg-gradient-to-r", tone)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium tabular-nums text-taptap-neutral-600">{score}</span>
    </div>
  );
}
