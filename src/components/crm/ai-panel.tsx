import { Sparkles, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function AIPanel({
  title = "น้องตาเทพ AI",
  subtitle,
  children,
  onGenerate,
  loading,
  className,
  actionLabel = "Regenerate",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  onGenerate?: () => void;
  loading?: boolean;
  className?: string;
  actionLabel?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl p-[1px] bg-gradient-brand", className)}>
      <div className="rounded-[11px] bg-gradient-ai p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand text-white shadow-elevated">
              <Eye className="h-4 w-4" />
              <Sparkles className="absolute -right-1 -top-1 h-3.5 w-3.5 text-amber-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-fresco">{title}</p>
              {subtitle && <p className="text-xs text-slate-600">{subtitle}</p>}
            </div>
          </div>
          {onGenerate && (
            <Button
              size="sm"
              variant="outline"
              onClick={onGenerate}
              disabled={loading}
              className="border-fresco/30 bg-white/70 text-fresco hover:bg-white"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              {actionLabel}
            </Button>
          )}
        </div>
        <div className="mt-4 text-sm text-slate-700">
          {loading ? <AISkeleton /> : children}
        </div>
      </div>
    </div>
  );
}

function AISkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-3 w-3/4 animate-pulse rounded bg-fresco/15" />
      <div className="h-3 w-full animate-pulse rounded bg-fresco/15" />
      <div className="h-3 w-5/6 animate-pulse rounded bg-fresco/15" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-fresco/15" />
    </div>
  );
}
