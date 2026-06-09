import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CampaignDialog } from "@/components/crm/entity-dialogs";
import { type Campaign, type CampaignTask, type Deliverable, type InfluencerPerf, type AdsRow, formatTHB, formatNumber } from "@/lib/mock-data";
import { listCampaigns, listCompanies, listScreens, listInfluencers, updateCampaign } from "@/lib/api/crm.functions";
import {
  SCREEN_BOOKING_STATUS, INF_WORKFLOW_STATUS, DELIVERABLE_TYPES,
  TASK_STATUS, TASK_PRIORITY, RELATED_TYPES, CONTENT_STATUS, ADS_CHANNELS,
  computeHealth, taskProgress, isOverdue, coordinatorSummary, HEALTH_META, typeLabel,
  generateDefaultTasks, newDeliverable, newTask, newAdsRow, newInfluencerPerf,
  aggregatePerformance, campaignScoreOf, influencerDerived, adsDerived, REC_CLS,
  aiInsightCards, generateMockResults, bestPerformer,
} from "@/lib/activation";
import { TEAM_OPTIONS } from "@/lib/crm-options";
import { ArrowLeft, Pencil, Monitor, Star, Layers, CheckSquare, Plus, Trash2, Sparkles, AlertTriangle, TrendingUp, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/campaigns/$id")({
  head: () => ({ meta: [{ title: "Activation — Tathep CRM" }] }),
  validateSearch: (s: Record<string, unknown>) => ({ tab: typeof s.tab === "string" ? s.tab : "overview" }),
  loader: async ({ params }) => {
    const [campaigns, companies, screens, influencers] = await Promise.all([
      listCampaigns(), listCompanies(), listScreens(), listInfluencers(),
    ]);
    return { campaign: campaigns.find((c) => c.id === params.id) ?? null, companies, screens, influencers };
  },
  component: ActivationDetail,
});

const today = () => new Date().toISOString().slice(0, 10);
const compact = (n?: number) => { const v = n ?? 0; return v >= 1_000_000 ? (v / 1_000_000).toFixed(1) + "M" : v >= 1000 ? Math.round(v / 1000) + "K" : String(v); };

const Sel = ({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly string[] }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className="h-8 rounded-md border border-input bg-white px-2 text-xs focus:border-fresco focus:outline-none">
    {options.map((o) => <option key={o} value={o}>{o}</option>)}
  </select>
);

