import { MapPin, Briefcase } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { TierBadge, StatusBadge, ClientTypeBadge } from "@/components/crm/badges";
import { formatTHB, type Company } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export interface AccountCardSummary {
  lifetimeRevenue: number;
  openDeals: number;
  lastActivity?: string;
}

export function AccountListCard({
  company,
  summary,
  selected,
  onClick,
  checked,
  onToggle,
}: {
  company: Company;
  summary: AccountCardSummary;
  selected: boolean;
  onClick: () => void;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
      className={cn(
        "w-full cursor-pointer rounded-xl border bg-white p-3 text-left shadow-soft transition",
        selected ? "border-fresco ring-1 ring-fresco/30" : checked ? "border-fresco/40 bg-fresco/5" : "border-border hover:border-fresco/40",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span onClick={(e) => e.stopPropagation()} className="pt-0.5">
          <Checkbox checked={checked} onCheckedChange={onToggle} aria-label="เลือกบัญชี" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 flex-1 text-sm font-semibold leading-snug text-foreground">{company.name}</p>
            <TierBadge tier={company.tier} />
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <ClientTypeBadge value={company.clientType ?? company.type} />
            <StatusBadge status={company.status} />
          </div>

          <p className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" />{company.province || "—"}</span>
            <span>· Score {company.leadScore}/100</span>
          </p>

          <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
            <span className="text-sm font-bold text-fresco tabular-nums">{formatTHB(summary.lifetimeRevenue)}</span>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-0.5"><Briefcase className="h-3 w-3" />{summary.openDeals} deals</span>
              {summary.lastActivity && <span className="tabular-nums">· {summary.lastActivity}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
