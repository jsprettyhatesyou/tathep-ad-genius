import { createFileRoute } from "@tanstack/react-router";
import { StatCard } from "@/components/crm/stat-card";
import { PageHeader } from "@/components/crm/page-header";
import { AIPanel } from "@/components/crm/ai-panel";
import { TierBadge, StageBadge } from "@/components/crm/badges";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTHB, STAGES } from "@/lib/mock-data";
import { listDeals, listCompanies, listActivities } from "@/lib/api/crm.functions";
import {
  Wallet, TrendingUp, Trophy, Target, UserPlus, Users,
  Phone, Calendar, MessageCircle, Mail, Plus
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from "recharts";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "Dashboard — Tathep CRM" }] }),
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

function Dashboard() {
  const { deals: DEALS, companies: COMPANIES, activities: ACTIVITIES } = Route.useLoaderData();
  const companyMap = new Map(COMPANIES.map((c) => [c.id, c]));
  const getCompany = (id: string) => companyMap.get(id);
  const openDeals = DEALS.filter((d) => !["Won", "Lost"].includes(d.stage));
  const wonThisMonth = DEALS.filter((d) => d.stage === "Won");
  const pipelineValue = openDeals.reduce((s, d) => s + d.value, 0);
  const wonValue = wonThisMonth.reduce((s, d) => s + d.value, 0);

  const byStage = STAGES.filter((s) => !["Lost", "On Hold"].includes(s)).map((s) => ({
    stage: s,
    value: DEALS.filter((d) => d.stage === s).reduce((sum, d) => sum + d.value, 0),
    count: DEALS.filter((d) => d.stage === s).length,
  }));

  const tierData = ["Platinum", "Gold", "Silver", "Bronze"].map((t) => ({
    name: t,
    value: COMPANIES.filter((c) => c.tier === t).length,
  }));
  const tierColors = ["oklch(0.6 0.2 295)", "oklch(0.78 0.16 80)", "oklch(0.65 0.02 250)", "oklch(0.65 0.15 50)"];

  const splitData = [
    { name: "Direct", value: DEALS.filter((d) => d.clientType === "Direct Client").reduce((s, d) => s + d.value, 0), count: DEALS.filter((d) => d.clientType === "Direct Client").length },
    { name: "Agency", value: DEALS.filter((d) => d.clientType === "Agency").reduce((s, d) => s + d.value, 0), count: DEALS.filter((d) => d.clientType === "Agency").length },
  ];

  const forecast = [
    { month: "เม.ย.", value: 720000 }, { month: "พ.ค.", value: 980000 },
    { month: "มิ.ย.", value: 1320000 }, { month: "ก.ค.", value: 1480000 },
    { month: "ส.ค.", value: 1750000 }, { month: "ก.ย.", value: 2100000 },
  ];

  return (
    <div>
      <PageHeader
        title="Sales Dashboard"
        actions={
          <>
            <Button variant="outline" size="sm">Export</Button>
            <Button size="sm" className="bg-fresco hover:bg-fresco/90"><Plus className="h-4 w-4" /> New Deal</Button>
          </>
        }
      />

      <div className="space-y-6 p-8">
        {/* Stat row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Pipeline Value" value={formatTHB(pipelineValue)} delta={{ value: "+18%", positive: true }} icon={Wallet} tone="brand" />
          <StatCard label="Open Deals" value={String(openDeals.length)} delta={{ value: "+3", positive: true }} icon={Target} />
          <StatCard label="Won This Month" value={formatTHB(wonValue)} delta={{ value: "+24%", positive: true }} icon={Trophy} />
          <StatCard label="Win Rate" value="47%" delta={{ value: "+4pp", positive: true }} icon={TrendingUp} />
          <StatCard label="New Leads / Week" value="28" delta={{ value: "+12", positive: true }} icon={UserPlus} />
          <StatCard label="Active Clients" value={String(COMPANIES.filter((c) => c.status === "Active" || c.status === "Recurring").length)} icon={Users} />
        </div>

        {/* Charts row 1 */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Pipeline by Stage</h3>
                <p className="text-xs text-muted-foreground">มูลค่า deal ที่อยู่ในแต่ละ stage</p>
              </div>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byStage} margin={{ left: -10, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.94 0.006 245)" vertical={false} />
                  <XAxis dataKey="stage" stroke="oklch(0.55 0.025 250)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="oklch(0.55 0.025 250)" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000}K`} />
                  <Tooltip
                    formatter={(v: number) => formatTHB(v)}
                    contentStyle={{ borderRadius: 10, border: "1px solid oklch(0.94 0.006 245)", fontSize: 12 }}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="oklch(0.45 0.09 220)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5 shadow-soft">
            <h3 className="text-sm font-semibold text-foreground">Lead Tier Distribution</h3>
            <p className="text-xs text-muted-foreground">จำนวน account ในแต่ละ tier</p>
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={tierData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {tierData.map((_, i) => <Cell key={i} fill={tierColors[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Charts row 2 */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5 shadow-soft">
            <h3 className="text-sm font-semibold text-foreground">Direct vs Agency</h3>
            <p className="text-xs text-muted-foreground">การ split pipeline ตามประเภทลูกค้า</p>
            <div className="mt-5 space-y-4">
              {splitData.map((s, i) => {
                const total = splitData[0].value + splitData[1].value;
                const pct = (s.value / total) * 100;
                return (
                  <div key={s.name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{s.name} <span className="text-xs text-muted-foreground">· {s.count} deals</span></span>
                      <span className="font-semibold text-fresco">{formatTHB(s.value)}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: i === 0 ? "var(--fresco)" : "var(--lake)" }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <AIPanel className="mt-5" subtitle="Insight">
              <p>Agency pipeline กำลังเติบโต <b>+34%</b> เดือนนี้ — แนะนำให้เน้น cross-sell Bangkok Bites และ Creative Hub ซึ่งมี deal มูลค่าเฉลี่ยสูง</p>
            </AIPanel>
          </Card>

          <Card className="p-5 shadow-soft lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground">Revenue Forecast</h3>
            <p className="text-xs text-muted-foreground">คาดการณ์รายได้ตาม expected close date</p>
            <div className="mt-3 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecast} margin={{ left: -10 }}>
                  <defs>
                    <linearGradient id="gradF" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.81 0.13 215)" stopOpacity={0.6} />
                      <stop offset="100%" stopColor="oklch(0.81 0.13 215)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.94 0.006 245)" vertical={false} />
                  <XAxis dataKey="month" stroke="oklch(0.55 0.025 250)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="oklch(0.55 0.025 250)" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v / 1000000}M`} />
                  <Tooltip formatter={(v: number) => formatTHB(v)} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                  <Area type="monotone" dataKey="value" stroke="oklch(0.45 0.09 220)" strokeWidth={2} fill="url(#gradF)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Recent + follow-ups */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Recent Activities</h3>
              <Button variant="ghost" size="sm" className="text-fresco">View all</Button>
            </div>
            <ul className="space-y-3">
              {ACTIVITIES.filter((a) => a.status === "Done").slice(0, 5).map((a) => {
                const Icon = a.type === "Call" ? Phone : a.type === "Meeting" ? Calendar : a.type === "LINE" ? MessageCircle : Mail;
                return (
                  <li key={a.id} className="flex gap-3 rounded-lg p-2 transition hover:bg-slate-50">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-fresco/10 text-fresco">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{a.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{getCompany(a.companyId || "")?.name} · {a.assignedTo}</p>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">{a.date.slice(11, 16)}</p>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Today's Follow-ups</h3>
              <Button variant="ghost" size="sm" className="text-fresco">View calendar</Button>
            </div>
            <ul className="space-y-3">
              {DEALS.filter((d) => d.nextFollowUp >= "2026-06-04" && d.nextFollowUp <= "2026-06-10").slice(0, 5).map((d) => (
                <li key={d.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3 transition hover:border-fresco/30 hover:bg-fresco/5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                      <TierBadge tier={d.tier} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {getCompany(d.companyId)?.name} · {d.nextFollowUp}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="text-sm font-semibold text-fresco">{formatTHB(d.value)}</p>
                    <StageBadge stage={d.stage} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <AIPanel
          subtitle="Strategic Recommendations · อัปเดต 5 นาทีก่อน"
          actionLabel="Refresh insights"
          onGenerate={() => {}}
        >
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2"><span className="text-fresco">●</span> <span><b>Dermaglow Q3 Brand Push</b> อยู่ในขั้น Negotiation มา 9 วัน — แนะนำให้นัด in-person meeting เพื่อปิดดีล (probability +15%)</span></li>
            <li className="flex gap-2"><span className="text-fresco">●</span> <span>มีโอกาส upsell <b>3 agencies</b> ที่เคยซื้อ screen เดียว → ลอง pitch multi-screen bundle</span></li>
            <li className="flex gap-2"><span className="text-fresco">●</span> <span>Hot lead <b>คุณภูริ (ภูเขา Coffee)</b> เปิดอ่าน proposal 4 ครั้งใน 2 วัน — ติดต่อภายใน 24 ชม.</span></li>
          </ul>
        </AIPanel>
      </div>
    </div>
  );
}


