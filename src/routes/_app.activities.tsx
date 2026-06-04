import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ACTIVITIES, getCompany } from "@/lib/mock-data";
import { Phone, Calendar, MessageCircle, Mail, Video, FileText, RotateCw, MapPin, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/activities")({
  head: () => ({ meta: [{ title: "Activities — Tathep CRM" }] }),
  component: ActivitiesPage,
});

const ICON: Record<string, any> = {
  Call: Phone, Meeting: Calendar, LINE: MessageCircle, Email: Mail,
  Demo: Video, "Proposal Sent": FileText, "Follow-up": RotateCw, "Site Visit": MapPin,
};

const STATUS_CLS: Record<string, string> = {
  Done: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Planned: "bg-amber-50 text-amber-700 ring-amber-200",
  Missed: "bg-rose-50 text-rose-700 ring-rose-200",
  Rescheduled: "bg-slate-100 text-slate-600 ring-slate-200",
};

function ActivitiesPage() {
  const today = ACTIVITIES.filter((a) => a.date.startsWith("2026-06-04"));
  const upcoming = ACTIVITIES.filter((a) => a.status === "Planned").sort((a, b) => a.date.localeCompare(b.date));
  const log = [...ACTIVITIES].filter((a) => a.status === "Done").sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div>
      <PageHeader title="Activities" subtitle="Calls, meetings, LINE & site visits — ทุก touchpoint ของทีมขาย"
        actions={<Button size="sm" className="bg-fresco hover:bg-fresco/90"><Plus className="h-4 w-4" /> Log Activity</Button>} />

      <div className="p-8">
        <Tabs defaultValue="today">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="today">Today's Tasks · {today.length}</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming · {upcoming.length}</TabsTrigger>
            <TabsTrigger value="log">Activity Log</TabsTrigger>
          </TabsList>
          {[["today", today], ["upcoming", upcoming], ["log", log]].map(([key, items]) => (
            <TabsContent key={key as string} value={key as string} className="mt-4">
              <Card className="divide-y divide-border shadow-soft">
                {(items as typeof ACTIVITIES).map((a) => {
                  const Icon = ICON[a.type] || Phone;
                  return (
                    <div key={a.id} className="flex items-start gap-4 p-4 transition hover:bg-slate-50">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-fresco/10 text-fresco">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{a.title}</p>
                          <span className={cn("rounded-full px-2 py-0.5 text-xs ring-1 ring-inset", STATUS_CLS[a.status])}>{a.status}</span>
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">{a.type}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{a.summary}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{getCompany(a.companyId || "")?.name} · {a.assignedTo}</p>
                      </div>
                      <p className="shrink-0 text-xs text-muted-foreground">{a.date.replace("T", " ")}</p>
                    </div>
                  );
                })}
                {(items as typeof ACTIVITIES).length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">ยังไม่มี activity ในช่วงนี้</div>
                )}
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
