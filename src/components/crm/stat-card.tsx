import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  delta,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  delta?: { value: string; positive?: boolean };
  icon: LucideIcon;
  tone?: "default" | "brand";
}) {
  return (
    <Card className="relative overflow-hidden rounded-2xl border-taptap-100 p-5 shadow-elev-1 transition hover:shadow-elev-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-taptap-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-taptap-ink">{value}</p>
          {delta && (
            <p className={cn("mt-2 inline-flex items-center gap-1 text-xs font-medium", delta.positive ? "text-taptap-success" : "text-taptap-danger")}>
              {delta.positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {delta.value}
              <span className="text-taptap-muted font-normal">vs last period</span>
            </p>
          )}
        </div>
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl",
          tone === "brand" ? "bg-gradient-taptap text-white shadow-elev-2" : "bg-taptap-100 text-taptap-700"
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
