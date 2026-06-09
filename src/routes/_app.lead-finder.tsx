import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Alert } from "@/components/ui/alert";
import { listScreens, createLead } from "@/lib/api/crm.functions";
import { findLeads, leadAsset } from "@/lib/api/ai.functions";
import { MultiSelect, SingleSelect } from "@/components/crm/form-kit";
import { CLIENT_TYPES, AGENCY_TYPES, INDUSTRY_OPTIONS_V2 } from "@/lib/crm-options";
import {
  Sparkles, Globe, MapPin, Building2, Plus, Flame, TrendingUp,
  Target, Wallet, Trophy, Monitor, FileText, Mail, Phone, RotateCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/lead-finder")({
  head: () => ({ meta: [{ title: "AI Lead Finder — Tathep CRM" }] }),
  loader: async () => ({ screens: await listScreens() }),
  component: LeadFinderPage,
});

const INDUSTRIES = [...INDUSTRY_OPTIONS_V2];
const SIZES = ["SME", "Mid-Market", "Enterprise", "Public Company"];
const CLIENT_TYPE_OPTS = CLIENT_TYPES.map((c) => c.value);
const MARKETING = ["Running Facebook Ads", "Running Google Ads", "Active on TikTok", "Active on Instagram", "Multiple Branches", "Verified Business"];
const SOURCES = ["Google Maps", "Google Places", "Facebook", "Instagram", "LinkedIn", "Company Website", "News Articles", "Press Releases", "SEC Filings"];

const intentColor = (v: string) => v === "Very High" ? "bg-rose-50 text-rose-700 ring-rose-200" : v === "High" ? "bg-orange-50 text-orange-700 ring-orange-200" : v === "Medium" ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-slate-100 text-slate-600 ring-slate-200";
const growthColor = (v: string) => v === "Growing Fast" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : v === "Growing" ? "bg-teal-50 text-teal-700 ring-teal-200" : v === "Stable" ? "bg-slate-100 text-slate-600 ring-slate-200" : "bg-rose-50 text-rose-700 ring-rose-200";
const scoreColor = (n: number) => n >= 80 ? "text-emerald-600" : n >= 60 ? "text-fresco" : n >= 40 ? "text-amber-600" : "text-slate-500";

