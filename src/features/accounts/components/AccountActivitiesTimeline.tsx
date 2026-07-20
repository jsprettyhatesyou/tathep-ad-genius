import {
  Phone, Users, MessageCircle, Mail, Monitor, FileText, RefreshCw, MapPin,
  Plus, StickyNote, CheckSquare, Activity as ActivityIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Activity } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { toDate } from "../utils/accountMetrics";

const ICON: Record<string, any> = {
  Call: Phone,
  Meeting: Users,
  LINE: MessageCircle,
  Email: Mail,
  Demo: Monitor,
  "Proposal Sent": FileText,
  "Follow-up": RefreshCw,
  "Site Visit": MapPin,
};

const statusTone = (s: string) =>
  s === "Done" ? "text-tt-success-600"
  : s === "Missed" ? "text-tt-danger-600"
  : s === "Planned" ? "text-tt-info-600"
  : "text-taptap-neutral-500";

export function AccountActivitiesTimeline({
  activities,
  onLog,
  onNote,
  onTask,
}: {
  activities: Activity[];
  onLog: () => void;
  onNote: () => void;
  onTask: () => void;
}) {
  const items = [...activities].sort((a, b) => (toDate(b.date) || "").localeCompare(toDate(a.date) || ""));

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Activities Timeline <span className="text-muted-foreground">· {activities.length}</span>
        </h3>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={onLog}><Plus className="h-4 w-4" /> Log Activity</Button>
          <Button variant="ghost" size="sm" onClick={onNote}><StickyNote className="h-4 w-4" /> Note</Button>
          <Button variant="ghost" size="sm" onClick={onTask}><CheckSquare className="h-4 w-4" /> Task</Button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          ยังไม่มีกิจกรรม — กด "Log Activity" เพื่อบันทึกการติดต่อครั้งแรก
        </p>
      ) : (
        <div className="relative space-y-3 pl-2">
          <div className="absolute bottom-2 left-[15px] top-2 w-px bg-border" />
          {items.map((a) => {
            const Icon = ICON[a.type] ?? ActivityIcon;
            return (
              <div key={a.id} className="relative flex gap-3">
                <div className="z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-white text-fresco">
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1 rounded-lg border border-border bg-white p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{toDate(a.date) || "—"}</span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">{a.type}</span>
                    <span className={cn("font-medium", statusTone(a.status))}>· {a.status}</span>
                    {a.assignedTo && <span>· {a.assignedTo}</span>}
                  </p>
                  {a.summary && <p className="mt-1 text-xs text-muted-foreground">{a.summary}</p>}
                  {a.nextAction && <p className="mt-1 text-[11px] text-fresco">ถัดไป: {a.nextAction}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
