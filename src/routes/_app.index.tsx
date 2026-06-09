import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/crm/page-header";
import { AIPanel } from "@/components/crm/ai-panel";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTHB, STAGES } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { listDeals, listCompanies, listActivities } from "@/lib/api/crm.functions";
import { ArrowUpRight, ArrowDownRight, Plus, Calendar, ArrowRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "Data Analysis — Tathep CRM" }] }),
  loader: async () => {
    const [deals, companies, activities] = await Promise.all([
      listDeals(),
      listCompanies(),
      listActivities(),
    ]);
    return { deals, companies, activities };
  },
  component: Dashboard,
});

/* TapTap palette */
const TT = {
  c1: "#4887F6", // blue
  c2: "#59C3CF", // teal
  c3: "#F1CD49", // yellow
  c4: "#FE632F", // coral
  c5: "#E2635E", // red
  grid: "#EEEEEE",
  axis: "#8E8E8E",
};
const TIERS = ["Platinum", "Gold", "Silver", "Bronze"] as const;
const TIER_COLOR: Record<string, string> = { Platinum: TT.c1, Gold: TT.c3, Silver: TT.c2, Bronze: TT.c4 };

/* TapTap-style stat card: big value + delta% arrow + two compare rows */
function TTStat({
  label, value, delta, rows,
}: {
  label: string;
  value: string;
  delta: { value: string; positive: boolean };
  rows: { label: string; value: string; pct?: string }[];
}) {
  return (
    <Card className="rounded-2xl border-taptap-100 p-5 shadow-elev-1 transition hover:shadow-elev-2">
      <p className="text-sm text-taptap-muted">{label}</p>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-2xl font-bold leading-none tracking-tight text-taptap-ink">{value}</span>
        <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", delta.positive ? "text-taptap-success" : "text-taptap-danger")}>
          {delta.value}
          {delta.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        </span>
      </div>
      <div className="mt-4 space-y-1.5 border-t border-taptap-line pt-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-xs">
            <span className="text-taptap-muted">{r.label}</span>
            <span className="font-medium text-taptap-ink">
              {r.value}{r.pct && <span className="ml-1 font-normal text-taptap-muted">({r.pct})</span>}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function Dashboard() {
  const { deals: DEALS, companies: COMPANIES, activities: ACTIVITIES } = Route.useLoaderData();

  // ----- filters (apply to the analytical chart section) -----
  const [fClient, setFClient] = useState("All");
  const [fTier, setFTier] = useState("All");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");

  const fdeals = DEALS.filter((d) => {
    if (fClient !== "All" && d.clientType !== fClient) return false;
    if (fTier !== "All" && d.tier !== fTier) return false;
    if (fStart && (d.expectedClose ?? "") < fStart) return false;
    if (fEnd && (d.expectedClose ?? "") > fEnd) return false;
    return true;
  });

  // ----- top KPIs (global) -----
  const openDeals = DEALS.filter((d) => !["Won", "Lost"].includes(d.stage));
  const wonDeals = DEALS.filter((d) => d.stage === "Won");
  const lostDeals = DEALS.filter((d) => d.stage === "Lost");
  const pipelineValue = openDeals.reduce((s, d) => s + d.value, 0);
  const wonValue = wonDeals.reduce((s, d) => s + d.value, 0);
  const winRate = wonDeals.length + lostDeals.length > 0
    ? Math.round((wonDeals.length / (wonDeals.length + lostDeals.length)) * 100) : 0;
  const hotDeals = DEALS.filter((d) => d.aiClass === "Hot").length;
  const dueThisWeek = DEALS.filter((d) => d.nextFollowUp >= "2026-06-04" && d.nextFollowUp <= "2026-06-10").length;
  const avgOpen = openDeals.length ? Math.round(pipelineValue / openDeals.length) : 0;
  const avgWin = wonDeals.length ? Math.round(wonValue / wonDeals.length) : 0;
  const activeClients = COMPANIES.filter((c) => c.status === "Active" || c.status === "Recurring").length;

  // ----- stacked bar: pipeline value by stage, stacked by tier -----
  const stageList = STAGES.filter((s) => !["Lost", "On Hold"].includes(s));
  const barData = stageList.map((s) => {
    const row: any = { stage: s };
    for (const t of TIERS) {
      row[t] = fdeals.filter((d) => d.stage === s && d.tier === t).reduce((sum, d) => sum + d.value, 0);
    }
    return row;
  });

  // ----- donut: open pipeline value by tier -----
  const donut = TIERS.map((t) => ({
    name: t,
    value: fdeals.filter((d) => d.tier === t && !["Won", "Lost"].includes(d.stage)).reduce((s, d) => s + d.value, 0),
  })).filter((d) => d.value > 0);
  const donutTotal = donut.reduce((s, d) => s + d.value, 0);

  // ----- line charts (monthly forecast) -----
  const months = ["เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย."];
  const trend = months.map((m, i) => ({
    month: m,
    pipeline: [720000, 980000, 1320000, 1480000, 1750000, 2100000][i],
  }));
  const splitTrend = months.map((m, i) => ({
    month: m,
    Direct: [420, 560, 760, 820, 980, 1180][i] * 1000,
    Agency: [300, 420, 560, 660, 770, 920][i] * 1000,
  }));

  return (
    <div>
      <PageHeader
        title="Data Analysis"
        actions={
          <>
            <Button variant="outline" size="sm" className="rounded-lg border-taptap-200 text-taptap-700 hover:bg-taptap-50">Export</Button>
            <Button size="sm" className="rounded-lg bg-taptap-600 shadow-elev-1 hover:bg-taptap-700"><Plus className="h-4 w-4" /> New Deal</Button>
          </>
        }
      />

      <div className="space-y-5 p-8">
        {/* ===== Stat cards ===== */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <TTStat
            label="Total Pipeline" value={formatTHB(pipelineValue)}
            delta={{ value: "18.2%", positive: true }}
            rows={[
              { label: "Open deals", value: String(openDeals.length) },
              { label: "Avg / deal", value: formatTHB(avgOpen) },
            ]}
          />
          <TTStat
            label="Open Deals" value={String(openDeals.length)}
            delta={{ value: "3", positive: true }}
            rows={[
              { label: "Hot leads", value: String(hotDeals), pct: openDeals.length ? `${Math.round((hotDeals / openDeals.length) * 100)}%` : "0%" },
              { label: "Due this week", value: String(dueThisWeek) },
            ]}
          />
          <TTStat
            label="Won This Month" value={formatTHB(wonValue)}
            delta={{ value: "24.1%", positive: true }}
            rows={[
              { label: "Closed deals", value: String(wonDeals.length) },
              { label: "Avg / win", value: formatTHB(avgWin) },
            ]}
          />
          <TTStat
            label="Win Rate" value={`${winRate}%`}
            delta={{ value: "4pp", positive: true }}
            rows={[
              { label: "Won", value: String(wonDeals.length) },
              { label: "Lost", value: String(lostDeals.length) },
            ]}
          />
        </div>

        {/* ===== Filter bar + stacked bar chart ===== */}
        <Card className="rounded-2xl p-5 shadow-elev-1">
          <div className="flex flex-wrap items-center gap-4 border-b border-taptap-line pb-4">
            <FilterSelect label="Client Type" value={fClient} onChange={setFClient}
              options={["All", "Direct Client", "Agency"]} />
            <FilterSelect label="Tier" value={fTier} onChange={setFTier}
              options={["All", ...TIERS]} />
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-taptap-muted" />
                <input type="date" value={fStart} onChange={(e) => setFStart(e.target.value)}
                  className="h-9 rounded-lg border border-input bg-white pl-8 pr-2 text-sm text-taptap-ink focus:border-taptap-500 focus:outline-none focus:ring-2 focus:ring-taptap-200" />
              </div>
              <ArrowRight className="h-4 w-4 text-taptap-muted" />
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-taptap-muted" />
                <input type="date" value={fEnd} onChange={(e) => setFEnd(e.target.value)}
                  className="h-9 rounded-lg border border-input bg-white pl-8 pr-2 text-sm text-taptap-ink focus:border-taptap-500 focus:outline-none focus:ring-2 focus:ring-taptap-200" />
              </div>
              {(fClient !== "All" || fTier !== "All" || fStart || fEnd) && (
                <Button variant="ghost" size="sm" className="text-taptap-700"
                  onClick={() => { setFClient("All"); setFTier("All"); setFStart(""); setFEnd(""); }}>
                  Reset
                </Button>
              )}
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-semibold text-taptap-ink">Pipeline by Stage & Tier</h3>
            <p className="text-xs text-taptap-muted">มูลค่า deal แยกตาม stage และ tier (stacked)</p>
            <div className="mt-3 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={TT.grid} vertical={false} />
                  <XAxis dataKey="stage" stroke={TT.axis} tick={{ fontSize: 11 }} />
                  <YAxis stroke={TT.axis} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}K`} />
                  <Tooltip formatter={(v: number) => formatTHB(v)}
                    contentStyle={{ borderRadius: 10, border: `1px solid ${TT.grid}`, fontSize: 12 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  {TIERS.map((t, i) => (
                    <Bar key={t} dataKey={t} stackId="a" fill={TIER_COLOR[t]}
                      radius={i === TIERS.length - 1 ? [6, 6, 0, 0] : undefined as any} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* ===== Two line charts ===== */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="rounded-2xl p-5 shadow-elev-1">
            <h3 className="text-sm font-semibold text-taptap-ink">Pipeline Trend</h3>
            <p className="text-xs text-taptap-muted">คาดการณ์มูลค่า pipeline รายเดือน</p>
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={TT.grid} vertical={false} />
                  <XAxis dataKey="month" stroke={TT.axis} tick={{ fontSize: 11 }} />
                  <YAxis stroke={TT.axis} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000000}M`} />
                  <Tooltip formatter={(v: number) => formatTHB(v)} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Line type="monotone" dataKey="pipeline" name="Pipeline" stroke={TT.c1} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="rounded-2xl p-5 shadow-elev-1">
            <h3 className="text-sm font-semibold text-taptap-ink">Direct vs Agency Trend</h3>
            <p className="text-xs text-taptap-muted">แนวโน้ม pipeline แยกตามประเภทลูกค้า</p>
            <div className="mt-3 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={splitTrend} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={TT.grid} vertical={false} />
                  <XAxis dataKey="month" stroke={TT.axis} tick={{ fontSize: 11 }} />
                  <YAxis stroke={TT.axis} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000000}M`} />
                  <Tooltip formatter={(v: number) => formatTHB(v)} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Direct" stroke={TT.c2} strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Agency" stroke={TT.c4} strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* ===== Donut + AI insight ===== */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl p-5 shadow-elev-1">
            <h3 className="text-sm font-semibold text-taptap-ink">Pipeline by Tier</h3>
            <p className="text-xs text-taptap-muted">สัดส่วนมูลค่า open pipeline</p>
            <div className="relative mt-2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} dataKey="value" innerRadius={68} outerRadius={95} paddingAngle={2}>
                    {donut.map((d) => <Cell key={d.name} fill={TIER_COLOR[d.name]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatTHB(v)} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" style={{ top: "-28px" }}>
                <span className="text-xl font-bold text-taptap-ink">{formatTHB(donutTotal)}</span>
                <span className="text-xs text-taptap-muted">Total</span>
              </div>
            </div>
          </Card>

          <AIPanel
            className="lg:col-span-2"
            subtitle="Strategic Recommendations · อัปเดต 5 นาทีก่อน"
            actionLabel="Refresh insights"
            onGenerate={() => {}}
          >
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2"><span className="text-taptap-600">●</span> <span><b>Pipeline ฿{(pipelineValue / 1000000).toFixed(1)}M</b> จาก {openDeals.length} open deals — Win rate {winRate}% เดือนนี้</span></li>
              <li className="flex gap-2"><span className="text-taptap-600">●</span> <span>มี <b>{hotDeals} hot deals</b> และ <b>{dueThisWeek} รายการ</b> ต้อง follow-up สัปดาห์นี้ — เร่งปิดก่อนหลุด</span></li>
              <li className="flex gap-2"><span className="text-taptap-600">●</span> <span>Active clients <b>{activeClients} ราย</b> — ลอง pitch multi-screen bundle เพื่อ upsell agency</span></li>
            </ul>
          </AIPanel>
        </div>
      </div>
    </div>
  );
}

/* Compact labelled select for the filter bar (TapTap style) */
function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: readonly string[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-taptap-muted">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="h-9 min-w-[140px] rounded-lg border border-input bg-white px-3 text-sm text-taptap-ink focus:border-taptap-500 focus:outline-none focus:ring-2 focus:ring-taptap-200">
        {options.map((o) => <option key={o} value={o}>{o === "All" ? "ทั้งหมด" : o}</option>)}
      </select>
    </div>
  );
}
