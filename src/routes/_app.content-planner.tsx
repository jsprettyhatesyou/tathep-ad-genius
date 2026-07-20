import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { MultiSelect } from "@/components/crm/form-kit";
import { ContentPlanSheet } from "@/components/crm/content-plan-sheet";
import { listScreens } from "@/lib/api/crm.functions";
import {
  analyzeAreaForContent,
  generateContentPlan,
  listAreaAnalyses,
  getAreaAnalysisDetail,
} from "@/lib/api/content-planner.functions";
import type { AreaContentAnalysis, ContentPlan } from "@/lib/mock-data";
import { Sparkles, MapPin, Store, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/content-planner")({
  head: () => ({ meta: [{ title: "AI Content Recommendation — Tathep CRM" }] }),
  loader: async () => ({ screens: await listScreens() }),
  component: ContentPlannerPage,
});

const FIT_TONE: Record<"High" | "Medium" | "Low", string> = {
  High: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Medium: "bg-amber-50 text-amber-700 ring-amber-200",
  Low: "bg-slate-100 text-slate-600 ring-slate-200",
};

function FitBadge({ label, value }: { label: string; value: "High" | "Medium" | "Low" }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <span className={cn("mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset", FIT_TONE[value])}>
        {value}
      </span>
    </div>
  );
}

