import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/crm/page-header";
import { TierBadge, AIClassBadge, PriorityDot } from "@/components/crm/badges";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { STAGES, formatTHB2, type Deal, type Stage } from "@/lib/mock-data";
import { listDeals, listCompanies, listScreens, listContacts, updateDealStage, deleteDeal } from "@/lib/api/crm.functions";
import { DealDialog } from "@/components/crm/entity-dialogs";
import { DealDocumentsTab } from "@/components/crm/deal-documents";
import { DeleteConfirm } from "@/components/crm/form-kit";
import { Plus, Calendar, Filter, X, Building2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline — Tathep CRM" }] }),
  loader: async () => {
    const [deals, companies, screens, contacts] = await Promise.all([
      listDeals(),
      listCompanies(),
      listScreens(),
      listContacts(),
    ]);
    return { deals, companies, screens, contacts };
  },
  component: PipelinePage,
});

type View = "All" | "Hot" | "ThisWeek" | "Agency" | "Direct" | "Mine" | "Lost";

function PipelinePage() {
  const { deals: loaderDeals, companies, contacts } = Route.useLoaderData();
  const router = useRouter();
  const refresh = () => router.invalidate();
  const companyMap = new Map(companies.map((c) => [c.id, c]));
  const getCompany = (id: string) => companyMap.get(id);
  const [deals, setDeals] = useState<Deal[]>(loaderDeals);
  useEffect(() => { setDeals(loaderDeals); }, [loaderDeals]);
  const [view, setView] = useState<View>("All");
  const [openDeal, setOpenDeal] = useState<Deal | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dealDialog, setDealDialog] = useState<{ open: boolean; initial: Deal | null }>({ open: false, initial: null });

  const removeDeal = async (id: string) => {
    try {
      await deleteDeal({ data: { id } });
      toast.success("ลบดีลแล้ว");
      setOpenDeal(null);
      refresh();
    } catch (e: any) {
      toast.error(`ลบไม่สำเร็จ: ${e?.message ?? "error"}`);
    }
  };

  const filtered = deals.filter((d) => {
    if (view === "Hot") return d.aiClass === "Hot" || d.tier === "Platinum";
    if (view === "ThisWeek") return d.nextFollowUp >= "2026-06-04" && d.nextFollowUp <= "2026-06-10";
    if (view === "Agency") return d.clientType === "Agency";
    if (view === "Direct") return d.clientType === "Direct Client";
    if (view === "Mine") return true;
    if (view === "Lost") return d.stage === "Lost";
    return true;
  });

  const handleDrop = (stage: Stage) => {
    if (!dragId) return;
    const id = dragId;
    setDragId(null);

    const prev = deals.find((d) => d.id === id);
    if (!prev || prev.stage === stage) return;

    // optimistic update, then persist to Supabase
    setDeals((ds) => ds.map((d) => (d.id === id ? { ...d, stage } : d)));
    updateDealStage({ data: { id, stage } })
      .then(() => toast.success(`ย้าย "${prev.name}" → ${stage}`))
      .catch(() => {
        setDeals((ds) => ds.map((d) => (d.id === id ? { ...d, stage: prev.stage } : d)));
        toast.error("บันทึกไม่สำเร็จ — ย้อนกลับแล้ว");
      });
  };

  const stagesToShow = STAGES.filter((s) => s !== "Lost" && s !== "On Hold");

  return (
    <div>
      <PageHeader
        title="Sales Pipeline"
        actions={
          <>
            <Button variant="outline" size="sm"><Filter className="h-4 w-4" /> Filters</Button>
            <Button size="sm" className="bg-fresco hover:bg-fresco/90" onClick={() => setDealDialog({ open: true, initial: null })}><Plus className="h-4 w-4" /> New Deal</Button>
          </>
        }
      />

      <div className="space-y-4 p-8">
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList className="bg-slate-100">
            <TabsTrigger value="All">All deals</TabsTrigger>
            <TabsTrigger value="Hot">Hot Leads</TabsTrigger>
            <TabsTrigger value="ThisWeek">This Week</TabsTrigger>
            <TabsTrigger value="Agency">Agency</TabsTrigger>
            <TabsTrigger value="Direct">Direct Client</TabsTrigger>
            <TabsTrigger value="Mine">My Deals</TabsTrigger>
            <TabsTrigger value="Lost">Lost</TabsTrigger>
          </TabsList>
          <TabsContent value={view} className="mt-4">
            <div className="flex gap-3 overflow-x-auto pb-4">
              {stagesToShow.map((stage) => {
                const cards = filtered.filter((d) => d.stage === stage);
                const total = cards.reduce((s, c) => s + c.value, 0);
                return (
                  <div
                    key={stage}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(stage)}
                    className="w-[290px] shrink-0"
                  >
                    <div className="rounded-t-xl border border-b-0 border-border bg-white px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">
                          {stage}
                        </p>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{cards.length}</span>
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-fresco">{formatTHB2(total)}</p>
                    </div>
                    <div className="min-h-[400px] space-y-2 rounded-b-xl border border-t-0 border-border bg-slate-50/60 p-2">
                      {cards.map((d) => (
                        <div
                          key={d.id}
                          draggable
                          onDragStart={() => setDragId(d.id)}
                          onClick={() => setOpenDeal(d)}
                          className="cursor-grab rounded-lg border border-border bg-white p-3 shadow-soft transition hover:border-fresco/40 hover:shadow-card active:cursor-grabbing"
                        >
                          <div className="mb-1 flex items-start justify-between gap-2">
                            <p className="line-clamp-2 flex-1 text-sm font-semibold leading-snug text-foreground">{d.name}</p>
                            <PriorityDot p={d.priority} />
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{getCompany(d.companyId)?.name}</p>
                          <div className="mt-2.5 flex items-center justify-between">
                            <p className="text-sm font-bold text-fresco">{formatTHB2(d.value)}</p>
                            <div className="flex items-center gap-1.5">
                              <TierBadge tier={d.tier} />
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2">
                            <AIClassBadge value={d.aiClass} />
                            {d.nextFollowUp && (
                              <p className="text-[10px] text-muted-foreground"><Calendar className="mr-0.5 inline h-3 w-3" />{d.nextFollowUp.slice(5)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                      {cards.length === 0 && (
                        <div className="rounded-lg border border-dashed border-border bg-white/50 p-6 text-center text-xs text-muted-foreground">
                          ลาก deal มาที่นี่
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {openDeal && (
        <DealSlideOver
          deal={openDeal}
          onClose={() => setOpenDeal(null)}
          onEdit={() => { setDealDialog({ open: true, initial: openDeal }); setOpenDeal(null); }}
          onDelete={() => removeDeal(openDeal.id)}
        />
      )}

      <DealDialog
        open={dealDialog.open}
        initial={dealDialog.initial}
        companies={companies}
        contacts={contacts}
        onOpenChange={(o) => setDealDialog((s) => ({ ...s, open: o }))}
        onSaved={refresh}
      />
    </div>
  );
}

function DealSlideOver({ deal, onClose, onEdit, onDelete }: { deal: Deal; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const { companies, screens: SCREENS, contacts } = Route.useLoaderData();
  const company = companies.find((c) => c.id === deal.companyId);
  const contact = contacts.find((c) => c.id === deal.contactId);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-y-auto bg-background shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{deal.stage}</p>
            <h2 className="text-lg font-semibold">{deal.name}</h2>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 className="h-3 w-3" /> {company?.name}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="h-4 w-4" /> แก้ไข</Button>
            <DeleteConfirm onConfirm={onDelete} description={`ลบดีล "${deal.name}"`} />
            <button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="space-y-5 p-6">
          <div className="grid grid-cols-3 gap-4 rounded-xl border border-border bg-slate-50/60 p-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Value</p>
              <p className="mt-1 text-lg font-semibold text-fresco">{formatTHB2(deal.value)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Probability</p>
              <p className="mt-1 text-lg font-semibold">{deal.probability}%</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Expected Close</p>
              <p className="mt-1 text-sm font-medium">{deal.expectedClose}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label="Campaign Type" value={deal.campaignType} />
            <Field label="Duration" value={deal.duration} />
            <Field label="Client Type" value={deal.clientType} />
            <Field label="Priority" value={deal.priority} />
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Billboard Locations</p>
            <div className="flex flex-wrap gap-2">
              {deal.screens.map((sid) => {
                const s = SCREENS.find((x) => x.id === sid);
                return (
                  <span key={sid} className="rounded-md bg-fresco/10 px-2 py-1 text-xs font-medium text-fresco">
                    {s?.name} · {s?.province}
                  </span>
                );
              })}
            </div>
          </div>

          <Tabs value="docs">
            <TabsList className="grid w-full grid-cols-1 bg-slate-100">
              <TabsTrigger value="docs">เอกสาร</TabsTrigger>
            </TabsList>
            <TabsContent value="docs" className="mt-4">
              <DealDocumentsTab deal={deal} company={company} contact={contact} screens={SCREENS} />
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1">Log Activity</Button>
            <Button className="flex-1 bg-fresco hover:bg-fresco/90">Move Forward</Button>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}