function LeadFinderPage() {
  const { screens } = Route.useLoaderData();
  const navigate = useNavigate();

  const [industries, setIndustries] = useState<string[]>([]);
  const [billboards, setBillboards] = useState<string[]>([]);
  const [radiusKm, setRadiusKm] = useState(8);
  const [companySizes, setCompanySizes] = useState<string[]>([]);
  const [clientType, setClientType] = useState("");
  const [agencyType, setAgencyType] = useState("");
  const [marketing, setMarketing] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>(["Google Maps", "Facebook", "Company Website"]);

  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [placesOn, setPlacesOn] = useState(true);
  const [assets, setAssets] = useState<Record<number, { kind: string; text: string; loading: boolean }>>({});
  const [adding, setAdding] = useState<string | null>(null);

  const find = async () => {
    setSearching(true);
    setResults([]);
    setAssets({});
    try {
      const { leads, placesEnabled } = await findLeads({
        data: { industries, billboards, radiusKm, companySizes, clientType: clientType || undefined, agencyType: clientType === "Agency" ? (agencyType || undefined) : undefined, marketingActivity: marketing, leadSources: sources },
      });
      setResults(leads);
      setPlacesOn(placesEnabled !== false);
      if (!leads.length) toast("ไม่พบ lead ที่ตรงเกณฑ์ — ลองผ่อนตัวกรองลง");
      else toast.success(`น้องตาเทพเจอ ${leads.length} leads (จัดอันดับให้แล้ว)`);
    } catch (e: any) {
      toast.error(`ค้นหาไม่สำเร็จ: ${e?.message ?? "error"}`);
    } finally {
      setSearching(false);
    }
  };

  const genAsset = async (i: number, kind: "brief" | "email" | "callscript") => {
    setAssets((a) => ({ ...a, [i]: { kind, text: "", loading: true } }));
    try {
      const { text } = await leadAsset({ data: { kind, lead: results[i] } });
      setAssets((a) => ({ ...a, [i]: { kind, text, loading: false } }));
    } catch (e: any) {
      toast.error(`น้องตาเทพคิดไม่ออก: ${e?.message ?? "error"}`);
      setAssets((a) => { const n = { ...a }; delete n[i]; return n; });
    }
  };

  const addToCrm = async (l: any) => {
    setAdding(l.name);
    try {
      const isAgency = l.clientType === "Agency";
      const aiClass = ["Agency", "Reseller", "Partner"].includes(l.clientType)
        ? "Agency Upsell"
        : (l.advertisingIntent === "Very High" || l.advertisingIntent === "High" ? "Hot" : "Warm");
      await createLead({
        data: {
          lead: {
            companyName: l.name,
            province: l.province,
            industry: l.industry,
            website: l.website,
            phone: l.mainPhone,
            clientType: l.clientType ?? "Direct Client",
            agencyType: isAgency ? l.agencyType : undefined,
            estimatedBudget: l.estMarketingBudget,
            leadScore: l.leadQualityScore ?? 0,
            aiClass,
            source: "Lead Finder",
            status: "New",
            notes: `${l.mapsAddress ? `${l.mapsAddress}\n` : ""}${(l.insights ?? []).join(" · ")}${l.suggestedPitch ? ` | AI Pitch: ${l.suggestedPitch}` : ""}`,
          },
        },
      });
      toast.success(`เพิ่ม ${l.name} ลง Leads แล้ว`);
      navigate({ to: "/leads" });
    } catch (e: any) {
      toast.error(`เพิ่มไม่สำเร็จ: ${e?.message ?? "error"}`);
    } finally {
      setAdding(null);
    }
  };

  return (
    <div>
      <PageHeader title="AI Lead Finder" />

      <div className="space-y-4 p-6">
        {/* ===== Filter panel (full-width, multi-column) ===== */}
        <Card className="p-5 shadow-soft">
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Industry</p>
              <MultiSelect label="เลือกอุตสาหกรรม" options={INDUSTRIES} selected={industries} onChange={setIndustries} />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Billboard Location</p>
              <MultiSelect label="เลือกป้าย" options={screens.map((s) => s.name)} selected={billboards} onChange={setBillboards} />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Company Size</p>
              <MultiSelect label="เลือกขนาดบริษัท" options={SIZES} selected={companySizes} onChange={setCompanySizes} />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Client Type</p>
              <SingleSelect label="ทั้งหมด" options={CLIENT_TYPE_OPTS} value={clientType} onChange={(v) => { setClientType(v); if (v !== "Agency") setAgencyType(""); }} />
            </div>

            {clientType === "Agency" && (
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Agency Type</p>
                <SingleSelect label="ทุกประเภท Agency" options={AGENCY_TYPES} value={agencyType} onChange={setAgencyType} />
              </div>
            )}

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Marketing Activity</p>
              <MultiSelect label="เลือกกิจกรรมการตลาด" options={MARKETING} selected={marketing} onChange={setMarketing} />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lead Sources</p>
              <MultiSelect label="เลือกแหล่งข้อมูล" options={SOURCES} selected={sources} onChange={setSources} />
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Radius From Billboard</p>
                <span className="text-xs font-medium text-fresco">{radiusKm} km</span>
              </div>
              <Slider min={1} max={50} step={1} value={[radiusKm]} onValueChange={([v]) => setRadiusKm(v)} />
              <p className="mt-1 text-[10px] text-muted-foreground">ภายใน {radiusKm} กม. จากป้ายที่เลือก</p>
            </div>
          </div>

          <div className="mt-5 flex justify-end border-t border-border/60 pt-4">
            <Button onClick={find} disabled={searching} className="h-11 w-full bg-gradient-brand px-10 text-white hover:opacity-90 sm:w-auto">
              <Sparkles className="h-4 w-4" /> {searching ? "น้องตาเทพกำลังค้นหา…" : "Find Leads"}
            </Button>
          </div>
        </Card>

        {/* ===== Results ===== */}
        <main className="space-y-4">
          {searching && (
            <div className="space-y-1.5 rounded-lg border border-fresco/20 bg-gradient-ai p-3 text-xs text-fresco">
              <p className="animate-pulse">⌕ ค้นหาบริษัทที่เข้าเกณฑ์…</p>
              <p className="animate-pulse">วิเคราะห์ Advertising Intent + Growth Signals…</p>
              <p className="animate-pulse">คำนวณ DOOH Fit + จับคู่ป้าย…</p>
              <p className="animate-pulse">จัดอันดับโอกาส (AI Opportunity Ranking)…</p>
            </div>
          )}

          {!placesOn && results.length > 0 && (
            <Alert status="warning">
              ยังไม่ได้ตั้งค่า <b>APIFY_API_TOKEN</b> ใน .env — เบอร์กลางเลยยังไม่ถูกดึงจาก Google Maps (โชว์ลิงก์ให้กดเช็กเองแทน) เพิ่ม token แล้ว Apify จะ scrape เบอร์จริงจาก Google Maps ให้อัตโนมัติ
            </Alert>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">พบ {results.length} leads</p>
              <span className="text-xs text-muted-foreground">· จัดอันดับโดย AI Opportunity Ranking</span>
            </div>
          )}
          <div className="space-y-4">
            {results.map((l, i) => (
              <Card key={i} className="overflow-hidden shadow-soft transition hover:shadow-card">
                <div className="p-5">
                  {/* Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-brand text-white"><Building2 className="h-5 w-5" /></div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{l.name}</p>
                          {l.nameVerified && <span className="rounded bg-emerald-50 px-1 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200" title="ชื่อจริงจาก Google Maps">✓ Maps</span>}
                          <span className="rounded-full bg-fresco/10 px-2 py-0.5 text-xs font-bold text-fresco">#{i + 1} · {l.opportunityScore}</span>
                          {["Agency", "Reseller", "Partner"].includes(l.clientType) && (
                            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 ring-1 ring-inset ring-violet-200">Partner {l.partnerPotentialScore}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{l.industry} · {l.companySize} · {l.clientType}{l.agencyType ? ` · ${l.agencyType}` : ""}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{l.province}</span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {l.mainPhone ? (
                              <>
                                <a href={`tel:${l.mainPhone.replace(/[^0-9+]/g, "")}`} className="font-medium text-fresco hover:underline">{l.mainPhone}</a>
                                <a href={l.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${l.name} ${l.province}`)}`} target="_blank" rel="noreferrer" className="rounded bg-emerald-50 px-1 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100" title="ยืนยันจาก Google Maps">✓ Google Maps</a>
                              </>
                            ) : (
                              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${l.name} ${l.province}`)}`} target="_blank" rel="noreferrer" className="italic text-slate-400 hover:text-fresco hover:underline">
                                {placesOn ? "ไม่พบเบอร์ใน Google Maps — เปิดเช็ก" : "ตั้งค่า APIFY_API_TOKEN เพื่อดึงเบอร์"}
                              </a>
                            )}
                          </span>
                          {l.website && <a href={l.website.startsWith("http") ? l.website : `https://${l.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-fresco hover:underline"><Globe className="h-3 w-3" />{l.website.replace(/^https?:\/\//, "")}</a>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI scores */}
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                      <Flame className="mx-auto h-4 w-4 text-rose-500" />
                      <p className="mt-1 text-[10px] text-muted-foreground">Ad Intent</p>
                      <span className={cn("mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset", intentColor(l.advertisingIntent))}>{l.advertisingIntent}</span>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                      <TrendingUp className="mx-auto h-4 w-4 text-emerald-500" />
                      <p className="mt-1 text-[10px] text-muted-foreground">Growth</p>
                      <span className={cn("mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset", growthColor(l.growthSignal))}>{l.growthSignal}</span>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                      <Target className="mx-auto h-4 w-4 text-fresco" />
                      <p className="mt-1 text-[10px] text-muted-foreground">DOOH Fit</p>
                      <p className={cn("text-sm font-bold", scoreColor(l.doohFitScore))}>{l.doohFitScore}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                      <Wallet className="mx-auto h-4 w-4 text-amber-500" />
                      <p className="mt-1 text-[10px] text-muted-foreground">Est. Budget</p>
                      <p className="text-xs font-semibold">{l.estMarketingBudget}</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2.5 text-center">
                      <Trophy className="mx-auto h-4 w-4 text-fresco" />
                      <p className="mt-1 text-[10px] text-muted-foreground">Lead Quality</p>
                      <p className={cn("text-sm font-bold", scoreColor(l.leadQualityScore))}>{l.leadQualityScore}</p>
                    </div>
                  </div>

                  {/* Location intelligence + insights */}
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-border/60 p-3">
                      <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-foreground"><MapPin className="h-3.5 w-3.5 text-fresco" /> Location Intelligence</p>
                      <ul className="space-y-0.5 text-xs text-muted-foreground">
                        {l.mapsAddress && <li>ที่อยู่ (Google Maps): <span className="text-foreground">{l.mapsAddress}</span></li>}
                        <li>ป้ายใกล้สุด: <b className="text-foreground">{l.nearestBillboard}</b> (~{l.distanceKm} กม.)</li>
                        <li>Traffic ประเมิน: {l.estTrafficVolume}</li>
                      </ul>
                    </div>
                    <div className="rounded-lg border border-border/60 p-3">
                      <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-foreground"><Sparkles className="h-3.5 w-3.5 text-fresco" /> AI Insights</p>
                      <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                        {(l.insights ?? []).slice(0, 4).map((t: string, k: number) => <li key={k}>{t}</li>)}
                      </ul>
                    </div>
                  </div>

                  {/* Suggested pitch */}
                  <div className="mt-3 rounded-lg bg-fresco/5 p-3">
                    <p className="text-xs font-semibold text-fresco">AI Suggested Pitch</p>
                    <p className="mt-0.5 text-sm text-slate-700">{l.suggestedPitch}</p>
                  </div>

                  {/* Recommended screens */}
                  {(l.recommendedScreens ?? []).length > 0 && (
                    <div className="mt-3">
                      <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-foreground"><Monitor className="h-3.5 w-3.5 text-fresco" /> Recommended Screens</p>
                      <div className="flex flex-wrap gap-2">
                        {l.recommendedScreens.map((s: any, k: number) => (
                          <div key={k} className="rounded-md border border-border bg-white px-2.5 py-1.5 text-xs">
                            <span className="font-medium">{s.name}</span> · {s.distance} · {s.estReach}
                            <span className="ml-1 rounded bg-fresco/10 px-1 text-fresco">match {s.matchScore}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => genAsset(i, "brief")}><FileText className="h-3.5 w-3.5" /> AI Brief</Button>
                    <Button size="sm" variant="outline" onClick={() => genAsset(i, "email")}><Mail className="h-3.5 w-3.5" /> Outreach Email</Button>
                    <Button size="sm" variant="outline" onClick={() => genAsset(i, "callscript")}><Phone className="h-3.5 w-3.5" /> Call Script</Button>
                    <Button size="sm" className="bg-fresco text-white hover:bg-fresco/90" disabled={adding === l.name} onClick={() => addToCrm(l)}><Plus className="h-3.5 w-3.5" /> {adding === l.name ? "กำลังเพิ่ม…" : "Add to CRM"}</Button>
                  </div>

                  {/* AI asset output */}
                  {assets[i] && (
                    <div className="mt-3 rounded-lg border border-fresco/20 bg-gradient-ai p-4">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-fresco">
                        <Sparkles className="h-3.5 w-3.5" />
                        {assets[i].kind === "brief" ? "AI Brief" : assets[i].kind === "email" ? "Outreach Email" : "Call Script"} · น้องตาเทพ
                        <button className="ml-auto" onClick={() => genAsset(i, assets[i].kind as any)} title="Regenerate"><RotateCw className={cn("h-3.5 w-3.5", assets[i].loading && "animate-spin")} /></button>
                      </p>
                      {assets[i].loading
                        ? <div className="space-y-2"><div className="h-3 w-3/4 animate-pulse rounded bg-fresco/15" /><div className="h-3 w-full animate-pulse rounded bg-fresco/15" /><div className="h-3 w-5/6 animate-pulse rounded bg-fresco/15" /></div>
                        : <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{assets[i].text}</div>}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