function ContentPlannerPage() {
  const { screens } = Route.useLoaderData();
  const navigate = useNavigate();

  const [billboardNames, setBillboardNames] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AreaContentAnalysis | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [plans, setPlans] = useState<Record<string, ContentPlan>>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activePlan, setActivePlan] = useState<ContentPlan | null>(null);
  const [history, setHistory] = useState<AreaContentAnalysis[]>([]);
  const [selectedBiz, setSelectedBiz] = useState<Record<string, number>>({});

  useEffect(() => {
    listAreaAnalyses().then(setHistory).catch(() => {});
  }, []);

  const analyze = async () => {
    const screenIds = screens.filter((s) => billboardNames.includes(s.name)).map((s) => s.id);
    if (!screenIds.length) {
      toast("เลือกป้ายก่อนอย่างน้อย 1 ป้าย");
      return;
    }
    if (screenIds.length > 5) {
      toast.error("เลือกได้สูงสุด 5 ป้ายต่อการวิเคราะห์ 1 ครั้ง (จำกัดไว้เพื่อคุมเวลา/ต้นทุนการดึงข้อมูลจาก Google Maps)");
      return;
    }
    setAnalyzing(true);
    setAnalysis(null);
    setPlans({});
    try {
      const result = await analyzeAreaForContent({ data: { screenIds } });
      setAnalysis(result);
      if (result.status === "no_businesses_found") {
        toast("ไม่พบธุรกิจใกล้เคียงในรัศมี 1 กม. — ลองเลือกป้ายอื่น");
      } else {
        toast.success(`วิเคราะห์พื้นที่เสร็จแล้ว พบ ${result.businessTypeRecommendations.length} ประเภทธุรกิจ`);
      }
      listAreaAnalyses().then(setHistory).catch(() => {});
    } catch (e: any) {
      toast.error(e?.message ?? "วิเคราะห์ไม่สำเร็จ");
    } finally {
      setAnalyzing(false);
    }
  };

  const genPlan = async (businessType: string) => {
    if (!analysis) return;
    setGenerating(businessType);
    try {
      const rec = analysis.businessTypeRecommendations.find((r) => r.businessType === businessType);
      const business = rec?.exampleBusinesses?.[selectedBiz[businessType] ?? 0];
      const { plan, company } = await generateContentPlan({ data: { analysisId: analysis.id, businessType, business } });
      setPlans((p) => ({ ...p, [businessType]: plan }));
      setActivePlan(plan);
      setSheetOpen(true);
      if (company) {
        toast.success(`สร้าง Content Plan ให้ ${company.name} แล้ว — บันทึกเป็น Account ในระบบ`, {
          action: {
            label: "ดูบัญชี",
            onClick: () => navigate({ to: "/companies", search: { companyId: company.id } }),
          },
        });
      }
    } catch (e: any) {
      toast.error(`สร้าง Content Plan ไม่สำเร็จ: ${e?.message ?? "error"}`);
    } finally {
      setGenerating(null);
    }
  };

  const openHistory = async (id: string) => {
    try {
      const { analysis: a, contentPlans } = await getAreaAnalysisDetail({ data: { id } });
      setAnalysis(a);
      setBillboardNames(a.screenNames);
      const byType: Record<string, ContentPlan> = {};
      for (const p of contentPlans) if (!byType[p.businessType]) byType[p.businessType] = p;
      setPlans(byType);
    } catch (e: any) {
      toast.error(e?.message ?? "โหลดผลวิเคราะห์ไม่สำเร็จ");
    }
  };

  return (
    <div>
      <PageHeader title="AI Content Recommendation" />

      <div className="space-y-4 p-6">
        <Card className="p-5 shadow-soft">
          <div className="max-w-sm space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">เลือก Billboard / Location</p>
            <MultiSelect label="เลือกป้าย" options={screens.map((s) => s.name)} selected={billboardNames} onChange={setBillboardNames} />
            <p className="text-[10px] text-muted-foreground">เลือกได้สูงสุด 5 ป้ายต่อการวิเคราะห์ 1 ครั้ง</p>
          </div>
          <div className="mt-5 flex justify-end border-t border-border/60 pt-4">
            <Button onClick={analyze} disabled={analyzing} className="h-11 w-full bg-gradient-brand px-10 text-white hover:opacity-90 sm:w-auto">
              <Sparkles className="h-4 w-4" /> {analyzing ? "น้องตาเทพกำลังวิเคราะห์…" : "วิเคราะห์พื้นที่"}
            </Button>
          </div>
        </Card>

        {analyzing && (
          <div className="space-y-1.5 rounded-lg border border-fresco/20 bg-gradient-ai p-3 text-xs text-fresco">
            <p className="animate-pulse">⌕ กำลังดึงข้อมูลธุรกิจจริงจาก Google Maps…</p>
            <p className="animate-pulse">วิเคราะห์ประเภทธุรกิจ + โอกาสทางการขาย…</p>
            <p className="animate-pulse">จัดลำดับความสำคัญของพื้นที่…</p>
            <p className="text-slate-500">อาจใช้เวลาถึง 60-90 วินาที</p>
          </div>
        )}

        {analysis?.status === "no_businesses_found" && (
          <Alert status="warning">ไม่พบธุรกิจใกล้เคียงในรัศมี 1 กม. รอบป้ายที่เลือก — ลองเลือกป้ายอื่นหรือดูพื้นที่ที่มีร้านค้าหนาแน่นกว่านี้</Alert>
        )}

        {analysis && analysis.areaPriority.length > 1 && (
          <Card className="p-5 shadow-soft">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <MapPin className="h-4 w-4 text-fresco" /> ควรลงพื้นที่ย่านไหนก่อน
            </p>
            <ul className="space-y-2">
              {[...analysis.areaPriority].sort((a, b) => a.priorityRank - b.priorityRank).map((a) => (
                <li key={a.screenId} className="rounded-md border border-border/60 bg-white p-3 text-sm">
                  <span className="rounded-full bg-fresco/10 px-2 py-0.5 text-xs font-bold text-fresco">#{a.priorityRank}</span>{" "}
                  <span className="font-medium">{a.screenName}</span>
                  <p className="mt-1 text-xs text-muted-foreground">{a.reasoning}</p>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {analysis && analysis.businessTypeRecommendations.length > 0 && (
          <>
            {analysis.topRecommendation && (
              <div className="rounded-lg bg-fresco/5 p-3">
                <p className="text-xs font-semibold text-fresco">แนะนำอันดับแรก: {analysis.topRecommendation}</p>
                <p className="mt-0.5 text-sm text-slate-700">{analysis.topRecommendationReasoning}</p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {analysis.businessTypeRecommendations.map((rec) => (
                <Card key={rec.businessType} className="overflow-hidden p-5 shadow-soft transition hover:shadow-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-brand text-white"><Store className="h-4 w-4" /></div>
                      <div>
                        <p className="font-semibold">{rec.businessType}</p>
                        <p className="text-xs text-muted-foreground">พบ {rec.count} ร้านใกล้เคียง</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <FitBadge label="Sales Potential" value={rec.salesPotential} />
                    <FitBadge label="Case Study Fit" value={rec.caseStudyFit} />
                    <FitBadge label="Interview Fit" value={rec.interviewFit} />
                  </div>

                  <p className="mt-3 text-sm text-slate-700">{rec.overallReasoning}</p>

                  {rec.exampleBusinesses.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {rec.exampleBusinesses.length > 1 && (
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">เลือกร้านที่จะสร้าง Content Plan / Account ให้</p>
                      )}
                      {rec.exampleBusinesses.map((b, i) => {
                        const isSelected = (selectedBiz[rec.businessType] ?? 0) === i;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setSelectedBiz((s) => ({ ...s, [rec.businessType]: i }))}
                            className={cn(
                              "flex w-full items-start gap-1.5 rounded-md border p-1.5 text-left text-xs transition",
                              isSelected ? "border-fresco bg-fresco/5" : "border-transparent hover:bg-slate-50",
                            )}
                          >
                            <span className={cn(
                              "mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border",
                              isSelected ? "border-fresco bg-fresco" : "border-slate-300",
                            )}>
                              {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                            </span>
                            <span className="text-muted-foreground">
                              <span className={cn("font-medium", isSelected ? "text-fresco" : "text-foreground")}>{b.name}</span> — {b.address}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="bg-fresco text-white hover:bg-fresco/90"
                      disabled={generating === rec.businessType}
                      onClick={() => genPlan(rec.businessType)}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {generating === rec.businessType ? "กำลังสร้าง…" : plans[rec.businessType] ? "ดูแผนที่สร้างไว้" : "สร้าง Content Plan"}
                    </Button>
                    {plans[rec.businessType] && !generating && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setActivePlan(plans[rec.businessType]); setSheetOpen(true); }}
                      >
                        เปิดแผน
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {history.length > 0 && (
          <Card className="p-5 shadow-soft">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Clock className="h-4 w-4 text-fresco" /> การวิเคราะห์ล่าสุด
            </p>
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id}>
                  <button
                    onClick={() => openHistory(h.id)}
                    className="flex w-full items-center justify-between rounded-md border border-border/60 bg-white p-3 text-left text-sm hover:border-fresco/40"
                  >
                    <span>
                      <span className="font-medium">{h.screenNames.join(", ")}</span>
                      {h.topRecommendation && <span className="text-muted-foreground"> · แนะนำ: {h.topRecommendation}</span>}
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset", h.status === "ok" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200")}>
                      {h.status === "ok" ? "สำเร็จ" : "ไม่พบธุรกิจ"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <ContentPlanSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        plan={activePlan}
        loading={false}
        onRegenerate={activePlan ? () => genPlan(activePlan.businessType) : undefined}
      />
    </div>
  );
}
