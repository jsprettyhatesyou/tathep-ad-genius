import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SCREENS, formatTHB, formatNumber, PROVINCES } from "@/lib/mock-data";
import { Monitor, MapPin, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/inventory")({
  head: () => ({ meta: [{ title: "Billboard Inventory — Tathep CRM" }] }),
  component: InventoryPage,
});

const AVAIL_CLS: Record<string, string> = {
  Available: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Occupied: "bg-rose-50 text-rose-700 ring-rose-200",
  Maintenance: "bg-amber-50 text-amber-700 ring-amber-200",
};

function InventoryPage() {
  return (
    <div>
      <PageHeader title="Billboard Inventory" subtitle={`${SCREENS.length} LED screens across 8 provinces — Smart DOOH network`} />
      <div className="p-8">
        <Tabs defaultValue="gallery">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="province">By Province</TabsTrigger>
            <TabsTrigger value="available">Available Only</TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {SCREENS.map((s) => <ScreenCard key={s.id} s={s} />)}
            </div>
          </TabsContent>

          <TabsContent value="province" className="mt-4 space-y-6">
            {PROVINCES.filter((p) => SCREENS.some((s) => s.province === p)).map((p) => (
              <div key={p}>
                <h3 className="mb-2 text-sm font-semibold text-foreground">{p} <span className="text-muted-foreground">· {SCREENS.filter((s) => s.province === p).length} screens</span></h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {SCREENS.filter((s) => s.province === p).map((s) => <ScreenCard key={s.id} s={s} />)}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="available" className="mt-4">
            <Card className="overflow-hidden shadow-soft">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-slate-50/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Screen</th>
                    <th className="px-4 py-3">Province</th>
                    <th className="px-4 py-3">Area Type</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3 text-right">Rate / 15s</th>
                    <th className="px-4 py-3 text-right">Daily</th>
                    <th className="px-4 py-3 text-right">Monthly</th>
                    <th className="px-4 py-3 text-right">Impressions/day</th>
                  </tr>
                </thead>
                <tbody>
                  {SCREENS.filter((s) => s.availability === "Available").map((s) => (
                    <tr key={s.id} className="border-b border-border/60 hover:bg-fresco/5">
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.province}</td>
                      <td className="px-4 py-3"><span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{s.areaType}</span></td>
                      <td className="px-4 py-3 text-muted-foreground">{s.size}</td>
                      <td className="px-4 py-3 text-right">{formatTHB(s.rate15s)}</td>
                      <td className="px-4 py-3 text-right">{formatTHB(s.rateDaily)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-fresco">{formatTHB(s.rateMonthly)}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(s.dailyImpressions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ScreenCard({ s }: { s: typeof SCREENS[number] }) {
  return (
    <Card className="overflow-hidden shadow-soft transition hover:shadow-card">
      <div className="relative h-32 bg-gradient-brand flex items-center justify-center">
        <Monitor className="h-12 w-12 text-white/80" />
        <span className={cn("absolute top-2 right-2 rounded-full px-2 py-0.5 text-xs ring-1 ring-inset bg-white", AVAIL_CLS[s.availability])}>{s.availability}</span>
        <span className="absolute bottom-2 left-2 rounded bg-black/40 px-2 py-0.5 text-xs text-white">{s.size}</span>
      </div>
      <div className="p-4">
        <p className="font-semibold">{s.name}</p>
        <p className="mt-0.5 text-xs text-muted-foreground"><MapPin className="inline h-3 w-3" /> {s.province} · {s.areaType}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded bg-slate-50 p-2">
            <p className="text-muted-foreground">Rate / 15s</p>
            <p className="mt-0.5 font-semibold text-fresco">{formatTHB(s.rate15s)}</p>
          </div>
          <div className="rounded bg-slate-50 p-2">
            <p className="text-muted-foreground">Daily impr.</p>
            <p className="mt-0.5 font-semibold">{formatNumber(s.dailyImpressions)}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.hours}</span>
          <span className="flex items-center gap-1"><Users className="h-3 w-3" />{s.audience.join(", ")}</span>
        </div>
      </div>
    </Card>
  );
}