function ActivationDetail() {
  const { campaign, companies, screens, influencers } = Route.useLoaderData();
  const { tab } = Route.useSearch();
  const router = useRouter();
  const refresh = () => router.invalidate();
  const [c, setC] = useState<Campaign | null>(campaign);
  const [editOpen, setEditOpen] = useState(false);

  if (!c) {
    return (
      <div className="p-8">
        <Link to="/campaigns" className="text-sm text-fresco hover:underline"><ArrowLeft className="inline h-4 w-4" /> กลับ Brand Activations</Link>
        <Card className="mt-4 p-10 text-center text-sm text-muted-foreground">ไม่พบ activation นี้ (อาจถูกลบไปแล้ว)</Card>
      </div>
    );
  }

  const td = today();
  const isInternal = c.campaignType === "INTERNAL_MARKETING";
  const company = companies.find((x) => x.id === c.companyId);
  const health = computeHealth(c, td);
  const hm = HEALTH_META[health];
  const tp = taskProgress(c.tasks);
  const agg = aggregatePerformance(c);
  const score = campaignScoreOf(c);
  const best = bestPerformer(c);
  const hasResults = (c.influencerPerf ?? []).length > 0;

  // persist a partial patch + update local state
  const save = async (patch: Partial<Campaign>) => {
    setC((prev) => (prev ? { ...prev, ...patch } : prev));
    try { await updateCampaign({ data: { id: c.id, patch } }); }
    catch (e: any) { toast.error(`บันทึกไม่สำเร็จ: ${e?.message ?? "error"}`); refresh(); }
  };

  const setScreens = (arr: any[]) => save({ screensPlan: arr });
  const setInfs = (arr: any[]) => save({ influencersPlan: arr });
  const setDels = (arr: Deliverable[]) => save({ deliverables: arr });
  const setTasks = (arr: CampaignTask[]) => save({ tasks: arr });
  const setPerf = (arr: InfluencerPerf[]) => save({ influencerPerf: arr });
  const setAds = (arr: AdsRow[]) => save({ ads: arr });
  const setPerformance = (patch: Partial<Campaign["performance"]>) => save({ performance: { ...(c.performance ?? {}), ...patch } });
  const updPerf = (id: string, patch: Partial<InfluencerPerf>) => setPerf((c.influencerPerf ?? []).map((x) => x.id === id ? { ...x, ...patch } : x));

  const genResults = () => { save(generateMockResults(c)); toast.success("จำลองผลลัพธ์แล้ว (mock data)"); };

  const coord = coordinatorSummary(c, td);
  const blockers = (c.tasks ?? []).filter((t) => t.status === "Blocked");

  return (
    <div>
      <PageHeader
        title={c.name}
        subtitle={`${company?.name ?? "—"}${c.objective ? " · " + c.objective : ""}`}
        actions={
          <>
            <Link to="/campaigns"><Button size="sm" variant="outline"><ArrowLeft className="h-4 w-4" /> กลับ</Button></Link>
            <Button size="sm" className="bg-fresco hover:bg-fresco/90" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> แก้ไข Overview</Button>
          </>
        }
      />

      <div className="space-y-4 p-8">
        {/* status strip */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", isInternal ? "bg-violet-50 text-violet-700 ring-violet-200" : "bg-indigo-50 text-indigo-700 ring-indigo-200")}>{typeLabel(c.campaignType)}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 ring-1 ring-inset ring-slate-200">{c.status}</span>
          <span className={cn("rounded-full px-2.5 py-1 text-xs ring-1 ring-inset", hm.cls)}>{hm.label}</span>
          <span className="text-xs text-muted-foreground">{c.start || "—"} → {c.end || "—"}</span>
          <span className="text-xs text-muted-foreground">· Owner: {c.owner || "—"}</span>
          <span className="ml-auto flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-fresco" /> Score <b>{score}</b>/100</span>
            <span className="flex items-center gap-1.5"><CheckSquare className="h-4 w-4 text-fresco" /> Tasks {tp.done}/{tp.total}</span>
          </span>
        </div>

        <Tabs defaultValue={tab}>
          <TabsList className="flex-wrap bg-slate-100">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="planner">Planner</TabsTrigger>
            <TabsTrigger value="screens">Screens · {(c.screensPlan ?? []).length}</TabsTrigger>
            <TabsTrigger value="influencers">Influencers · {(c.influencersPlan ?? []).length}</TabsTrigger>
            <TabsTrigger value="content">Content · {(c.deliverables ?? []).length}</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="attribution">Attribution</TabsTrigger>
            <TabsTrigger value="ads">Ads · {(c.ads ?? []).length}</TabsTrigger>
            <TabsTrigger value="ai">AI Insights</TabsTrigger>
          </TabsList>

          {/* ===== Overview ===== */}
          <TabsContent value="overview" className="mt-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="p-5 shadow-soft lg:col-span-2">
                <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  <Field label="Campaign Type" value={typeLabel(c.campaignType)} />
                  <Field label="Client" value={company?.name ?? "—"} />
                  <Field label="Objective" value={c.objective ?? "—"} />
                  <Field label="Status" value={c.status} />
                  <Field label="Health" value={hm.label} />
                  <Field label="Owner" value={c.owner ?? "—"} />
                  <Field label="Period" value={`${c.start || "—"} → ${c.end || "—"}`} />
                  <Field label="Budget" value={c.budget ? formatTHB(c.budget) : "—"} />
                  <Field label="Campaign Score" value={`${score}/100`} />
                </div>
                {c.notes && <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{c.notes}</p>}
              </Card>
              <Card className="p-5 shadow-soft">
                <p className="text-sm font-semibold">Key Metrics</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Metric label="Total Reach" value={compact(agg.totalReach)} />
                  <Metric label="Engagement" value={compact(agg.socialEngagement)} />
                  <Metric label="QR Scans" value={formatNumber(agg.qrScans ?? 0)} />
                  {isInternal
                    ? <Metric label="Registrations" value={formatNumber(agg.registrations ?? 0)} />
                    : <Metric label="Leads" value={formatNumber(agg.leads ?? 0)} />}
                </div>
                <ul className="mt-3 space-y-1.5 text-sm">
                  <li className="flex items-center gap-2"><Monitor className="h-4 w-4 text-fresco" /> {(c.screensPlan ?? []).length} ป้าย</li>
                  <li className="flex items-center gap-2"><Star className="h-4 w-4 text-fresco" /> {(c.influencersPlan ?? []).length} influencers</li>
                  <li className="flex items-center gap-2"><Layers className="h-4 w-4 text-fresco" /> {(c.deliverables ?? []).length} content pieces</li>
                  <li className="flex items-center gap-2"><CheckSquare className="h-4 w-4 text-fresco" /> {tp.done}/{tp.total} tasks เสร็จ</li>
                </ul>
              </Card>
            </div>
          </TabsContent>

          {/* ===== Planner ===== */}
          <TabsContent value="planner" className="mt-4 space-y-4">
            <Card className="border-fresco/20 bg-gradient-ai p-4 shadow-soft">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-fresco">Next Actions</p>
                  <ul className="mt-1 space-y-1 text-sm text-slate-700">{coord.actions.map((a, i) => <li key={i}>→ {a}</li>)}</ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-rose-600">Blockers</p>
                  {blockers.length ? <ul className="mt-1 space-y-1 text-sm text-slate-700">{blockers.map((b) => <li key={b.id}>{b.title || "(ไม่มีชื่องาน)"}</li>)}</ul> : <p className="mt-1 text-sm text-muted-foreground">ไม่มี blocker</p>}
                </div>
              </div>
            </Card>
            <Card className="overflow-hidden shadow-soft">
              <div className="flex items-center justify-between border-b border-border bg-slate-50/60 px-4 py-3">
                <p className="text-sm font-medium">Tasks · {tp.done}/{tp.total} เสร็จ</p>
                <div className="flex gap-2">
                  {(c.tasks ?? []).length === 0 && <Button size="sm" variant="outline" onClick={() => setTasks(generateDefaultTasks(c.start ?? "", c.end ?? "", c.owner ?? ""))}><Sparkles className="h-3.5 w-3.5" /> สร้าง task เริ่มต้น</Button>}
                  <Button size="sm" variant="outline" onClick={() => setTasks([...(c.tasks ?? []), newTask(c.owner ?? "")])}><Plus className="h-3.5 w-3.5" /> เพิ่ม task</Button>
                </div>
              </div>
              <div className="divide-y divide-border/60">
                {(c.tasks ?? []).map((t) => {
                  const overdue = isOverdue(t, td);
                  return (
                    <div key={t.id} className={cn("flex flex-wrap items-center gap-2 p-3 text-xs", overdue && "bg-rose-50/40")}>
                      <input type="checkbox" checked={t.status === "Done"} onChange={(e) => setTasks((c.tasks ?? []).map((x) => x.id === t.id ? { ...x, status: e.target.checked ? "Done" : "Todo" } : x))} className="h-4 w-4 accent-fresco" />
                      <input value={t.title} placeholder="ชื่องาน" onChange={(e) => setTasks((c.tasks ?? []).map((x) => x.id === t.id ? { ...x, title: e.target.value } : x))} className={cn("h-8 min-w-[160px] flex-1 rounded-md border border-input bg-white px-2", t.status === "Done" && "line-through text-muted-foreground")} />
                      <Sel value={t.relatedType} options={RELATED_TYPES} onChange={(v) => setTasks((c.tasks ?? []).map((x) => x.id === t.id ? { ...x, relatedType: v } : x))} />
                      <Sel value={t.owner || (TEAM_OPTIONS[0] ?? "")} options={TEAM_OPTIONS} onChange={(v) => setTasks((c.tasks ?? []).map((x) => x.id === t.id ? { ...x, owner: v } : x))} />
                      <input type="date" value={t.dueDate} onChange={(e) => setTasks((c.tasks ?? []).map((x) => x.id === t.id ? { ...x, dueDate: e.target.value } : x))} className={cn("h-8 rounded-md border border-input bg-white px-2", overdue && "border-rose-400 text-rose-600")} />
                      <Sel value={t.priority} options={TASK_PRIORITY} onChange={(v) => setTasks((c.tasks ?? []).map((x) => x.id === t.id ? { ...x, priority: v } : x))} />
                      <Sel value={t.status} options={TASK_STATUS} onChange={(v) => setTasks((c.tasks ?? []).map((x) => x.id === t.id ? { ...x, status: v } : x))} />
                      {overdue && <span className="flex items-center gap-0.5 text-[10px] font-medium text-rose-600"><AlertTriangle className="h-3 w-3" /> เลยกำหนด</span>}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={() => setTasks((c.tasks ?? []).filter((x) => x.id !== t.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  );
                })}
                {(c.tasks ?? []).length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">ยังไม่มี task — กด "สร้าง task เริ่มต้น"</p>}
              </div>
            </Card>
          </TabsContent>

          {/* ===== Screens ===== */}
          <TabsContent value="screens" className="mt-4">
            <Card className="overflow-x-auto shadow-soft">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-slate-50/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2">Screen</th><th className="px-4 py-2">Province</th><th className="px-4 py-2">Booking Start</th><th className="px-4 py-2">Booking End</th><th className="px-4 py-2">Status</th>
                </tr></thead>
                <tbody>
                  {(c.screensPlan ?? []).map((s) => (
                    <tr key={s.id} className="border-b border-border/60">
                      <td className="px-4 py-2 font-medium">{s.screenName}</td>
                      <td className="px-4 py-2 text-muted-foreground">{s.province}</td>
                      <td className="px-4 py-2"><input type="date" value={s.bookingStartDate} onChange={(e) => setScreens((c.screensPlan ?? []).map((x) => x.id === s.id ? { ...x, bookingStartDate: e.target.value } : x))} className="h-8 rounded-md border border-input bg-white px-2 text-xs" /></td>
                      <td className="px-4 py-2"><input type="date" value={s.bookingEndDate} onChange={(e) => setScreens((c.screensPlan ?? []).map((x) => x.id === s.id ? { ...x, bookingEndDate: e.target.value } : x))} className="h-8 rounded-md border border-input bg-white px-2 text-xs" /></td>
                      <td className="px-4 py-2"><Sel value={s.status} options={SCREEN_BOOKING_STATUS} onChange={(v) => setScreens((c.screensPlan ?? []).map((x) => x.id === s.id ? { ...x, status: v } : x))} /></td>
                    </tr>
                  ))}
                  {(c.screensPlan ?? []).length === 0 && <tr><td colSpan={5} className="p-6 text-center text-sm text-muted-foreground">ยังไม่มีป้าย — เพิ่มผ่านปุ่ม "แก้ไข Overview"</td></tr>}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          {/* ===== Influencers (workflow table) ===== */}
          <TabsContent value="influencers" className="mt-4">
            <Card className="overflow-x-auto shadow-soft">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-slate-50/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2">Influencer</th><th className="px-4 py-2">Platform</th><th className="px-4 py-2">Category</th><th className="px-4 py-2 text-right">Followers</th><th className="px-4 py-2">Rate</th><th className="px-4 py-2">Deliverables</th><th className="px-4 py-2">Publish</th><th className="px-4 py-2">Status</th>
                </tr></thead>
                <tbody>
                  {(c.influencersPlan ?? []).map((i) => {
                    const dels = (c.deliverables ?? []).filter((d) => d.influencerId === i.influencerId);
                    const pub = dels.map((d) => d.publishDate).filter(Boolean).sort()[0] ?? "—";
                    return (
                      <tr key={i.id} className="border-b border-border/60">
                        <td className="px-4 py-2 font-medium">{i.name}</td>
                        <td className="px-4 py-2 text-muted-foreground">{i.platform}</td>
                        <td className="px-4 py-2 text-muted-foreground">{i.category || "—"}</td>
                        <td className="px-4 py-2 text-right">{formatNumber(i.followerCount)}</td>
                        <td className="px-4 py-2 text-muted-foreground">{i.rate || "—"}</td>
                        <td className="px-4 py-2 text-center">{dels.length}</td>
                        <td className="px-4 py-2 text-muted-foreground">{pub}</td>
                        <td className="px-4 py-2"><Sel value={i.status} options={INF_WORKFLOW_STATUS} onChange={(v) => setInfs((c.influencersPlan ?? []).map((x) => x.id === i.id ? { ...x, status: v } : x))} /></td>
                      </tr>
                    );
                  })}
                  {(c.influencersPlan ?? []).length === 0 && <tr><td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">ยังไม่มี influencer — เพิ่มผ่าน "แก้ไข Overview"</td></tr>}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          {/* ===== Content ===== */}
          <TabsContent value="content" className="mt-4 space-y-3">
            {(c.influencersPlan ?? []).map((inf) => {
              const dels = (c.deliverables ?? []).filter((d) => d.influencerId === inf.influencerId);
              return (
                <Card key={inf.id} className="p-4 shadow-soft">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold">{inf.name} <span className="text-xs font-normal text-muted-foreground">· {inf.platform}</span></p>
                    <Button size="sm" variant="outline" onClick={() => setDels([...(c.deliverables ?? []), newDeliverable(inf.influencerId, inf.name)])}><Plus className="h-3.5 w-3.5" /> เพิ่ม content</Button>
                  </div>
                  <div className="space-y-2">
                    {dels.map((d) => (
                      <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 p-2 text-xs">
                        <Sel value={d.type} options={DELIVERABLE_TYPES} onChange={(v) => setDels((c.deliverables ?? []).map((x) => x.id === d.id ? { ...x, type: v } : x))} />
                        <span className="text-muted-foreground">x</span>
                        <input type="number" value={d.quantity} onChange={(e) => setDels((c.deliverables ?? []).map((x) => x.id === d.id ? { ...x, quantity: Number(e.target.value) || 1 } : x))} className="h-8 w-14 rounded-md border border-input bg-white px-2 text-xs" />
                        <input type="date" value={d.publishDate} onChange={(e) => setDels((c.deliverables ?? []).map((x) => x.id === d.id ? { ...x, publishDate: e.target.value } : x))} className="h-8 rounded-md border border-input bg-white px-2 text-xs" title="publish date" />
                        <Sel value={(CONTENT_STATUS as readonly string[]).includes(d.status) ? d.status : "Drafting"} options={CONTENT_STATUS} onChange={(v) => setDels((c.deliverables ?? []).map((x) => x.id === d.id ? { ...x, status: v } : x))} />
                        <input value={d.contentUrl} placeholder="content / final link" onChange={(e) => setDels((c.deliverables ?? []).map((x) => x.id === d.id ? { ...x, contentUrl: e.target.value } : x))} className="h-8 min-w-[120px] flex-1 rounded-md border border-input bg-white px-2 text-xs" />
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={() => setDels((c.deliverables ?? []).filter((x) => x.id !== d.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                    {dels.length === 0 && <p className="text-xs text-muted-foreground">ยังไม่มี content piece</p>}
                  </div>
                </Card>
              );
            })}
            {(c.influencersPlan ?? []).length === 0 && <Card className="p-6 text-center text-sm text-muted-foreground">เพิ่ม influencer ก่อนจึงสร้าง content ได้</Card>}
          </TabsContent>

          {/* ===== Results ===== */}
          <TabsContent value="results" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">ผลลัพธ์ระดับแคมเปญ {isInternal ? "(Internal Marketing)" : "(Client Activation)"}</p>
              <Button size="sm" variant="outline" onClick={genResults}><Wand2 className="h-3.5 w-3.5" /> {hasResults ? "สุ่มผลลัพธ์ใหม่" : "จำลองผลลัพธ์ (mock)"}</Button>
            </div>
            <Card className="flex flex-wrap items-end gap-3 p-4 shadow-soft">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">DOOH Reach (กรอกเอง)</label>
                <CompactNumInput value={c.performance?.doohReach} onChange={(v) => setPerformance({ doohReach: v })} className="h-9 w-40 px-2 text-sm" />
              </div>
              <p className="text-xs text-muted-foreground">ยอด reach จากจอ DOOH — ตอนนี้กรอกมือ อนาคตจะดึงจากระบบจออัตโนมัติ · ตัวเลขที่เหลือรวมจากแท็บ Attribution + Ads ให้เอง</p>
            </Card>
            {!(hasResults || (agg.doohReach ?? 0) > 0) ? (
              <Card className="p-10 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูลผลลัพธ์ — กรอก DOOH Reach ด้านบน + ใส่ตัวเลขในแท็บ Attribution/Ads หรือกด "จำลองผลลัพธ์ (mock)"</Card>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {isInternal ? (
                    <>
                      <BigMetric label="New Users / Registrations" value={formatNumber(agg.registrations ?? 0)} />
                      <BigMetric label="Coupon Usage" value={formatNumber(agg.couponUsage ?? 0)} />
                      <BigMetric label="Cost / Registration" value={agg.costPerRegistration ? formatTHB(agg.costPerRegistration) : "—"} />
                      <BigMetric label="Influencer Views" value={compact(agg.influencerReach)} />
                      <BigMetric label="Social Engagement" value={compact(agg.socialEngagement)} />
                      <BigMetric label="QR Scans" value={formatNumber(agg.qrScans ?? 0)} />
                      <BigMetric label="Leads" value={formatNumber(agg.leads ?? 0)} />
                      <BigMetric label="Campaign Score" value={`${score}/100`} highlight />
                    </>
                  ) : (
                    <>
                      <BigMetric label="DOOH Reach" value={compact(agg.doohReach)} />
                      <BigMetric label="Influencer Reach" value={compact(agg.influencerReach)} />
                      <BigMetric label="Total Reach" value={compact(agg.totalReach)} />
                      <BigMetric label="Engagement" value={compact(agg.socialEngagement)} />
                      <BigMetric label="QR Scans" value={formatNumber(agg.qrScans ?? 0)} />
                      <BigMetric label="Estimated Visits" value={formatNumber(agg.estimatedVisits ?? 0)} />
                      <BigMetric label="Leads" value={formatNumber(agg.leads ?? 0)} />
                      <BigMetric label="Revenue" value={agg.revenue ? formatTHB(agg.revenue) : "—"} highlight />
                    </>
                  )}
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <Card className="p-5 shadow-soft">
                    <p className="mb-3 text-sm font-semibold">Reach Breakdown</p>
                    <BarChart rows={[
                      { label: "DOOH", value: agg.doohReach ?? 0 },
                      { label: "Influencer", value: agg.influencerReach ?? 0 },
                    ]} fmt={compact} />
                  </Card>
                  <Card className="p-5 shadow-soft">
                    <p className="mb-3 text-sm font-semibold">Engagement by Creator</p>
                    <BarChart rows={(c.influencerPerf ?? []).map((p) => ({ label: p.influencerName, value: influencerDerived(p).engagement }))} fmt={compact} />
                  </Card>
                </div>
              </>
            )}
          </TabsContent>

          {/* ===== Attribution ===== */}
          <TabsContent value="attribution" className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">Influencer คนไหนคุ้มที่สุด? — กรอกตัวเลขจริงในตารางได้เลย (ช่องสีขาว = แก้ได้, คอลัมน์เทา = คำนวณให้)</p>
              <div className="flex gap-2">
                {(c.influencerPerf ?? []).length === 0 && (c.influencersPlan ?? []).length > 0 && (
                  <Button size="sm" variant="outline" onClick={() => { setPerf((c.influencersPlan ?? []).map((i) => newInfluencerPerf(i.influencerId, i.name, i.platform))); toast.success("สร้างแถวจากรายชื่อ influencer แล้ว — กรอกตัวเลขได้เลย"); }}><Plus className="h-3.5 w-3.5" /> กรอกจากรายชื่อ</Button>
                )}
                <Button size="sm" variant="outline" onClick={() => setPerf([...(c.influencerPerf ?? []), newInfluencerPerf("", "", "TikTok")])}><Plus className="h-3.5 w-3.5" /> เพิ่มแถว</Button>
                <Button size="sm" variant="outline" onClick={genResults}><Wand2 className="h-3.5 w-3.5" /> จำลอง (mock)</Button>
              </div>
            </div>
            <Card className="overflow-x-auto shadow-soft">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border bg-slate-50/60 text-left uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2">Influencer</th><th className="px-2 py-2">Platform</th><th className="px-2 py-2 text-right">Views</th><th className="px-2 py-2 text-right">Likes</th><th className="px-2 py-2 text-right">Comm.</th><th className="px-2 py-2 text-right">Shares</th><th className="px-2 py-2 text-right">Saves</th><th className="px-2 py-2 text-right">Clicks</th><th className="px-2 py-2 text-right">QR</th><th className="px-2 py-2 text-right">Leads</th><th className="px-2 py-2 text-right">Regs</th><th className="px-2 py-2 text-right">Coupon</th><th className="px-2 py-2 text-right">Visits</th><th className="px-2 py-2 text-right">Revenue</th><th className="px-2 py-2 text-right">Cost</th><th className="px-2 py-2 text-right">ER%</th><th className="px-2 py-2 text-right">C/Eng</th><th className="px-2 py-2 text-right">C/Lead</th><th className="px-2 py-2 text-right">Score</th><th className="px-2 py-2">Rec.</th><th className="px-2 py-2"></th>
                </tr></thead>
                <tbody>
                  {(c.influencerPerf ?? []).map((p) => {
                    const d = influencerDerived(p);
                    return (
                      <tr key={p.id} className="border-b border-border/60">
                        <td className="px-2 py-1.5"><input value={p.influencerName} placeholder="ชื่อ" onChange={(e) => updPerf(p.id, { influencerName: e.target.value })} className="h-8 w-28 rounded-md border border-input bg-white px-2 text-xs" /></td>
                        <td className="px-2 py-1.5"><input value={p.platform} placeholder="platform" onChange={(e) => updPerf(p.id, { platform: e.target.value })} className="h-8 w-20 rounded-md border border-input bg-white px-2 text-xs" /></td>
                        <td className="px-2 py-1.5"><PNum value={p.views} onChange={(v) => updPerf(p.id, { views: v })} /></td>
                        <td className="px-2 py-1.5"><PNum value={p.likes} onChange={(v) => updPerf(p.id, { likes: v })} /></td>
                        <td className="px-2 py-1.5"><PNum value={p.comments} onChange={(v) => updPerf(p.id, { comments: v })} /></td>
                        <td className="px-2 py-1.5"><PNum value={p.shares} onChange={(v) => updPerf(p.id, { shares: v })} /></td>
                        <td className="px-2 py-1.5"><PNum value={p.saves} onChange={(v) => updPerf(p.id, { saves: v })} /></td>
                        <td className="px-2 py-1.5"><PNum value={p.clicks} onChange={(v) => updPerf(p.id, { clicks: v })} /></td>
                        <td className="px-2 py-1.5"><PNum value={p.qrScans} onChange={(v) => updPerf(p.id, { qrScans: v })} /></td>
                        <td className="px-2 py-1.5"><PNum value={p.leads} onChange={(v) => updPerf(p.id, { leads: v })} /></td>
                        <td className="px-2 py-1.5"><PNum value={p.registrations} onChange={(v) => updPerf(p.id, { registrations: v })} /></td>
                        <td className="px-2 py-1.5"><PNum value={p.couponUsage} onChange={(v) => updPerf(p.id, { couponUsage: v })} /></td>
                        <td className="px-2 py-1.5"><PNum value={p.estimatedVisits} onChange={(v) => updPerf(p.id, { estimatedVisits: v })} /></td>
                        <td className="px-2 py-1.5"><PNum value={p.revenue} onChange={(v) => updPerf(p.id, { revenue: v })} /></td>
                        <td className="px-2 py-1.5"><PNum value={p.cost} onChange={(v) => updPerf(p.id, { cost: v })} /></td>
                        <td className="px-2 py-2 text-right text-muted-foreground">{d.engagementRate.toFixed(1)}</td>
                        <td className="px-2 py-2 text-right text-muted-foreground">{d.cpe ? d.cpe.toFixed(1) : "—"}</td>
                        <td className="px-2 py-2 text-right text-muted-foreground">{d.cpl ? Math.round(d.cpl) : "—"}</td>
                        <td className="px-2 py-2 text-right font-semibold">{d.score}</td>
                        <td className="px-2 py-2"><span className={cn("rounded-full px-2 py-0.5 text-[10px] ring-1 ring-inset", REC_CLS[d.recommendation])}>{d.recommendation}</span></td>
                        <td className="px-2 py-2"><Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={() => setPerf((c.influencerPerf ?? []).filter((x) => x.id !== p.id))}><Trash2 className="h-3.5 w-3.5" /></Button></td>
                      </tr>
                    );
                  })}
                  {(c.influencerPerf ?? []).length === 0 && <tr><td colSpan={21} className="p-6 text-center text-muted-foreground">ยังไม่มีข้อมูล — กด "กรอกจากรายชื่อ" เพื่อสร้างแถวว่างให้กรอก หรือ "จำลอง (mock)"</td></tr>}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          {/* ===== Ads ===== */}
          <TabsContent value="ads" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Ads performance by channel · ได้ผลดีไหม?</p>
              <div className="flex gap-2">
                {!hasResults && <Button size="sm" variant="outline" onClick={genResults}><Wand2 className="h-3.5 w-3.5" /> จำลอง (mock)</Button>}
                <Button size="sm" variant="outline" onClick={() => setAds([...(c.ads ?? []), newAdsRow()])}><Plus className="h-3.5 w-3.5" /> เพิ่มช่อง</Button>
              </div>
            </div>
            <Card className="overflow-x-auto shadow-soft">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border bg-slate-50/60 text-left uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Channel</th><th className="px-3 py-2">Campaign Name</th><th className="px-3 py-2 text-right">Spend</th><th className="px-3 py-2 text-right">Impr.</th><th className="px-3 py-2 text-right">Reach</th><th className="px-3 py-2 text-right">Clicks</th><th className="px-3 py-2 text-right">CTR%</th><th className="px-3 py-2 text-right">CPC</th><th className="px-3 py-2 text-right">CPM</th><th className="px-3 py-2 text-right">Conv.</th><th className="px-3 py-2 text-right">C/Conv</th><th className="px-3 py-2"></th>
                </tr></thead>
                <tbody>
                  {(c.ads ?? []).map((a) => {
                    const d = adsDerived(a);
                    const upd = (patch: Partial<AdsRow>) => setAds((c.ads ?? []).map((x) => x.id === a.id ? { ...x, ...patch } : x));
                    return (
                      <tr key={a.id} className="border-b border-border/60">
                        <td className="px-3 py-2"><Sel value={a.channel} options={ADS_CHANNELS} onChange={(v) => upd({ channel: v })} /></td>
                        <td className="px-3 py-2"><input value={a.campaignName} onChange={(e) => upd({ campaignName: e.target.value })} className="h-8 min-w-[120px] rounded-md border border-input bg-white px-2 text-xs" /></td>
                        <td className="px-3 py-2"><NumCell value={a.spend} onChange={(v) => upd({ spend: v })} /></td>
                        <td className="px-3 py-2"><NumCell value={a.impressions} onChange={(v) => upd({ impressions: v })} /></td>
                        <td className="px-3 py-2"><NumCell value={a.reach} onChange={(v) => upd({ reach: v })} /></td>
                        <td className="px-3 py-2"><NumCell value={a.clicks} onChange={(v) => upd({ clicks: v })} /></td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{d.ctr.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{d.cpc ? d.cpc.toFixed(1) : "—"}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{d.cpm ? d.cpm.toFixed(1) : "—"}</td>
                        <td className="px-3 py-2"><NumCell value={a.conversions} onChange={(v) => upd({ conversions: v })} /></td>
                        <td className="px-3 py-2 text-right font-medium">{d.costPerConversion ? Math.round(d.costPerConversion) : "—"}</td>
                        <td className="px-3 py-2"><Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600" onClick={() => setAds((c.ads ?? []).filter((x) => x.id !== a.id))}><Trash2 className="h-3.5 w-3.5" /></Button></td>
                      </tr>
                    );
                  })}
                  {(c.ads ?? []).length === 0 && <tr><td colSpan={12} className="p-6 text-center text-muted-foreground">ยังไม่มีข้อมูล ads — กด "จำลอง" หรือ "เพิ่มช่อง"</td></tr>}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          {/* ===== AI Insights ===== */}
          <TabsContent value="ai" className="mt-4 space-y-4">
            {best && (
              <Card className="border-fresco/20 bg-gradient-ai p-4 shadow-soft">
                <p className="text-xs font-semibold text-fresco">Best Performing Creator</p>
                <p className="mt-1 text-sm text-slate-700">{best.p.influencerName} ({best.p.platform}) — ER {best.d.engagementRate.toFixed(1)}%, score {best.d.score}/100{best.d.cpe ? `, cost/eng ฿${best.d.cpe.toFixed(1)}` : ""}</p>
              </Card>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {aiInsightCards(c).map((card, i) => (
                <Card key={i} className="p-5 shadow-soft">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-fresco"><Sparkles className="h-4 w-4" /> {card.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{card.body}</p>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <CampaignDialog open={editOpen} initial={c} companies={companies} screens={screens} influencers={influencers} onOpenChange={setEditOpen} onSaved={refresh} />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2 text-center">
      <p className="text-base font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function BigMetric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={cn("p-4 text-center shadow-soft", highlight && "border-fresco/30 bg-fresco/5")}>
      <p className={cn("text-xl font-bold", highlight ? "text-fresco" : "text-foreground")}>{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </Card>
  );
}

function BarChart({ rows, fmt }: { rows: { label: string; value: number }[]; fmt: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="text-sm text-muted-foreground">ไม่มีข้อมูล</p>;
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="w-28 shrink-0 truncate text-muted-foreground" title={r.label}>{r.label}</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-fresco transition-all" style={{ width: `${Math.round((r.value / max) * 100)}%` }} />
          </div>
          <span className="w-12 shrink-0 text-right font-medium">{fmt(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

// parse "1.2m", "180k", "1,200" → number
function parseCompact(s: string): number {
  const t = s.trim().replace(/,/g, "").toLowerCase();
  if (!t || t === "-" || t === ".") return 0;
  const m = t.match(/^(-?\d*\.?\d+)\s*([km])?$/);
  if (!m) return Number(t) || 0;
  let n = parseFloat(m[1]);
  if (m[2] === "k") n *= 1000;
  else if (m[2] === "m") n *= 1_000_000;
  return Math.round(n);
}

// numeric input: shows compact K/M at rest, full digits while editing; accepts k/m suffixes
function CompactNumInput({ value, onChange, className }: { value?: number; onChange: (v: number) => void; className?: string }) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState("");
  return (
    <input
      type="text"
      inputMode="decimal"
      value={focused ? draft : compact(value)}
      onFocus={() => { setDraft(String(value ?? 0)); setFocused(true); }}
      onChange={(e) => { setDraft(e.target.value); onChange(parseCompact(e.target.value)); }}
      onBlur={() => setFocused(false)}
      title={String(value ?? 0)}
      className={cn("h-8 rounded-md border border-input bg-white px-1.5 text-right text-xs", className)}
    />
  );
}

function NumCell({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  return <CompactNumInput value={value} onChange={onChange} className="w-20" />;
}

function PNum({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  return <CompactNumInput value={value} onChange={onChange} className="w-16" />;
}
