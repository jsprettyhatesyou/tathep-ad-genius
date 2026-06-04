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
    <Card className="relative overflow-hidden border-border/60 p-5 shadow-soft transition hover:shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          {delta && (
            <p className={cn("mt-2 inline-flex items-center gap-1 text-xs font-medium", delta.positive ? "text-emerald-600" : "text-rose-600")}>
              {delta.positive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {delta.value}
              <span className="text-muted-foreground font-normal">vs last period</span>
            </p>
          )}
        </div>
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          tone === "brand" ? "bg-gradient-brand text-white" : "bg-fresco/10 text-fresco"
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
