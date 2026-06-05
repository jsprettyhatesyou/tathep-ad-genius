import { createFileRoute, useRouter, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Combobox, DeleteConfirm } from "@/components/crm/form-kit";
import { type Campaign } from "@/lib/mock-data";
import { listCampaigns, listCompanies, listScreens, listInfluencers, deleteCampaign, createCampaign } from "@/lib/api/crm.functions";
import { matchmakeCampaign } from "@/lib/api/ai.functions";
import { CampaignDialog } from "@/components/crm/entity-dialogs";
import { computeHealth, taskProgress, HEALTH_META, typeLabel, aggregatePerformance, campaignScoreOf, bestPerformer, buildScreensPlan, buildInfluencersPlan, generateDefaultTasks } from "@/lib/activation";
import { formatTHB, formatNumber } from "@/lib/mock-data";
import { Plus, Megaphone, Pencil, Trash2, Monitor, Star, Layers, CheckSquare, Wand2, Sparkles, Eye, BarChart3, FileText, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/campaigns/")({
  head: () => ({ meta: [{ title: "Brand Activations — Tathep CRM" }] }),
  loader: async () => {
    const [campaigns, companies, screens, influencers] = await Promise.all([
      listCampaigns(), listCompanies(), listScreens(), listInfluencers(),
    ]);
    return { campaigns, companies, screens, influencers };
  },
  component: CampaignsPage,
});

const STATUS_CLS: Record<string, string> = {
  Planning: "bg-slate-100 text-slate-700 ring-slate-200",
  "In Progress": "bg-sky-50 text-sky-700 ring-sky-200",
  "Waiting Approval": "bg-amber-50 text-amber-700 ring-amber-200",
  Live: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Completed: "bg-teal-50 text-teal-700 ring-teal-200",
  Paused: "bg-orange-50 text-orange-700 ring-orange-200",
  Cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
};

const today = () => new Date().toISOString().slice(0, 10);

