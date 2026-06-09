import { Card } from "@/components/ui/card";
import { formatTHB } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { AccountMetrics } from "../types/account";

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className="rounded-xl border-taptap-100 p-3 shadow-soft">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-lg font-bold tracking-tight tabular-nums", accent ? "text-fresco" : "text-foreground")}>
        {value}
      </p>
    </Card>
  );
}

export function AccountSummaryCards({ metrics }: { metrics: AccountMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      <Metric label="Lifetime Revenue" value={formatTHB(metrics.lifetimeRevenue)} accent />
      <Metric label="Revenue YTD" value={formatTHB(metrics.revenueYTD)} accent />
      <Metric label="Open Opportunities" value={`${metrics.openOpportunities} · ${formatTHB(metrics.openPipelineValue)}`} />
      <Metric label="Closed Won" value={String(metrics.closedWonOpportunities)} />
      <Metric label="Total Campaigns" value={String(metrics.totalCampaigns)} />
      <Metric label="Last Campaign" value={metrics.lastCampaignDate || "—"} />
      <Metric label="Last Activity" value={metrics.lastActivityAt || "—"} />
      <Metric label="Next Follow-up" value={metrics.nextFollowUpAt || "—"} />
    </div>
  );
}
