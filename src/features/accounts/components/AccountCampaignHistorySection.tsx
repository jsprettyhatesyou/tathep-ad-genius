import { Card } from "@/components/ui/card";
import { Megaphone } from "lucide-react";
import { formatTHB, type Campaign, type Screen } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const statusTone = (s: string) =>
  s === "Active" ? "bg-tt-success-100 text-tt-success-700"
  : s === "Completed" ? "bg-tt-info-100 text-tt-info-700"
  : s === "Paused" ? "bg-tt-warning-100 text-tt-warning-700"
  : s === "Cancelled" ? "bg-tt-danger-100 text-tt-danger-700"
  : "bg-taptap-neutral-100 text-taptap-neutral-600";

export function AccountCampaignHistorySection({
  campaigns,
  screens,
}: {
  campaigns: Campaign[];
  screens: Screen[];
}) {
  const screenName = new Map(screens.map((s) => [s.id, s.name]));
  const locations = (c: Campaign) =>
    (c.screenIds ?? []).map((id) => screenName.get(id) || id).filter(Boolean);

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-foreground">
        Campaign History <span className="text-muted-foreground">· {campaigns.length}</span>
      </h3>

      {campaigns.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          ยังไม่มีแคมเปญที่เคยทำกับบัญชีนี้
        </p>
      ) : (
        <div className="space-y-2">
          {campaigns.map((c) => {
            const locs = locations(c);
            return (
              <Card key={c.id} className="p-3 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-medium">
                      <Megaphone className="h-3.5 w-3.5 text-fresco" /> {c.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {c.start || "—"} → {c.end || "—"}
                    </p>
                    {locs.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {locs.slice(0, 4).map((l) => (
                          <span key={l} className="rounded-md bg-fresco/10 px-1.5 py-0.5 text-[10px] font-medium text-fresco">{l}</span>
                        ))}
                        {locs.length > 4 && <span className="text-[10px] text-muted-foreground">+{locs.length - 4}</span>}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium", statusTone(c.status))}>{c.status}</span>
                    <p className="mt-1 text-sm font-semibold text-fresco tabular-nums">{formatTHB(c.budget || 0)}</p>
                  </div>
                </div>
                {(c.aiInsight || c.revenue) && (
                  <p className="mt-2 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                    {c.aiInsight ? c.aiInsight.split("\n")[0].replace(/^[-•\s]+/, "") : `รายได้ที่เกิด: ${formatTHB(c.revenue || 0)} · impressions ${formatTHB(c.impressions || 0)}`}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