function CampaignsPage() {
  const { campaigns, companies, screens, influencers } = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  const refresh = () => router.invalidate();
  const companyMap = new Map(companies.map((c) => [c.id, c]));
  const td = today();

  const [dialog, setDialog] = useState<{ open: boolean; initial: Campaign | null }>({ open: false, initial: null });
  const [matchOpen, setMatchOpen] = useState(false);

  const removeCampaign = async (id: string) => {
    try { await deleteCampaign({ data: { id } }); toast.success("ลบแล้ว"); refresh(); }
    catch (e: any) { toast.error(`ลบไม่สำเร็จ: ${e?.message ?? "error"}`); }
  };

  return (
    <div>
      <PageHeader
        title="Brand Activations"
        subtitle="จัดการ execution ของแคมเปญ DOOH + Influencer — สถานะ งาน ความเสี่ยง และสิ่งที่ต้องทำวันนี้"
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => setMatchOpen(true)}><Wand2 className="h-4 w-4" /> AI Matchmaker</Button>
            <Button size="sm" className="bg-fresco hover:bg-fresco/90" onClick={() => setDialog({ open: true, initial: null })}><Plus className="h-4 w-4" /> New Activation</Button>
          </>
        }
      />

      <div className="grid gap-4 p-8 lg:grid-cols-2 xl:grid-cols-3">
        {campaigns.map((c) => {
          const health = computeHealth(c, td);
          const hm = HEALTH_META[health];
          const tp = taskProgress(c.tasks);
          const pct = tp.total ? Math.round((tp.done / tp.total) * 100) : 0;
          const isInternal = c.campaignType === "INTERNAL_MARKETING";
          const agg = aggregatePerformance(c);
          const score = campaignScoreOf(c);
          const best = bestPerformer(c);
          const hasResults = (c.influencerPerf ?? []).length > 0;
          const go = (tab = "overview") => navigate({ to: "/campaigns/$id", params: { id: c.id }, search: { tab } });
          const aiLine = best
            ? `${best.p.influencerName} ทำ engagement สูงสุด — ER ${best.d.engagementRate.toFixed(1)}%, score ${best.d.score}/100`
            : (c.aiInsight || "ยังไม่มีข้อมูลผลลัพธ์ — กด \"Update Results\" เพื่อจำลองข้อมูล");
          return (
            <Card key={c.id} className="group flex cursor-pointer flex-col p-5 shadow-soft transition hover:shadow-card hover:border-fresco/30" onClick={() => go()}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-brand text-white"><Megaphone className="h-5 w-5" /></div>
                  <div>
                    <p className="font-semibold leading-tight">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{companyMap.get(c.companyId)?.name ?? "—"}</p>
                  </div>
                </div>
                <div className="flex opacity-0 transition group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDialog({ open: true, initial: c })}><Pencil className="h-3.5 w-3.5" /></Button>
                  <DeleteConfirm onConfirm={() => removeCampaign(c.id)} description={`ลบ "${c.name}"`} trigger={<Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600"><Trash2 className="h-3.5 w-3.5" /></Button>} />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", isInternal ? "bg-violet-50 text-violet-700 ring-violet-200" : "bg-indigo-50 text-indigo-700 ring-indigo-200")}>{isInternal ? "🏠" : "🤝"} {typeLabel(c.campaignType)}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] ring-1 ring-inset", STATUS_CLS[c.status] ?? "bg-slate-100 text-slate-600 ring-slate-200")}>{c.status}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] ring-1 ring-inset", hm.cls)}>{hm.dot} {hm.label}</span>
                {c.objective && <span className="rounded-full bg-fresco/10 px-2 py-0.5 text-[11px] text-fresco">{c.objective}</span>}
              </div>

              <p className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{c.start || "—"} → {c.end || "—"}</span>
                <span className="font-medium text-slate-600">{c.budget ? formatTHB(c.budget) : "งบยังไม่ระบุ"}</span>
              </p>

              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded-lg bg-slate-50 p-1.5"><Monitor className="mx-auto h-4 w-4 text-fresco" /><p className="mt-0.5 font-bold">{(c.screensPlan ?? []).length}</p><p className="text-[10px] text-muted-foreground">Screens</p></div>
                <div className="rounded-lg bg-slate-50 p-1.5"><Star className="mx-auto h-4 w-4 text-fresco" /><p className="mt-0.5 font-bold">{(c.influencersPlan ?? []).length}</p><p className="text-[10px] text-muted-foreground">Infl.</p></div>
                <div className="rounded-lg bg-slate-50 p-1.5"><Layers className="mx-auto h-4 w-4 text-fresco" /><p className="mt-0.5 font-bold">{(c.deliverables ?? []).length}</p><p className="text-[10px] text-muted-foreground">Content</p></div>
                <div className="rounded-lg bg-slate-50 p-1.5"><CheckSquare className="mx-auto h-4 w-4 text-fresco" /><p className="mt-0.5 font-bold">{tp.done}/{tp.total}</p><p className="text-[10px] text-muted-foreground">Tasks</p></div>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-fresco transition-all" style={{ width: `${pct}%` }} />
              </div>

              {/* Performance snapshot */}
              <div className="mt-3 rounded-lg border border-border/60 bg-slate-50/50 p-2.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Performance</span>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-fresco"><TrendingUp className="h-3 w-3" /> {score}/100</span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-center text-[11px]">
                  <Snap label="DOOH" value={compact(agg.doohReach)} />
                  <Snap label="Infl." value={compact(agg.influencerReach)} />
                  <Snap label="Total" value={compact(agg.totalReach)} />
                  <Snap label="Eng." value={compact(agg.socialEngagement)} />
                  <Snap label="QR" value={formatNumber(agg.qrScans ?? 0)} />
                  <Snap label={isInternal ? "Regs" : "Leads"} value={formatNumber((isInternal ? agg.registrations : agg.leads) ?? 0)} />
                  <Snap label={isInternal ? "Coupon" : "Visits"} value={formatNumber((isInternal ? agg.couponUsage : agg.estimatedVisits) ?? 0)} />
                  <Snap label="Rev." value={compact(agg.revenue)} />
                </div>
                {best && (
                  <p className="mt-2 border-t border-border/60 pt-1.5 text-[11px]">
                    <span className="text-muted-foreground">⭐ Top: </span>
                    <span className="font-medium">{best.p.influencerName}</span>
                    <span className="text-muted-foreground"> · {compact(best.p.views)} views · ER {best.d.engagementRate.toFixed(1)}% · {best.d.score}/100</span>
                  </p>
                )}
              </div>

              {/* AI insight */}
              <p className="mt-2 line-clamp-2 rounded-lg bg-gradient-ai px-2.5 py-1.5 text-[11px] text-slate-700"><Sparkles className="mr-1 inline h-3 w-3 text-fresco" />{aiLine}</p>

              {/* CTAs */}
              <div className="mt-3 grid grid-cols-2 gap-1.5" onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => go()}><Eye className="h-3.5 w-3.5" /> View Details</Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => go("results")}><BarChart3 className="h-3.5 w-3.5" /> {hasResults ? "Results" : "Update Results"}</Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => go("ai")}><Sparkles className="h-3.5 w-3.5" /> AI Insight</Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => go("results")}><FileText className="h-3.5 w-3.5" /> Report</Button>
              </div>
            </Card>
          );
        })}

        {campaigns.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            ยังไม่มี activation — กด "New Activation" เพื่อสร้างอันแรก
          </div>
        )}
      </div>

      <CampaignDialog open={dialog.open} initial={dialog.initial} companies={companies} screens={screens} influencers={influencers} onOpenChange={(o) => setDialog((s) => ({ ...s, open: o }))} onSaved={refresh} />
      <MatchmakerDialog open={matchOpen} onOpenChange={setMatchOpen} companies={companies} screens={screens} influencers={influencers} onCreated={refresh} />
    </div>
  );
}

