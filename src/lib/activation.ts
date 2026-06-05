// Brand Activation execution logic — pure, framework-agnostic service.
// Keep all activation business rules here, not in components.
import type { Campaign, CampaignTask, Deliverable, ScreenPlan, InfluencerPlan, InfluencerPerf, AdsRow, PerformanceSummary } from "./mock-data";

/* ---------- option enums ---------- */
export const CAMPAIGN_TYPES = [
  { value: "CLIENT_ACTIVATION", label: "Client Activation" },
  { value: "INTERNAL_MARKETING", label: "Internal Marketing" },
] as const;
export const typeLabel = (t?: string) => CAMPAIGN_TYPES.find((x) => x.value === t)?.label ?? "Client Activation";

export const ACTIVATION_STATUS = ["Planning", "In Progress", "Waiting Approval", "Live", "Completed", "Paused", "Cancelled"] as const;
export const ACTIVATION_OBJECTIVES = ["Drive Store Visits", "Brand Awareness", "Product Launch", "Grand Opening", "Event Promotion", "Sales Promotion", "Lead Generation", "App Registration", "Coupon Usage", "Platform Awareness"] as const;
export const ADS_CHANNELS = ["Meta Ads", "TikTok Ads", "Google Ads", "Boosted Post", "Other"] as const;
export const CONTENT_STATUS = ["Drafting", "Waiting Approval", "Scheduled", "Published", "Completed", "Cancelled"] as const;
export const SCREEN_BOOKING_STATUS = ["Planned", "Booked", "Live", "Completed", "Cancelled"] as const;
export const INF_WORKFLOW_STATUS = ["To Contact", "Contacted", "Negotiating", "Confirmed", "Brief Sent", "Shooting", "Draft Submitted", "Client Review", "Revision", "Scheduled", "Published", "Completed", "Cancelled"] as const;
export const DELIVERABLE_TYPES = ["TikTok Video", "Instagram Reel", "Instagram Story", "Facebook Post", "YouTube Short", "Photo Set", "Live Stream"] as const;
export const DELIVERABLE_STATUS = ["Planned", "Brief Sent", "In Production", "Draft Submitted", "Client Review", "Revision", "Approved", "Scheduled", "Published", "Completed"] as const;
export const TASK_STATUS = ["Todo", "In Progress", "Waiting", "Done", "Blocked"] as const;
export const TASK_PRIORITY = ["Low", "Medium", "High", "Urgent"] as const;
export const RELATED_TYPES = ["Activation", "Screen", "Influencer", "Deliverable", "Client Approval"] as const;

export type Health = "Healthy" | "At Risk" | "Critical";

/* ---------- ids (no Math.random in some runtimes; use counter + time-ish via arg) ---------- */
let _seq = 0;
export const uid = (prefix = "id") => `${prefix}_${Date.now().toString(36)}${(_seq++).toString(36)}`;

/* ---------- default task planner ---------- */
// Offsets are days relative to campaign start (negative = before start).
const DEFAULT_TASKS: { title: string; offset: number; related: string; priority: string }[] = [
  { title: "Prepare Proposal", offset: -14, related: "Activation", priority: "High" },
  { title: "Confirm Screens", offset: -10, related: "Screen", priority: "High" },
  { title: "Contact Influencers", offset: -10, related: "Influencer", priority: "High" },
  { title: "Confirm Influencers", offset: -7, related: "Influencer", priority: "High" },
  { title: "Send Creative Brief", offset: -6, related: "Deliverable", priority: "Medium" },
  { title: "Content Shooting", offset: -4, related: "Deliverable", priority: "Medium" },
  { title: "Draft Submission", offset: -3, related: "Deliverable", priority: "High" },
  { title: "Client Approval", offset: -2, related: "Client Approval", priority: "Urgent" },
  { title: "Schedule Posts", offset: -1, related: "Deliverable", priority: "Medium" },
  { title: "Billboard Live", offset: 0, related: "Screen", priority: "High" },
  { title: "Content Published", offset: 1, related: "Deliverable", priority: "Medium" },
  { title: "Campaign Wrap-up", offset: 0, related: "Activation", priority: "Low" }, // offset added to end below
  { title: "Performance Report", offset: 2, related: "Activation", priority: "Low" }, // relative to end
];

