import { Plus, AlertTriangle, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AccountTask } from "../types/account";

const prioTone: Record<string, string> = {
  Urgent: "bg-tt-danger-100 text-tt-danger-700",
  High: "bg-taptap-aux-100 text-taptap-aux-700",
  Medium: "bg-tt-warning-100 text-tt-warning-700",
  Low: "bg-tt-success-100 text-tt-success-700",
};

export function AccountTasksSection({
  tasks,
  onCreate,
}: {
  tasks: AccountTask[];
  onCreate: () => void;
}) {
  const overdueCount = tasks.filter((t) => t.overdue).length;
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Tasks / Next Actions <span className="text-muted-foreground">· {tasks.length}</span>
          {overdueCount > 0 && (
            <span className="ml-2 rounded-full bg-tt-danger-100 px-2 py-0.5 text-[10px] font-semibold text-tt-danger-700">
              {overdueCount} เกินกำหนด
            </span>
          )}
        </h3>
        <Button variant="outline" size="sm" onClick={onCreate}>
          <Plus className="h-4 w-4" /> Create Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          ไม่มีงานค้าง — กด "Create Task" เพื่อวางแผน next action
        </p>
      ) : (
        <div className="space-y-1.5">
          {tasks.map((t) => (
            <div
              key={t.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border p-2.5",
                t.overdue ? "border-tt-danger-200 bg-tt-danger-50/60" : "border-border bg-white",
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  <span className={cn("inline-flex items-center gap-1", t.overdue && "font-semibold text-tt-danger-700")}>
                    {t.overdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                    {t.dueDate || "ไม่มีกำหนด"}
                  </span>
                  {t.owner && <span className="inline-flex items-center gap-0.5"><User className="h-3 w-3" />{t.owner}</span>}
                  <span>· {t.status}</span>
                </p>
              </div>
              <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold", prioTone[t.priority] ?? prioTone.Medium)}>
                {t.priority}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
