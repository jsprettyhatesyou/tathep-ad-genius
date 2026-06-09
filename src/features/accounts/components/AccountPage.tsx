import { useMemo, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { PageHeader } from "@/components/crm/page-header";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  CompanyDialog,
  ContactDialog,
  DealDialog,
  ActivityDialog,
} from "@/components/crm/entity-dialogs";
import { deleteCompany, deleteCompanies, updateCompany } from "@/lib/api/crm.functions";
import { generateAccountInsights, classifyLead } from "@/lib/api/ai.functions";
import type { Company, Contact, Deal, Activity, Campaign, Screen } from "@/lib/mock-data";
import type { AccountAIInsight } from "../types/account";
import { computeAccountMetrics, deriveTasks, toDate } from "../utils/accountMetrics";
import { computeRisks } from "../utils/accountHealth";
import type { AccountFilter, AccountSort } from "../constants/accountOptions";
import { AccountList } from "./AccountList";
import type { AccountCardSummary } from "./AccountListCard";
import { AccountDetailPanel } from "./AccountDetailPanel";

interface LoaderData {
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
  activities: Activity[];
  campaigns: Campaign[];
  screens: Screen[];
}

const WON = "Won";

export function AccountPage({ companies, contacts, deals, activities, campaigns, screens }: LoaderData) {
  const router = useRouter();
  const refresh = () => router.invalidate();

  const [selectedId, setSelectedId] = useState<string | null>(companies[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AccountFilter>("All");
  const [sort, setSort] = useState<AccountSort>("revenue");
  const [aiTab, setAiTab] = useState("overview");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // dialogs
  const [companyDialog, setCompanyDialog] = useState<{ open: boolean; initial: Company | null }>({ open: false, initial: null });
  const [contactDialog, setContactDialog] = useState<{ open: boolean; companyId?: string; initial?: Contact | null }>({ open: false });
  const [dealDialog, setDealDialog] = useState<{ open: boolean; companyId?: string; initial?: Deal | null }>({ open: false });
  const [activityDialog, setActivityDialog] = useState<{ open: boolean; companyId?: string }>({ open: false });

  // AI insight cache (per company, session-scoped) + loading flags
  const [insights, setInsights] = useState<Record<string, AccountAIInsight>>({});
  const [insightLoading, setInsightLoading] = useState(false);
  const [classifying, setClassifying] = useState(false);

  // ---- group related records by company once ----
  const grouped = useMemo(() => {
    const d = new Map<string, Deal[]>();
    const c = new Map<string, Contact[]>();
    const a = new Map<string, Activity[]>();
    const cp = new Map<string, Campaign[]>();
    const push = <T,>(m: Map<string, T[]>, k: string | undefined, v: T) => {
      if (!k) return;
      (m.get(k) ?? m.set(k, []).get(k)!).push(v);
    };
    deals.forEach((x) => push(d, x.companyId, x));
    contacts.forEach((x) => push(c, x.companyId, x));
    activities.forEach((x) => push(a, x.companyId, x));
    campaigns.forEach((x) => push(cp, x.companyId, x));
    return { d, c, a, cp };
  }, [deals, contacts, activities, campaigns]);

  const summaryFor = (id: string): AccountCardSummary => {
    const co = companies.find((x) => x.id === id);
    const ds = grouped.d.get(id) ?? [];
    const acts = grouped.a.get(id) ?? [];
    const lifetimeRevenue = ds.filter((x) => x.stage === WON).reduce((s, x) => s + (x.value || 0), 0) || co?.totalDealValue || 0;
    const lastActivity = acts.map((x) => toDate(x.date)).filter(Boolean).sort().pop();
    return {
      lifetimeRevenue,
      openDeals: ds.filter((x) => !["Won", "Lost"].includes(x.stage)).length,
      lastActivity,
    };
  };

  // ---- filtered + sorted list ----
  const rows = useMemo(() => {
    let list = companies.filter((c) => {
      if (filter === "Agencies Only" && (c.clientType ?? c.type) !== "Agency") return false;
      if (filter === "Direct Clients" && (c.clientType ?? c.type) !== "Direct Client") return false;
      if (filter === "Active Clients" && c.status !== "Active") return false;
      if (filter === "Recurring" && c.status !== "Recurring") return false;
      if (filter === "Prospects" && c.status !== "Prospect") return false;
      if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "th");
      if (sort === "score") return (b.leadScore ?? 0) - (a.leadScore ?? 0);
      if (sort === "activity") return (summaryFor(b.id).lastActivity || "").localeCompare(summaryFor(a.id).lastActivity || "");
      return summaryFor(b.id).lifetimeRevenue - summaryFor(a.id).lifetimeRevenue; // revenue
    });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, filter, query, sort, grouped]);

  // ---- bulk selection ----
  const toggleOne = (id: string) =>
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelectedIds((prev) => {
      const allSelected = rows.length > 0 && rows.every((c) => prev.has(c.id));
      const n = new Set(prev);
      if (allSelected) rows.forEach((c) => n.delete(c.id));
      else rows.forEach((c) => n.add(c.id));
      return n;
    });
  const clearSel = () => setSelectedIds(new Set());
  const bulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (!confirm(`ลบ ${ids.length} บัญชีที่เลือก? (ดีลที่เกี่ยวข้องจะถูกลบด้วย)`)) return;
    try {
      await deleteCompanies({ data: { ids } });
      toast.success(`ลบ ${ids.length} บัญชีแล้ว`);
      if (selectedId && ids.includes(selectedId)) setSelectedId(null);
      clearSel();
      refresh();
    } catch (e: any) {
      toast.error(`ลบไม่สำเร็จ: ${e?.message ?? "error"}`);
    }
  };

  const selected = selectedId ? companies.find((c) => c.id === selectedId) ?? null : null;

  // ---- selected account derived data ----
  const detail = useMemo(() => {
    if (!selected) return null;
    const ds = grouped.d.get(selected.id) ?? [];
    const cs = grouped.c.get(selected.id) ?? [];
    const acts = grouped.a.get(selected.id) ?? [];
    const cps = grouped.cp.get(selected.id) ?? [];
    return {
      deals: ds,
      contacts: cs,
      activities: acts,
      campaigns: cps,
      metrics: computeAccountMetrics(selected, ds, acts, cps),
      tasks: deriveTasks(selected, ds, acts),
      risks: computeRisks(selected, ds, acts, cs),
    };
  }, [selected, grouped]);

  // ---- actions ----
  const removeCompany = async (id: string) => {
    try {
      await deleteCompany({ data: { id } });
      toast.success("ลบบริษัทแล้ว");
      setSelectedId(null);
      refresh();
    } catch (e: any) {
      toast.error(`ลบไม่สำเร็จ: ${e?.message ?? "error"}`);
    }
  };

  const onGenerateInsight = async () => {
    if (!selected) return;
    setInsightLoading(true);
    try {
      const res = (await generateAccountInsights({ data: { companyId: selected.id } })) as AccountAIInsight;
      setInsights((m) => ({ ...m, [selected.id]: res }));
    } catch (e: any) {
      toast.error(`น้องตาเทพคิดไม่ออก: ${e?.message ?? "error"}`);
    } finally {
      setInsightLoading(false);
    }
  };

  const onClassify = async () => {
    if (!selected) return;
    setClassifying(true);
    try {
      const r = await classifyLead({ data: { companyId: selected.id } });
      await updateCompany({ data: { id: selected.id, patch: { tier: r.tier, aiClass: r.aiClass, leadScore: r.leadScore, summary: r.reasoning } } });
      toast.success(`จัดระดับ: ${r.tier} · ${r.aiClass} · ${r.leadScore}/100`);
      refresh();
    } catch (e: any) {
      toast.error(`จัดระดับไม่สำเร็จ: ${e?.message ?? "error"}`);
    } finally {
      setClassifying(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle={`${companies.length} accounts`}
        actions={
          <Button size="sm" className="bg-fresco hover:bg-fresco/90" onClick={() => setCompanyDialog({ open: true, initial: null })}>
            <Plus className="h-4 w-4" /> New Account
          </Button>
        }
      />

      <div className="p-6">
        <div className="flex h-[calc(100vh-9.5rem)] min-h-[480px] gap-4">
          <AccountList
            rows={rows}
            summaryFor={summaryFor}
            selectedId={selectedId}
            onSelect={setSelectedId}
            query={query}
            onQuery={setQuery}
            filter={filter}
            onFilter={setFilter}
            sort={sort}
            onSort={setSort}
            selectedIds={selectedIds}
            onToggleOne={toggleOne}
            onToggleAll={toggleAll}
            onClearSel={clearSel}
            onBulkDelete={bulkDelete}
          />

          {selected && detail ? (
            <AccountDetailPanel
              company={selected}
              contacts={detail.contacts}
              deals={detail.deals}
              activities={detail.activities}
              campaigns={detail.campaigns}
              screens={screens}
              metrics={detail.metrics}
              tasks={detail.tasks}
              risks={detail.risks}
              insight={insights[selected.id] ?? null}
              insightLoading={insightLoading}
              onGenerateInsight={onGenerateInsight}
              classifying={classifying}
              onClassify={onClassify}
              aiTab={aiTab}
              onAiTab={setAiTab}
              onEdit={() => setCompanyDialog({ open: true, initial: selected })}
              onDelete={() => removeCompany(selected.id)}
              onAddContact={() => setContactDialog({ open: true, companyId: selected.id })}
              onViewContact={(c) => setContactDialog({ open: true, companyId: selected.id, initial: c })}
              onCreateOpportunity={() => setDealDialog({ open: true, companyId: selected.id })}
              onLogActivity={() => setActivityDialog({ open: true, companyId: selected.id })}
              onAddNote={() => setActivityDialog({ open: true, companyId: selected.id })}
              onCreateTask={() => setActivityDialog({ open: true, companyId: selected.id })}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-background p-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-fresco/10 text-fresco">
                <Building2 className="h-7 w-7" />
              </div>
              <p className="text-sm font-medium">เลือกบริษัทจากรายการด้านซ้าย</p>
              <p className="max-w-xs text-xs text-muted-foreground">ดูโปรไฟล์ลูกค้า มูลค่า ความสัมพันธ์ ผู้ติดต่อ ดีล แคมเปญ และให้น้องตาเทพช่วยวางกลยุทธ์</p>
            </div>
          )}
        </div>
      </div>

      {/* dialogs (reused from entity-dialogs) */}
      <CompanyDialog
        open={companyDialog.open}
        initial={companyDialog.initial}
        onOpenChange={(o) => setCompanyDialog((s) => ({ ...s, open: o }))}
        onSaved={refresh}
      />
      <ContactDialog
        open={contactDialog.open}
        initial={contactDialog.initial}
        companies={companies}
        defaultCompanyId={contactDialog.companyId}
        onOpenChange={(o) => setContactDialog((s) => ({ ...s, open: o }))}
        onSaved={refresh}
      />
      <DealDialog
        open={dealDialog.open}
        initial={dealDialog.initial}
        companies={companies}
        contacts={contacts}
        defaultCompanyId={dealDialog.companyId}
        onOpenChange={(o) => setDealDialog((s) => ({ ...s, open: o }))}
        onSaved={refresh}
      />
      <ActivityDialog
        open={activityDialog.open}
        companies={companies}
        contacts={contacts}
        deals={deals}
        defaultCompanyId={activityDialog.companyId}
        onOpenChange={(o) => setActivityDialog((s) => ({ ...s, open: o }))}
        onSaved={refresh}
      />
    </div>
  );
}