function addDays(iso: string, days: number): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function generateDefaultTasks(startDate: string, endDate: string, owner = ""): CampaignTask[] {
  return DEFAULT_TASKS.map((t) => {
    const base = ["Campaign Wrap-up", "Performance Report"].includes(t.title) ? endDate || startDate : startDate;
    return {
      id: uid("task"),
      title: t.title,
      owner,
      dueDate: addDays(base, t.offset),
      status: "Todo",
      priority: t.priority,
      relatedType: t.related,
      relatedId: "",
      notes: "",
    };
  });
}

/* ---------- progress + overdue ---------- */
export const taskProgress = (tasks: CampaignTask[] = []) => ({
  done: tasks.filter((t) => t.status === "Done").length,
  total: tasks.length,
});

export const isOverdue = (t: CampaignTask, today: string) =>
  !!t.dueDate && t.dueDate < today && t.status !== "Done" && t.status !== "Blocked";

const daysBetween = (a: string, b: string) => {
  if (!a || !b) return Infinity;
  return Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000);
};

/* ---------- campaign health ---------- */
export function computeHealth(c: Campaign, today: string): Health {
  const tasks = c.tasks ?? [];
  const screens = c.screensPlan ?? [];
  const infs = c.influencersPlan ?? [];
  const startsInDays = c.start ? daysBetween(today, c.start) : Infinity;
  const screensConfirmed = screens.length > 0 && screens.every((s) => ["Booked", "Live", "Completed"].includes(s.status));
  const infsConfirmed = infs.length === 0 || infs.every((i) => !["To Contact", "Contacted", "Negotiating"].includes(i.status));
  const approvalPending = tasks.some((t) => t.relatedType === "Client Approval" && t.status !== "Done");
  const overdueUrgent = tasks.some((t) => isOverdue(t, today) && (t.priority === "Urgent" || t.priority === "High"));
  const anyOverdue = tasks.some((t) => isOverdue(t, today));

  // Critical
  if (startsInDays >= 0 && startsInDays <= 2 && (!screensConfirmed || !infsConfirmed || approvalPending)) return "Critical";
  if (overdueUrgent) return "Critical";
  // At Risk
  if (anyOverdue || !infsConfirmed || (screens.length > 0 && !screensConfirmed) || approvalPending) return "At Risk";
  return "Healthy";
}

