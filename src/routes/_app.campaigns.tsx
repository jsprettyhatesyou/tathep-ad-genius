import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTHB, formatNumber, COMPANIES } from "@/lib/mock-data";
import { Plus, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns — Tathep CRM" }] }),
  component: CampaignsPage,
});

const CAMPAIGNS = [
  { id: "cm1", name: "Dermaglow Glow-Up Summer", company: "คลินิกผิวพรรณ Dermaglow", status: "Active", start: "2026-05-15", end: "2026-08-15", budget: 920000, impressions: 4250000, cpm: 216, satisfaction: "😍", renewal: 92 },
  { id: "cm2", name: "TT Mart Mega Sale", company: "อิเล็กทรอนิกส์ TT Mart", status: "Active", start: "2026-06-10", end: "2026-06-24", budget: 195000, impressions: 1180000, cpm: 165, satisfaction: "😊", renewal: 78 },
  { id: "cm3", name: "Pure Property Phase 1", company: "Pure Property Phuket", status: "Completed", start: "2026-03-01", end: "2026-04-30", budget: 540000, impressions: 3120000, cpm: 173, satisfaction: "😍", renewal: 88 },
  { id: "cm4", name: "Bangkok Bites — TastyTH Pilot", company: "Bangkok Bites Agency", status: "Draft", start: "2026-07-01", end: "2026-07-31", budget: 950000, impressions: 0, cpm: 0, satisfaction: "—", renewal: 0 },
  { id: "cm5", name: "Wellness Spa Tourist Drive", company: "Thai Wellness Spa Group", status: "Paused", start: "2026-05-01", end: "2026-07-31", budget: 295000, impressions: 1450000, cpm: 203, satisfaction: "😊", renewal: 65 },
];

const STATUS_CLS: Record<string, string> = {
  Active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Completed: "bg-sky-50 text-sky-700 ring-sky-200",
  Draft: "bg-slate-100 text-slate-700 ring-slate-200",
  Paused: "bg-amber-50 text-amber-700 ring-amber-200",
  Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
};

function CampaignsPage() {
  return (
    <div>
      <PageHeader title="Campaigns" subtitle="Active & past DOOH campaigns from Won deals"
        actions={<Button size="sm" className="bg-fresco hover:bg-fresco/90"><Plus className="h-4 w-4" /> New Campaign</Button>} />

      <div className="grid gap-4 p-8 lg:grid-cols-2">
        {CAMPAIGNS.map((c) => (
          <Card key={c.id} className="p-5 shadow-soft transition hover:shadow-card">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-brand text-white"><Megaphone className="h-5 w-5" /></div>
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.company}</p>
                </div>
              </div>
              <span className={cn("rounded-full px-2 py-0.5 text-xs ring-1 ring-inset", STATUS_CLS[c.status])}>{c.status}</span>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-3 rounded-lg bg-slate-50 p-3 text-xs">
              <div>
                <p className="text-muted-foreground">Budget</p>
                <p className="mt-0.5 font-semibold text-fresco">{formatTHB(c.budget)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Impressions</p>
                <p className="mt-0.5 font-semibold">{formatNumber(c.impressions)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">CPM</p>
                <p className="mt-0.5 font-semibold">{c.cpm > 0 ? formatTHB(c.cpm) : "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Satisfaction</p>
                <p className="mt-0.5 text-lg">{c.satisfaction}</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>{c.start} → {c.end}</span>
              {c.renewal > 0 && <span>Renewal probability <b className="text-fresco">{c.renewal}%</b></span>}
            </div>
          </Card>
        ))}
      </div>
      {COMPANIES.length === 0 && null}
    </div>
  );
}
