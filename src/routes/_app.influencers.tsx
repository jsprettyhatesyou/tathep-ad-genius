import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { type Influencer } from "@/lib/mock-data";
import { listInfluencers, deleteInfluencer } from "@/lib/api/crm.functions";
import { InfluencerDialog } from "@/components/crm/entity-dialogs";
import { DeleteConfirm } from "@/components/crm/form-kit";
import { Plus, Search, Star, MapPin, Eye, Heart, Pencil, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/influencers")({
  head: () => ({ meta: [{ title: "Influencers — Tathep CRM" }] }),
  loader: async () => ({ influencers: await listInfluencers() }),
  component: InfluencersPage,
});

const STATUS_CLS: Record<string, string> = {
  Published: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "In Progress": "bg-amber-50 text-amber-700 ring-amber-200",
  Briefed: "bg-sky-50 text-sky-700 ring-sky-200",
  Idle: "bg-slate-100 text-slate-600 ring-slate-200",
};
const PLATFORM_CLS: Record<string, string> = {
  TikTok: "bg-slate-900 text-white",
  Instagram: "bg-gradient-to-br from-fuchsia-500 to-orange-400 text-white",
  Facebook: "bg-blue-600 text-white",
  YouTube: "bg-red-600 text-white",
};

const fmtFollowers = (n: number) => (n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M" : n >= 1000 ? Math.round(n / 1000) + "K" : String(n));

function InfluencersPage() {
  const { influencers } = Route.useLoaderData();
  const router = useRouter();
  const refresh = () => router.invalidate();
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; initial: Influencer | null }>({ open: false, initial: null });

  const rows = influencers.filter((i) => !query || i.name.toLowerCase().includes(query.toLowerCase()) || i.category.toLowerCase().includes(query.toLowerCase()));

  const remove = async (id: string) => {
    try { await deleteInfluencer({ data: { id } }); toast.success("ลบแล้ว"); refresh(); }
    catch (e: any) { toast.error(`ลบไม่สำเร็จ: ${e?.message ?? "error"}`); }
  };

  return (
    <div>
      <PageHeader
        title="Influencers"
        subtitle={`${influencers.length} creators — เครือข่ายครีเอเตอร์สำหรับ Brand Activation`}
        actions={<Button size="sm" className="bg-fresco hover:bg-fresco/90" onClick={() => setDialog({ open: true, initial: null })}><Plus className="h-4 w-4" /> เพิ่ม Influencer</Button>}
      />

      <div className="space-y-4 p-8">
        <Card className="p-3 shadow-soft">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาชื่อ / หมวดหมู่…" className="h-9 w-full rounded-lg border border-input bg-white pl-9 pr-3 text-sm focus:border-fresco focus:outline-none focus:ring-2 focus:ring-lake/30" />
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((i) => (
            <Card key={i.id} className="group p-5 shadow-soft transition hover:shadow-card">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-brand text-sm font-semibold text-white">
                    {i.name.replace(/[^A-Za-zก-๙]/g, "").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold leading-tight">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.category} · <MapPin className="inline h-3 w-3" /> {i.province || "—"}</p>
                  </div>
                </div>
                <div className="flex opacity-0 transition group-hover:opacity-100">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDialog({ open: true, initial: i })}><Pencil className="h-3.5 w-3.5" /></Button>
                  <DeleteConfirm onConfirm={() => remove(i.id)} description={`ลบ "${i.name}"`} trigger={<Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600"><Trash2 className="h-3.5 w-3.5" /></Button>} />
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-semibold", PLATFORM_CLS[i.platform] ?? "bg-slate-200 text-slate-700")}>{i.platform}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] ring-1 ring-inset", STATUS_CLS[i.contentStatus] ?? STATUS_CLS.Idle)}>{i.contentStatus}</span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-slate-50 p-2">
                  <Star className="mx-auto h-3.5 w-3.5 text-fresco" />
                  <p className="mt-0.5 font-bold">{fmtFollowers(i.followers)}</p>
                  <p className="text-[10px] text-muted-foreground">Followers</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <Eye className="mx-auto h-3.5 w-3.5 text-fresco" />
                  <p className="mt-0.5 font-bold">{fmtFollowers(i.avgViews)}</p>
                  <p className="text-[10px] text-muted-foreground">Avg Views</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <Heart className="mx-auto h-3.5 w-3.5 text-rose-500" />
                  <p className="mt-0.5 font-bold">{i.engagementRate}%</p>
                  <p className="text-[10px] text-muted-foreground">Engagement</p>
                </div>
              </div>

              {i.rateCard && <p className="mt-3 text-xs text-muted-foreground">💸 Rate: <span className="font-medium text-foreground">{i.rateCard}</span></p>}
              {i.brandsWorkedWith.length > 0 && (
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">🤝 เคยร่วมงาน: {i.brandsWorkedWith.join(", ")}</p>
              )}
            </Card>
          ))}

          {rows.length === 0 && (
            <Card className="col-span-full flex flex-col items-center gap-2 p-12 text-center shadow-soft">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-fresco/10"><Users className="h-6 w-6 text-fresco" /></div>
              <p className="font-medium">ยังไม่มี influencer</p>
              <p className="text-sm text-muted-foreground">กด "เพิ่ม Influencer" เพื่อสร้างเครือข่ายครีเอเตอร์</p>
            </Card>
          )}
        </div>
      </div>

      <InfluencerDialog open={dialog.open} initial={dialog.initial} onOpenChange={(o) => setDialog((s) => ({ ...s, open: o }))} onSaved={refresh} />
    </div>
  );
}