export const HEALTH_META: Record<Health, { dot: string; label: string; cls: string }> = {
  Healthy: { dot: "🟢", label: "Healthy", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  "At Risk": { dot: "🟡", label: "At Risk", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  Critical: { dot: "🔴", label: "Critical", cls: "bg-rose-50 text-rose-700 ring-rose-200" },
};

/* ---------- AI Campaign Coordinator (heuristic, instant, ≤120 words) ---------- */
export function coordinatorSummary(c: Campaign, today: string): { health: Health; lines: string[]; actions: string[] } {
  const health = computeHealth(c, today);
  const tasks = c.tasks ?? [];
  const infs = c.influencersPlan ?? [];
  const screens = c.screensPlan ?? [];
  const startsInDays = c.start ? daysBetween(today, c.start) : Infinity;
  const overdue = tasks.filter((t) => isOverdue(t, today));
  const dueToday = tasks.filter((t) => t.dueDate === today && t.status !== "Done");
  const unconfirmedInf = infs.filter((i) => ["To Contact", "Contacted", "Negotiating"].includes(i.status));
  const noDraft = infs.filter((i) => ["Brief Sent", "Shooting"].includes(i.status));
  const unbookedScreens = screens.filter((s) => s.status === "Planned");
  const approvalPending = tasks.some((t) => t.relatedType === "Client Approval" && t.status !== "Done");

  const lines: string[] = [];
  if (startsInDays >= 0 && startsInDays <= 5) lines.push(`แคมเปญเริ่มใน ${startsInDays} วัน`);
  if (overdue.length) lines.push(`มีงานเลยกำหนด ${overdue.length} งาน`);
  if (unconfirmedInf.length) lines.push(`influencer ${unconfirmedInf.length} คนยังไม่ยืนยัน`);
  if (noDraft.length) lines.push(`${noDraft.length} คนยังไม่ส่ง draft`);
  if (unbookedScreens.length) lines.push(`ป้าย ${unbookedScreens.length} จอยังไม่ booking`);
  if (approvalPending) lines.push("client approval ยังค้างอยู่");
  if (!lines.length) lines.push("ทุกอย่างเป็นไปตามแผน ไม่มีงานค้างเร่งด่วน");

  const actions: string[] = [];
  unconfirmedInf.slice(0, 2).forEach((i) => actions.push(`ติดตาม ${i.name} ให้ยืนยันงาน`));
  if (approvalPending) actions.push("ขอ client approval ให้เสร็จวันนี้");
  unbookedScreens.slice(0, 1).forEach((s) => actions.push(`ยืนยัน booking จอ ${s.screenName}`));
  dueToday.slice(0, 2).forEach((t) => actions.push(`ทำให้เสร็จวันนี้: ${t.title}`));
  overdue.slice(0, 2).forEach((t) => actions.push(`เคลียร์งานเลยกำหนด: ${t.title}`));
  if (!actions.length) actions.push("เดินหน้าตามแผน — ตรวจ draft และคิวโพสต์ให้พร้อมก่อน live");

  return { health, lines, actions: actions.slice(0, 4) };
}

/* ---------- build plans from selected ids (used on create/edit) ---------- */
export function buildScreensPlan(screenIds: string[], screens: { id: string; name: string; province: string }[], start: string, end: string, existing: ScreenPlan[] = []): ScreenPlan[] {
  return screenIds.map((id) => {
    const prev = existing.find((p) => p.screenId === id);
    if (prev) return prev;
    const s = screens.find((x) => x.id === id);
    return { id: uid("scr"), screenId: id, screenName: s?.name ?? "—", province: s?.province ?? "", bookingStartDate: start, bookingEndDate: end, status: "Planned" };
  });
}

export function buildInfluencersPlan(influencerIds: string[], influencers: any[], existing: InfluencerPlan[] = []): InfluencerPlan[] {
  return influencerIds.map((id) => {
    const prev = existing.find((p) => p.influencerId === id);
    if (prev) return prev;
    const i = influencers.find((x) => x.id === id);
    return { id: uid("inf"), influencerId: id, name: i?.name ?? "—", platform: i?.platform ?? "", category: i?.category ?? "", province: i?.province ?? "", followerCount: i?.followers ?? 0, rate: i?.rateCard ?? "", status: "To Contact" };
  });
}

export const newDeliverable = (influencerId: string, influencerName: string): Deliverable => ({
  id: uid("del"), influencerId, influencerName, type: "TikTok Video", platform: "TikTok", quantity: 1, dueDate: "", publishDate: "", status: "Planned", contentUrl: "", notes: "",
});

export const newTask = (owner = ""): CampaignTask => ({
  id: uid("task"), title: "", owner, dueDate: "", status: "Todo", priority: "Medium", relatedType: "Activation", relatedId: "", notes: "",
});

/* ============================ PERFORMANCE + SCORING ============================ */
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const num = (n?: number) => (typeof n === "number" && !isNaN(n) ? n : 0);

export const engagementOf = (p: InfluencerPerf) => num(p.likes) + num(p.comments) + num(p.shares) + num(p.saves);
export const conversionsOf = (p: InfluencerPerf) => num(p.leads) + num(p.registrations) + num(p.couponUsage) + num(p.qrScans);
export const engagementRate = (p: InfluencerPerf) => (num(p.views) > 0 ? (engagementOf(p) / num(p.views)) * 100 : 0);

// Influencer Performance Score: 40% engagement + 25% cost efficiency + 20% conversion + 15% audience fit
export function influencerScore(p: InfluencerPerf): number {
  const eng = clamp(engagementRate(p) * 10); // 10% ER -> 100
  const engagement = engagementOf(p);
  const costEff = num(p.cost) > 0 ? clamp((engagement / num(p.cost)) * 40) : 50;
  const convRate = num(p.views) > 0 ? (conversionsOf(p) / num(p.views)) * 100 : 0;
  const conv = clamp(convRate * 20);
  const fit = 70; // baseline until audience-fit data is integrated
  return Math.round(0.4 * eng + 0.25 * costEff + 0.2 * conv + 0.15 * fit);
}

export const hasPerfData = (p: InfluencerPerf) => num(p.views) > 0 || engagementOf(p) > 0;

export type Recommendation = "Reuse" | "Consider" | "Avoid" | "Needs More Data";
export function recommendation(p: InfluencerPerf): Recommendation {
  if (!hasPerfData(p)) return "Needs More Data";
  const s = influencerScore(p);
  return s >= 75 ? "Reuse" : s >= 55 ? "Consider" : "Avoid";
}
export const REC_CLS: Record<Recommendation, string> = {
  Reuse: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Consider: "bg-amber-50 text-amber-700 ring-amber-200",
  Avoid: "bg-rose-50 text-rose-700 ring-rose-200",
  "Needs More Data": "bg-slate-100 text-slate-600 ring-slate-200",
};

// derived per-influencer metrics for the Attribution table
export function influencerDerived(p: InfluencerPerf) {
  const engagement = engagementOf(p);
  const er = engagementRate(p);
  const cpe = engagement > 0 && num(p.cost) > 0 ? num(p.cost) / engagement : 0;
  const conv = conversionsOf(p);
  const cpl = conv > 0 && num(p.cost) > 0 ? num(p.cost) / conv : 0;
  const score = influencerScore(p);
  return { engagement, engagementRate: er, cpe, cpl, score, recommendation: recommendation(p) };
}

// ads derived
export function adsDerived(a: AdsRow) {
  const ctr = num(a.impressions) > 0 ? (num(a.clicks) / num(a.impressions)) * 100 : 0;
  const cpc = num(a.clicks) > 0 ? num(a.spend) / num(a.clicks) : 0;
  const cpm = num(a.impressions) > 0 ? (num(a.spend) / num(a.impressions)) * 1000 : 0;
  const cpcv = num(a.conversions) > 0 ? num(a.spend) / num(a.conversions) : 0;
  return { ctr, cpc, cpm, costPerConversion: cpcv };
}

// aggregate campaign-level performance from influencer perf + ads + stored summary
export function aggregatePerformance(c: Campaign): PerformanceSummary {
  const perf = c.influencerPerf ?? [];
  const stored = c.performance ?? {};
  const influencerReach = perf.reduce((s, p) => s + num(p.views), 0);
  const socialEngagement = perf.reduce((s, p) => s + engagementOf(p), 0);
  const qrScans = perf.reduce((s, p) => s + num(p.qrScans), 0) + num((c.ads ?? []).reduce((s, a) => s, 0));
  const clicks = perf.reduce((s, p) => s + num(p.clicks), 0) + (c.ads ?? []).reduce((s, a) => s + num(a.clicks), 0);
  const leads = perf.reduce((s, p) => s + num(p.leads), 0);
  const registrations = perf.reduce((s, p) => s + num(p.registrations), 0);
  const couponUsage = perf.reduce((s, p) => s + num(p.couponUsage), 0);
  const estimatedVisits = perf.reduce((s, p) => s + num(p.estimatedVisits), 0);
  const revenue = perf.reduce((s, p) => s + num(p.revenue), 0);
  const doohReach = num(stored.doohReach);
  const totalReach = doohReach + influencerReach;
  const costPerLead = leads > 0 && num(c.budget) > 0 ? Math.round(num(c.budget) / leads) : 0;
  const costPerRegistration = registrations > 0 && num(c.budget) > 0 ? Math.round(num(c.budget) / registrations) : 0;
  return { ...stored, doohReach, influencerReach, totalReach, socialEngagement, qrScans, clicks, leads, registrations, couponUsage, estimatedVisits, revenue, costPerLead, costPerRegistration };
}

// Campaign Score: 30% reach + 25% engagement + 20% conversion + 15% budget eff + 10% timeline
export function campaignScoreOf(c: Campaign): number {
  const a = aggregatePerformance(c);
  const reach = clamp(num(a.totalReach) / 50000 * 100);
  const eng = clamp(num(a.socialEngagement) / 2000 * 100);
  const conv = clamp((num(a.leads) + num(a.registrations)) / 50 * 100);
  const revenue = num(a.revenue);
  const budgetEff = num(c.budget) > 0 ? clamp((revenue / num(c.budget)) * 50) : 40;
  const tp = taskProgress(c.tasks);
  const timeline = tp.total ? (tp.done / tp.total) * 100 : 0;
  return Math.round(0.3 * reach + 0.25 * eng + 0.2 * conv + 0.15 * budgetEff + 0.1 * timeline);
}

/* ---------- mock data generators (until real tracking is integrated) ---------- */
const rnd = (min: number, max: number) => Math.round(min + Math.random() * (max - min));
export function mockInfluencerPerf(c: Campaign): InfluencerPerf[] {
  return (c.influencersPlan ?? []).map((i) => {
    const views = rnd(Math.max(5000, i.followerCount * 0.4), i.followerCount * 1.2);
    const er = 3 + Math.random() * 7; // 3-10%
    const engTotal = Math.round((views * er) / 100);
    const likes = Math.round(engTotal * 0.7), comments = Math.round(engTotal * 0.12), shares = Math.round(engTotal * 0.1), saves = engTotal - likes - comments - shares;
    const clicks = rnd(Math.round(views * 0.01), Math.round(views * 0.05));
    const isInternal = c.campaignType === "INTERNAL_MARKETING";
    return {
      id: uid("perf"), influencerId: i.influencerId, influencerName: i.name, platform: i.platform,
      contentStatus: "Published", publishDate: c.start ?? "",
      views, likes, comments, shares, saves, clicks,
      qrScans: rnd(20, 400),
      leads: isInternal ? 0 : rnd(5, 120),
      registrations: isInternal ? rnd(10, 300) : 0,
      couponUsage: isInternal ? rnd(5, 150) : 0,
      estimatedVisits: rnd(50, 800),
      revenue: isInternal ? 0 : rnd(0, 200000),
      cost: rnd(8000, 60000),
      notes: "",
    };
  });
}
export function mockAds(c: Campaign): AdsRow[] {
  const channels = c.campaignType === "INTERNAL_MARKETING" ? ["TikTok Ads", "Meta Ads", "Boosted Post"] : ["Meta Ads", "Google Ads"];
  return channels.map((ch) => {
    const impressions = rnd(80000, 600000);
    return { id: uid("ads"), channel: ch, campaignName: `${c.name} — ${ch}`, spend: rnd(5000, 50000), impressions, reach: Math.round(impressions * 0.7), clicks: rnd(800, 12000), conversions: rnd(20, 600), notes: "" };
  });
}

// one-shot generator for the Results/Attribution/Ads tabs — keeps mock logic out of components
export function generateMockResults(c: Campaign): { influencerPerf: InfluencerPerf[]; ads: AdsRow[]; performance: PerformanceSummary } {
  const influencerPerf = mockInfluencerPerf(c);
  const ads = mockAds(c);
  const screenCount = (c.screensPlan ?? []).length || 1;
  const doohReach = screenCount * rnd(60000, 180000);
  return { influencerPerf, ads, performance: { ...(c.performance ?? {}), doohReach } };
}

// best-performing creator (by performance score) — shared by list card + detail
export function bestPerformer(c: Campaign): { p: InfluencerPerf; d: ReturnType<typeof influencerDerived> } | null {
  const scored = (c.influencerPerf ?? []).filter(hasPerfData).map((p) => ({ p, d: influencerDerived(p) }));
  if (!scored.length) return null;
  return scored.sort((a, b) => b.d.score - a.d.score)[0];
}

export const newInfluencerPerf = (influencerId: string, influencerName: string, platform: string): InfluencerPerf => ({
  id: uid("perf"), influencerId, influencerName, platform, contentStatus: "Drafting", publishDate: "", views: 0, likes: 0, comments: 0, shares: 0, saves: 0, clicks: 0, qrScans: 0, leads: 0, registrations: 0, couponUsage: 0, estimatedVisits: 0, revenue: 0, cost: 0, notes: "",
});
export const newAdsRow = (): AdsRow => ({ id: uid("ads"), channel: "Meta Ads", campaignName: "", spend: 0, impressions: 0, reach: 0, clicks: 0, conversions: 0, notes: "" });

/* ---------- AI Insight cards (heuristic, ≤120 words each) ---------- */
export function aiInsightCards(c: Campaign): { title: string; body: string }[] {
  const perf = (c.influencerPerf ?? []).map((p) => ({ p, d: influencerDerived(p) })).filter((x) => hasPerfData(x.p));
  if (!perf.length) {
    return [{ title: "Campaign Summary", body: "ยังไม่มีข้อมูลผลลัพธ์ — กด \"Generate mock results\" ในแท็บ Results/Attribution เพื่อจำลองข้อมูล แล้ว AI จะสรุปให้" }];
  }
  const byScore = [...perf].sort((a, b) => b.d.score - a.d.score);
  const best = byScore[0], worst = byScore[byScore.length - 1];
  const agg = aggregatePerformance(c);
  const ads = (c.ads ?? []);
  const adsSpend = ads.reduce((s, a) => s + num(a.spend), 0);
  const infSpend = (c.influencerPerf ?? []).reduce((s, p) => s + num(p.cost), 0);
  const reuse = byScore.filter((x) => x.d.recommendation === "Reuse").map((x) => x.p.influencerName);

  return [
    { title: "Campaign Summary", body: `แคมเปญทำ total reach ${Math.round((agg.totalReach ?? 0) / 1000)}K, engagement ${Math.round((agg.socialEngagement ?? 0) / 1000)}K${c.campaignType === "INTERNAL_MARKETING" ? `, ลงทะเบียน ${agg.registrations}` : `, leads ${agg.leads}`}. Campaign Score ${campaignScoreOf(c)}/100. ครีเอเตอร์ท้องถิ่นสร้าง engagement ได้ดีจากกลุ่มใกล้พื้นที่` },
    { title: "Best Performing Creator", body: `${best.p.influencerName} (${best.p.platform}) — ER ${best.d.engagementRate.toFixed(1)}%, score ${best.d.score}/100${best.d.cpe ? `, cost/engagement ฿${best.d.cpe.toFixed(1)} ต่ำสุด` : ""}. ควร reuse` },
    { title: "Worst Performing Creator", body: worst.p.influencerName === best.p.influencerName ? "ยังมีครีเอเตอร์เดียวที่มีข้อมูล — เพิ่มอีกเพื่อเปรียบเทียบ" : `${worst.p.influencerName} — score ${worst.d.score}/100, ${worst.d.recommendation === "Avoid" ? "engagement/conversion อ่อน ควรเลี่ยงรอบหน้า" : "ผลกลางๆ ควรดูข้อมูลเพิ่ม"}` },
    { title: "Budget Efficiency", body: adsSpend && infSpend ? `Influencer spend ฿${Math.round(infSpend / 1000)}K vs Ads ฿${Math.round(adsSpend / 1000)}K — ${infSpend && agg.socialEngagement ? `influencer สร้าง engagement ต่อบาทได้ดีกว่า boosted post` : "เทียบ engagement ต่อบาทเพื่อจัดสรรงบรอบหน้า"}` : "เพิ่มข้อมูล ads + cost ของครีเอเตอร์เพื่อเทียบความคุ้มค่า" },
    { title: "Renewal Recommendation", body: reuse.length ? `Reuse: ${reuse.slice(0, 3).join(", ")} สำหรับแคมเปญถัดไปในพื้นที่เดียวกัน` : "ยังไม่มีครีเอเตอร์ที่เข้าเกณฑ์ reuse — ทดสอบกลุ่มใหม่" },
    { title: "Next Campaign Recommendation", body: `เพิ่ม micro-influencer สาย ${best.p.platform} ในพื้นที่เป้าหมายเพื่อดัน conversion + จับคู่กับป้าย DOOH ใกล้ทำเลลูกค้า` },
  ];
}
