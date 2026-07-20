import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatTHB, formatTHB2, formatNumber, type Screen } from "@/lib/mock-data";
import { listScreens, deleteScreen } from "@/lib/api/crm.functions";
import { ScreenDialog } from "@/components/crm/entity-dialogs";
import { DeleteConfirm } from "@/components/crm/form-kit";
import { Monitor, MapPin, Clock, Users, Plus, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/inventory")({
  head: () => ({ meta: [{ title: "Billboard Inventory — Tathep CRM" }] }),
  loader: async () => ({ screens: await listScreens() }),
  component: InventoryPage,
});

const AVAIL_CLS: Record<string, string> = {
  Available: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Occupied: "bg-rose-50 text-rose-700 ring-rose-200",
  Maintenance: "bg-amber-50 text-amber-700 ring-amber-200",
};

function InventoryPage() {
  const { screens } = Route.useLoaderData();
  const router = useRouter();
  const refresh = () => router.invalidate();
  const [dialog, setDialog] = useState<{ open: boolean; initial: Screen | null }>({ open: false, initial: null });

  const provinces = Array.from(new Set(screens.map((s) => s.province))).filter(Boolean);

  const removeScreen = async (id: string) => {
    try {
      await deleteScreen({ data: { id } });
      toast.success("ลบจอแล้ว");
      refresh();
    } catch (e: any) {
      toast.error(`ลบไม่สำเร็จ: ${e?.message ?? "error"}`);
    }
  };

  const cardProps = (s: Screen) => ({
    s,
    onEdit: () => setDialog({ open: true, initial: s }),
    onDelete: () => removeScreen(s.id),
  });

  return (
    <div>
      <PageHeader
        title="Billboard Inventory"
        subtitle={`${screens.length} LED screens`}
        actions={<Button size="sm" className="bg-fresco hover:bg-fresco/90" onClick={() => setDialog({ open: true, initial: null })}><Plus className="h-4 w-4" /> New Screen</Button>}
      />
      <div className="p-8">
        <Tabs defaultValue="gallery">
          <TabsList className="bg-slate-100">
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
            <TabsTrigger value="province">By Province</TabsTrigger>
            <TabsTrigger value="available">Available Only</TabsTrigger>
          </TabsList>

          <TabsContent value="gallery" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {screens.map((s) => <ScreenCard key={s.id} {...cardProps(s)} />)}
            </div>
          </TabsContent>

          <TabsContent value="province" className="mt-4 space-y-6">
            {provinces.map((p) => (
              <div key={p}>
                <h3 className="mb-2 text-sm font-semibold text-foreground">{p} <span className="text-muted-foreground">· {screens.filter((s) => s.province === p).length} screens</span></h3>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {screens.filter((s) => s.province === p).map((s) => <ScreenCard key={s.id} {...cardProps(s)} />)}
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
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Province</th>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Resolution</th>
                    <th className="px-4 py-3 text-right">เรท/วินาที</th>
                    <th className="px-4 py-3 text-right">Impressions/day</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {screens.filter((s) => s.availability === "Available").map((s) => (
                    <tr key={s.id} className="border-b border-border/60 hover:bg-fresco/5">
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.code ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.province}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.size}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.resolution}</td>
                      <td className="px-4 py-3 text-right font-semibold text-fresco">{formatTHB2(s.ratePerSecond ?? 0)}/วิ</td>
                      <td className="px-4 py-3 text-right">{formatNumber(s.dailyImpressions)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDialog({ open: true, initial: s })}><Pencil className="h-3.5 w-3.5" /></Button>
                          <DeleteConfirm onConfirm={() => removeScreen(s.id)} description={`ลบจอ "${s.name}"`} trigger={<Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600"><Trash2 className="h-3.5 w-3.5" /></Button>} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ScreenDialog
        open={dialog.open}
        initial={dialog.initial}
        onOpenChange={(o) => setDialog((st) => ({ ...st, open: o }))}
        onSaved={refresh}
      />
    </div>
  );
}

function ScreenCard({ s, onEdit, onDelete }: { s: Screen; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card className="group overflow-hidden shadow-soft transition hover:shadow-card">
      <div className="relative h-32 bg-gradient-brand flex items-center justify-center">
        <Monitor className="h-12 w-12 text-white/80" />
        <span className={cn("absolute top-2 right-2 rounded-full px-2 py-0.5 text-xs ring-1 ring-inset bg-white", AVAIL_CLS[s.availability])}>{s.availability}</span>
        <span className="absolute bottom-2 left-2 rounded bg-black/40 px-2 py-0.5 text-xs text-white">{s.size}</span>
        <div className="absolute top-2 left-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
          <Button variant="secondary" size="icon" className="h-7 w-7" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
          <DeleteConfirm onConfirm={onDelete} description={`ลบจอ "${s.name}"`} trigger={<Button variant="secondary" size="icon" className="h-7 w-7 text-rose-600"><Trash2 className="h-3.5 w-3.5" /></Button>} />
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{s.name}</p>
          {s.code && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">{s.code}</span>}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground"><MapPin className="inline h-3 w-3" /> {s.province} · {s.areaType}</p>
        {s.address && <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground" title={s.address}>{s.address}</p>}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded bg-slate-50 p-2">
            <p className="text-muted-foreground">เรท/วินาที</p>
            <p className="mt-0.5 font-semibold text-fresco">{formatTHB2(s.ratePerSecond ?? 0)}/วิ</p>
          </div>
          <div className="rounded bg-slate-50 p-2">
            <p className="text-muted-foreground">Daily impr.</p>
            <p className="mt-0.5 font-semibold">{formatNumber(s.dailyImpressions)}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.hours}</span>
          {s.lat != null && s.lng != null
            ? <a href={`https://www.google.com/maps?q=${s.lat},${s.lng}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-fresco hover:underline"><MapPin className="h-3 w-3" />แผนที่</a>
            : <span className="flex items-center gap-1"><Users className="h-3 w-3" />{s.audience.join(", ")}</span>}
        </div>
      </div>
    </Card>
  );
}
