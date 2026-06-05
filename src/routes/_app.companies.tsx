import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/crm/page-header";
import { AIPanel } from "@/components/crm/ai-panel";
import { TierBadge, AIClassBadge, StatusBadge, ClientTypeBadge, ScoreChip } from "@/components/crm/badges";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatTHB, type Company } from "@/lib/mock-data";
import { listCompanies, listContacts, listDeals, deleteCompany, updateCompany } from "@/lib/api/crm.functions";
import { generateStrategy, classifyLead } from "@/lib/api/ai.functions";
import { CompanyDialog, ContactDialog, DealDialog } from "@/components/crm/entity-dialogs";
import { DeleteConfirm } from "@/components/crm/form-kit";
import { Plus, Search, Filter, Building2, Globe, MapPin, X, Sparkles, Pencil, UserPlus, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/companies")({
  head: () => ({ meta: [{ title: "Accounts — Tathep CRM" }] }),
  loader: async () => {
    const [companies, contacts, deals] = await Promise.all([
      listCompanies(),
      listContacts(),
      listDeals(),
    ]);
    return { companies, contacts, deals };
  },
  component: CompaniesPage,
});

const FILTERS = ["All", "Agencies Only", "Direct Clients", "Active Clients", "Prospects"] as const;

function CompaniesPage() {
  const { companies: COMPANIES, contacts: CONTACTS, deals: DEALS } = Route.useLoaderData();
  const companyMap = new Map(COMPANIES.map((c) => [c.id, c]));
  const getCompany = (id: string) => companyMap.get(id);
  const router = useRouter();
  const refresh = () => router.invalidate();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [companyDialog, setCompanyDialog] = useState<{ open: boolean; initial: Company | null }>({ open: false, initial: null });
  const [contactDialog, setContactDialog] = useState<{ open: boolean; companyId?: string }>({ open: false });
  const [dealDialog, setDealDialog] = useState<{ open: boolean; companyId?: string }>({ open: false });
  const [aiStrategy, setAiStrategy] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [classifying, setClassifying] = useState(false);

  // Reset AI output when switching companies
  useEffect(() => { setAiStrategy(null); }, [selectedId]);

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

  const runStrategy = async (companyId: string) => {
    setAiLoading(true);
    try {
      const { strategy } = await generateStrategy({ data: { companyId } });
      setAiStrategy(strategy);
    } catch (e: any) {
      toast.error(`น้องตาเทพคิดไม่ออก: ${e?.message ?? "error"}`);
    } finally {
      setAiLoading(false);
    }
  };

  const runClassify = async (companyId: string) => {
    setClassifying(true);
    try {
      const r = await classifyLead({ data: { companyId } });
      await updateCompany({ data: { id: companyId, patch: { tier: r.tier, aiClass: r.aiClass, leadScore: r.leadScore } } });
      toast.success(`น้องตาเทพจัดระดับ: ${r.tier} · ${r.aiClass} · ${r.leadScore}/100`);
      refresh();
    } catch (e: any) {
      toast.error(`จัดระดับไม่สำเร็จ: ${e?.message ?? "error"}`);
    } finally {
      setClassifying(false);
    }
  };

  const rows = COMPANIES.filter((c) => {
    if (filter === "Agencies Only" && c.type !== "Agency") return false;
    if (filter === "Direct Clients" && c.type !== "Direct Client") return false;
    if (filter === "Active Clients" && c.status !== "Active" && c.status !== "Recurring") return false;
    if (filter === "Prospects" && c.status !== "Prospect") return false;
    if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  const selected = selectedId ? getCompany(selectedId) : null;

  return (
    <div>
      <PageHeader
        title="Accounts"
        subtitle={`${COMPANIES.length} accounts — Direct Clients & Agencies`}
        actions={<Button size="sm" className="bg-fresco hover:bg-fresco/90" onClick={() => setCompanyDialog({ open: true, initial: null })}><Plus className="h-4 w-4" /> New Account</Button>}
      />

      <div className="space-y-4 p-8">
        <Card className="p-3 shadow-soft">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search companies…"
                className="h-9 w-full rounded-lg border border-input bg-white pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:border-fresco focus:outline-none focus:ring-2 focus:ring-lake/30"
              />
            </div>
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition",
                  filter === f
                    ? "bg-fresco text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {f}
              </button>
            ))}
            <Button variant="outline" size="sm" className="ml-auto"><Filter className="h-4 w-4" /> More filters</Button>
          </div>
        </Card>

        <Card className="overflow-hidden shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50/60 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Industry</th>
                  <th className="px-4 py-3">Province</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Annual Budget</th>
                  <th className="px-4 py-3 text-right">Total Deal Value</th>
                  <th className="px-4 py-3">Owner</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className="cursor-pointer border-b border-border/60 transition hover:bg-fresco/5"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-fresco/10 text-fresco">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="font-medium text-foreground">{c.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><ClientTypeBadge value={c.clientType ?? c.type} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{c.agencyType || c.industry}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.province}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3"><TierBadge tier={c.tier} /></td>
                    <td className="px-4 py-3"><ScoreChip score={c.leadScore} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{c.annualBudget}</td>
                    <td className="px-4 py-3 text-right font-semibold text-fresco">{c.totalDealValue > 0 ? formatTHB(c.totalDealValue) : "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.assignedTo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Slide-over detail */}
      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm" onClick={() => setSelectedId(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-y-auto bg-background shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-brand text-white">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{selected.name}</h2>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <ClientTypeBadge value={selected.clientType ?? selected.type} />
                    <StatusBadge status={selected.status} />
                    <TierBadge tier={selected.tier} />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={() => setCompanyDialog({ open: true, initial: selected })}>
                  <Pencil className="h-4 w-4" /> แก้ไข
                </Button>
                <DeleteConfirm
                  onConfirm={() => removeCompany(selected.id)}
                  description={`ลบ "${selected.name}" และดีลที่เกี่ยวข้องทั้งหมด`}
                />
                <button onClick={() => setSelectedId(null)} className="rounded-lg p-2 hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <Field label="Client Type" value={selected.clientType ?? selected.type} />
                <Field label="Industry" value={selected.industry} />
                {(selected.clientType ?? selected.type) === "Agency" && <Field label="Agency Type" value={selected.agencyType || "—"} />}
                <Field label="Province" value={selected.province} icon={MapPin} />
                <Field label="Lead Score" value={`${selected.leadScore}/100`} />
                <Field label="Tier" value={selected.tier} />
                <Field label="Annual Budget" value={selected.annualBudget} />
                {selected.estimatedAnnualMarketingBudget && <Field label="Marketing Budget (est.)" value={selected.estimatedAnnualMarketingBudget} />}
                {typeof selected.partnerPotentialScore === "number" && <Field label="Partner Potential" value={`${selected.partnerPotentialScore}/100`} />}
                {selected.numberOfBranches ? <Field label="Branches" value={String(selected.numberOfBranches)} /> : null}
                <Field label="Owner" value={selected.assignedTo} />
                {selected.phone && <Field label="เบอร์กลาง" value={selected.phone} icon={Phone} />}
                {selected.website && <Field label="Website" value={selected.website} icon={Globe} />}
              </div>

              {/* Social links */}
              {(selected.facebookUrl || selected.instagramUrl || selected.linkedinUrl || selected.tiktokUrl) && (
                <div>
                  <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Social Links</p>
                  <div className="flex flex-wrap gap-2">
                    {([["Facebook", selected.facebookUrl], ["Instagram", selected.instagramUrl], ["LinkedIn", selected.linkedinUrl], ["TikTok", selected.tiktokUrl]] as const)
                      .filter(([, url]) => !!url)
                      .map(([name, url]) => (
                        <a key={name} href={(url as string).startsWith("http") ? url : `https://${url}`} target="_blank" rel="noreferrer" className="rounded-md border border-border bg-white px-2.5 py-1 text-xs font-medium text-fresco hover:bg-fresco/5">{name}</a>
                      ))}
                  </div>
                </div>
              )}

              <AIPanel
                subtitle="Lead Classification"
                actionLabel={classifying ? "กำลังจัดระดับ…" : "จัดระดับด้วย AI"}
                loading={classifying}
                onGenerate={() => runClassify(selected.id)}
              >
                <p>{selected.summary}</p>
                <div className="mt-3 flex items-center gap-2">
                  <TierBadge tier={selected.tier} />
                  <AIClassBadge value={selected.aiClass} />
                  <span className="text-xs text-slate-500">· Lead Score {selected.leadScore}/100</span>
                </div>
              </AIPanel>

              <AIPanel
                subtitle="Sales Strategy · น้องตาเทพ"
                actionLabel={aiStrategy ? "Regenerate" : "Generate"}
                loading={aiLoading}
                onGenerate={() => runStrategy(selected.id)}
              >
                {aiStrategy ? (
                  <div className="whitespace-pre-wrap leading-relaxed">{aiStrategy}</div>
                ) : (
                  <p className="text-slate-600">กด "Generate" ให้น้องตาเทพวางกลยุทธ์การขายเฉพาะรายนี้ จากข้อมูลบริษัท ผู้ติดต่อ และดีลจริงในระบบ</p>
                )}
              </AIPanel>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Contacts</h3>
                  <Button variant="outline" size="sm" onClick={() => setContactDialog({ open: true, companyId: selected.id })}>
                    <UserPlus className="h-4 w-4" /> เพิ่มผู้ติดต่อ
                  </Button>
                </div>
                <div className="space-y-2">
                  {CONTACTS.filter((c) => c.companyId === selected.id).map((c) => (
                    <Card key={c.id} className="p-3 text-sm shadow-soft">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.jobTitle} · {c.roleType}</p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          <p>LINE {c.lineId}</p>
                          <p>{c.phone}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Related Deals</h3>
                  <Button variant="outline" size="sm" onClick={() => setDealDialog({ open: true, companyId: selected.id })}>
                    <Plus className="h-4 w-4" /> สร้างดีล
                  </Button>
                </div>
                <div className="space-y-2">
                  {DEALS.filter((d) => d.companyId === selected.id).map((d) => (
                    <Card key={d.id} className="flex items-center justify-between p-3 text-sm shadow-soft">
                      <div>
                        <p className="font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.stage} · close {d.expectedClose}</p>
                      </div>
                      <p className="font-semibold text-fresco">{formatTHB(d.value)}</p>
                    </Card>
                  ))}
                  {DEALS.filter((d) => d.companyId === selected.id).length === 0 && (
                    <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">ยังไม่มี deal — <button className="text-fresco hover:underline">สร้าง deal แรก</button></p>
                  )}
                </div>
              </div>

              <Button className="w-full bg-fresco hover:bg-fresco/90" disabled={aiLoading} onClick={() => runStrategy(selected.id)}>
                <Sparkles className="h-4 w-4" /> {aiLoading ? "น้องตาเทพกำลังคิด…" : "Generate Full Strategy with น้องตาเทพ"}
              </Button>
            </div>
          </div>
        </>
      )}

      <CompanyDialog
        open={companyDialog.open}
        initial={companyDialog.initial}
        onOpenChange={(o) => setCompanyDialog((s) => ({ ...s, open: o }))}
        onSaved={refresh}
      />
      <ContactDialog
        open={contactDialog.open}
        companies={COMPANIES}
        defaultCompanyId={contactDialog.companyId}
        onOpenChange={(o) => setContactDialog((s) => ({ ...s, open: o }))}
        onSaved={refresh}
      />
      <DealDialog
        open={dealDialog.open}
        companies={COMPANIES}
        contacts={CONTACTS}
        defaultCompanyId={dealDialog.companyId}
        onOpenChange={(o) => setDealDialog((s) => ({ ...s, open: o }))}
        onSaved={refresh}
      />
    </div>
  );
}

function Field({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        {value}
      </p>
    </div>
  );
}