function Snap({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white p-1">
      <p className="font-bold leading-tight text-foreground">{value}</p>
      <p className="text-[9px] text-muted-foreground">{label}</p>
    </div>
  );
}

/* ---------- AI Campaign Matchmaker ---------- */
const compact = (n?: number) => { const v = n ?? 0; return v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : v >= 1000 ? Math.round(v / 1000) + "K" : String(v); };

function MatchmakerDialog({ open, onOpenChange, companies, screens, influencers, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; companies: any[]; screens: any[]; influencers: any[]; onCreated: () => void }) {
  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    if (!companyId) { toast.error("เลือกบริษัทก่อน"); return; }
    setLoading(true); setResult(null);
    try { setResult(await matchmakeCampaign({ data: { companyId } })); }
    catch (e: any) { toast.error(`จับคู่ไม่สำเร็จ: ${e?.message ?? "error"}`); }
    finally { setLoading(false); }
  };

  const createFromMatch = async () => {
    if (!result) return;
    setCreating(true);
    try {
      const company = companies.find((c) => c.id === companyId);
      const screenIds = (result.recommendedScreens ?? []).map((n: string) => screens.find((s) => s.name === n)?.id).filter(Boolean);
      const influencerIds = (result.recommendedInfluencers ?? []).map((n: string) => influencers.find((i) => i.name === n)?.id).filter(Boolean);
      await createCampaign({
        data: {
          campaign: {
            name: `${company?.name ?? "Activation"} — AI Match`,
            companyId, objective: "Brand Awareness", status: "Planning",
            screenIds, influencerIds,
            screensPlan: buildScreensPlan(screenIds, screens, "", ""),
            influencersPlan: buildInfluencersPlan(influencerIds, influencers),
            tasks: generateDefaultTasks("", ""),
            aiInsight: result.rationale ?? "",
          },
        },
      });
      toast.success("สร้าง Activation จากผล AI แล้ว ✅");
      onCreated(); onOpenChange(false); setResult(null); setCompanyId("");
    } catch (e: any) {
      toast.error(`สร้างไม่สำเร็จ: ${e?.message ?? "error"}`);
    } finally { setCreating(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>🪄 AI Campaign Matchmaker</DialogTitle></DialogHeader>
        <p className="text-xs text-muted-foreground">เลือกลูกค้า → น้องตาเทพแนะนำป้าย + influencer ที่เหมาะที่สุด พร้อมประเมินผล</p>
        <div className="flex items-end gap-2">
          <div className="flex-1"><Combobox label="ลูกค้า" value={companyId} onChange={setCompanyId} options={companies.map((c) => ({ value: c.id, label: c.name }))} placeholder="เลือกบริษัท…" searchPlaceholder="ค้นหา…" /></div>
          <Button className="bg-fresco hover:bg-fresco/90" onClick={run} disabled={loading}><Sparkles className="h-4 w-4" /> {loading ? "กำลังจับคู่…" : "Match"}</Button>
        </div>
        {result && (
          <div className="space-y-3 rounded-lg border border-fresco/20 bg-gradient-ai p-4 text-sm">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-lg font-bold text-fresco">{compact(result.expectedReach)}</p><p className="text-[10px] text-muted-foreground">Expected Reach</p></div>
              <div><p className="text-lg font-bold text-fresco">{compact(result.expectedVisits)}</p><p className="text-[10px] text-muted-foreground">Expected Visits</p></div>
              <div><p className="text-lg font-bold text-emerald-600">{result.campaignScore}</p><p className="text-[10px] text-muted-foreground">Score</p></div>
            </div>
            <div><p className="text-xs font-semibold text-foreground">Recommended Screens</p><p className="text-xs text-slate-700">{(result.recommendedScreens ?? []).join(" · ") || "—"}</p></div>
            <div><p className="text-xs font-semibold text-foreground">Recommended Influencers</p><p className="text-xs text-slate-700">{(result.recommendedInfluencers ?? []).join(" · ") || "—"}</p></div>
            <p className="text-xs text-muted-foreground">{result.rationale}</p>
            <Button className="w-full bg-fresco hover:bg-fresco/90" onClick={createFromMatch} disabled={creating}><Plus className="h-4 w-4" /> {creating ? "กำลังสร้าง…" : "สร้าง Activation จากผลนี้"}</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
