import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AIPanel } from "@/components/crm/ai-panel";
import { TierBadge, AIClassBadge } from "@/components/crm/badges";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { formatTHB, type Company } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import type { AccountAIInsight, AccountMetrics, AccountRisk } from "../types/account";
import { RISK_TONE } from "../constants/accountOptions";

function Chips({ label, items }: { label: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-2">
      <p className="text-[11px] font-medium text-fresco">{label}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
        {items.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    </div>
  );
}

export function AccountAIInsightTabs({
  company,
  metrics,
  risks,
  insight,
  loading,
  onGenerate,
  classifying,
  onClassify,
  value,
  onValueChange,
}: {
  company: Company;
  metrics: AccountMetrics;
  risks: AccountRisk[];
  insight: AccountAIInsight | null;
  loading: boolean;
  onGenerate: () => void;
  classifying: boolean;
  onClassify: () => void;
  value: string;
  onValueChange: (v: string) => void;
}) {
  const genLabel = insight ? "Regenerate" : "Generate";
  const placeholder = (
    <p className="text-slate-600">กด "{genLabel}" ให้น้องตาเทพวิเคราะห์บัญชีนี้จากข้อมูลจริง (บริษัท · ผู้ติดต่อ · ดีล · จอที่ว่าง)</p>
  );

  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList className="grid w-full grid-cols-5 bg-slate-100">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="research">AI Research</TabsTrigger>
        <TabsTrigger value="strategy">Sales Strategy</TabsTrigger>
        <TabsTrigger value="talking">Talking Points</TabsTrigger>
        <TabsTrigger value="risks">
          Risks{risks.length > 0 && <span className="ml-1 rounded-full bg-tt-danger-100 px-1.5 text-[10px] font-semibold text-tt-danger-700">{risks.length}</span>}
        </TabsTrigger>
      </TabsList>

      {/* Overview */}
      <TabsContent value="overview" className="mt-4">
        <AIPanel
          subtitle="Account Overview"
          actionLabel={classifying ? "กำลังจัดระดับ…" : "จัดระดับด้วย AI"}
          loading={classifying}
          onGenerate={onClassify}
        >
          <p>{company.summary || "ยังไม่มีบทสรุป — กด \"จัดระดับด้วย AI\" ให้น้องตาเทพวิเคราะห์"}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <TierBadge tier={company.tier} />
            <AIClassBadge value={company.aiClass} />
            <span className="text-xs text-slate-500">· Score {company.leadScore}/100</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <span>มูลค่าตลอดอายุ: <b className="text-fresco">{formatTHB(metrics.lifetimeRevenue)}</b></span>
            <span>ดีลเปิด: <b>{metrics.openOpportunities}</b> · ปิดได้: <b>{metrics.closedWonOpportunities}</b></span>
            <span>แคมเปญ: <b>{metrics.totalCampaigns}</b></span>
            <span>ความเสี่ยง: <b className={risks.length ? "text-tt-danger-600" : "text-tt-success-600"}>{risks.length}</b></span>
          </div>
        </AIPanel>
      </TabsContent>

      {/* AI Research */}
      <TabsContent value="research" className="mt-4">
        <AIPanel subtitle="AI Research · น้องตาเทพ" actionLabel={genLabel} loading={loading} onGenerate={onGenerate}>
          {insight ? (
            <>
              <p className="whitespace-pre-wrap">{insight.research.summary}</p>
              <p className="mt-2 text-xs text-slate-500">
                อุตสาหกรรม: {insight.research.industry} · ทำเล: {insight.research.location} · ขนาด: {insight.research.companySize}
              </p>
              <Chips label="สัญญาณการเติบโต" items={insight.research.growthSignals} />
              <Chips label="จังหวะการตลาดที่ควรยิง" items={insight.research.marketingMoments} />
            </>
          ) : placeholder}
        </AIPanel>
      </TabsContent>

      {/* Sales Strategy */}
      <TabsContent value="strategy" className="mt-4">
        <AIPanel subtitle="Sales Strategy · น้องตาเทพ" actionLabel={genLabel} loading={loading} onGenerate={onGenerate}>
          {insight ? (
            <div className="space-y-1.5 text-sm">
              <p><b className="text-fresco">แพ็กเกจที่แนะนำ:</b> {insight.strategy.recommendedPackage}</p>
              <p><b className="text-fresco">จอที่แนะนำ:</b> {insight.strategy.recommendedLocations.join(", ") || "—"}</p>
              <p><b className="text-fresco">งบที่เหมาะ:</b> {insight.strategy.suggestedBudget}</p>
              <p><b className="text-fresco">ช่วงเวลาที่ควรยิง:</b> {insight.strategy.bestTiming}</p>
              <p><b className="text-fresco">โอกาส Upsell:</b> {insight.strategy.upsell}</p>
            </div>
          ) : placeholder}
        </AIPanel>
      </TabsContent>

      {/* Talking Points */}
      <TabsContent value="talking" className="mt-4">
        <AIPanel subtitle="Talking Points · น้องตาเทพ" actionLabel={genLabel} loading={loading} onGenerate={onGenerate}>
          {insight ? (
            <ul className="list-disc space-y-1 pl-4 text-sm">
              {insight.talkingPoints.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          ) : placeholder}
        </AIPanel>
      </TabsContent>

      {/* Risks (rule-based, always available) */}
      <TabsContent value="risks" className="mt-4">
        {risks.length === 0 ? (
          <div className="flex items-center gap-2 rounded-xl border border-tt-success-200 bg-tt-success-50 p-4 text-sm text-tt-success-700">
            <ShieldCheck className="h-5 w-5" /> ไม่พบความเสี่ยงที่ต้องระวังในตอนนี้ — บัญชีสุขภาพดี
          </div>
        ) : (
          <div className="space-y-2">
            {risks.map((r) => (
              <div key={r.key} className={cn("flex items-start gap-2.5 rounded-xl border p-3", RISK_TONE[r.level])}>
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">{r.title}</p>
                  <p className="mt-0.5 text-xs opacity-90">{r.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
