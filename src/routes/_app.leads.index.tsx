import { createFileRoute, useNavigate, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listLeads, deleteLead, deleteLeads } from "@/lib/api/crm.functions";
import { Checkbox } from "@/components/ui/checkbox";
import type { Lead, LeadStatus } from "@/lib/mock-data";
import { LEAD_STATUSES } from "@/lib/crm-options";
import { LeadDialog, ConvertLeadDialog } from "@/components/crm/entity-dialogs";
import {
  Plus, Pencil, Trash2, ArrowRightLeft, Building2, FileText, Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/leads/")({
  head: () => ({ meta: [{ title: "Leads — Tathep CRM" }] }),
  loader: async () => ({ leads: await listLeads() }),
  component: LeadsPage,
});

const STATUS_STYLE: Record<string, string> = {
  New: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
  Working: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Qualified: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Unqualified: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
  Converted: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
};

// Friendly display labels (DB still stores New/Working/…).
const STATUS_LABEL: Record<string, string> = {
  New: "New Lead",
  Working: "Contacting",
  Qualified: "Qualified",
  Unqualified: "Unqualified",
  Converted: "Converted",
};

// Converted leads leave the Leads page (they live on as Companies/Contacts).
const ALL_TABS = ["All", ...LEAD_STATUSES.filter((s) => s !== "Converted")] as const;

function LeadsPage() {
  const { leads: allLeads } = Route.useLoaderData();
  // Hide Converted leads from this page entirely.
  const leads = allLeads.filter((l) => l.status !== "Converted");
  const router = useRouter();
  const navigate = useNavigate();
  const reload = () => router.invalidate();

  const [tab, setTab] = useState<"All" | LeadStatus>("All");
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const visible = (tab === "All" ? leads : leads.filter((l) => l.status === tab))
    .slice()
    .sort((a, b) => (a.companyName || "").localeCompare(b.companyName || "", "th"));

  const counts: Record<string, number> = { All: leads.length };
  for (const s of LEAD_STATUSES) counts[s] = leads.filter((l) => l.status === s).length;

  // ---- bulk selection ----
  const allVisibleSelected = visible.length > 0 && visible.every((l) => selectedIds.has(l.id));
  const someSelected = selectedIds.size > 0 && !allVisibleSelected;
  const toggleOne = (id: string) =>
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleAll = () =>
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (allVisibleSelected) visible.forEach((l) => n.delete(l.id));
      else visible.forEach((l) => n.add(l.id));
      return n;
    });
  const clearSel = () => setSelectedIds(new Set());

  const bulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (!confirm(`ลบ ${ids.length} lead ที่เลือก?`)) return;
    try {
      await deleteLeads({ data: { ids } });
      toast.success(`ลบ ${ids.length} รายการแล้ว`);
      clearSel();
      reload();
    } catch (e: any) {
      toast.error(`ลบไม่สำเร็จ: ${e?.message ?? "error"}`);
    }
  };

  const doDelete = async (lead: Lead) => {
    if (!confirm(`ลบ lead "${lead.companyName}"?`)) return;
    setDeleting(lead.id);
    try {
      await deleteLead({ data: { id: lead.id } });
      toast.success("ลบเรียบร้อย");
      reload();
    } catch (e: any) {
      toast.error(`ลบไม่สำเร็จ: ${e?.message ?? "error"}`);
    } finally {
      setDeleting(null);
    }
  };

  const onConverted = (companyId: string) => {
    setConvertingLead(null);
    reload();
    navigate({ to: "/companies" });
  };

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={`${leads.length} total`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" asChild>
              <Link to="/leads/import"><Upload className="h-4 w-4" /> Import</Link>
            </Button>
            <Button size="sm" className="bg-fresco hover:bg-fresco/90" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" /> New Lead
            </Button>
          </div>
        }
      />

      {/* Status tabs */}
      <div className="border-b border-border bg-white px-8">
        <div className="flex gap-1">
          {ALL_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                tab === t
                  ? "border-fresco text-fresco"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {t === "All" ? "All" : STATUS_LABEL[t] ?? t}
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                tab === t ? "bg-fresco/10 text-fresco" : "bg-slate-100 text-slate-500"
              )}>
                {counts[t] ?? 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="p-8">
        {selectedIds.size > 0 && (
          <div className="mb-3 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50/60 px-4 py-2.5">
            <span className="text-sm font-medium text-rose-700">เลือก {selectedIds.size} รายการ</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={clearSel}>ยกเลิก</Button>
              <Button size="sm" className="bg-rose-600 text-white hover:bg-rose-700" onClick={bulkDelete}>
                <Trash2 className="h-4 w-4" /> ลบที่เลือก ({selectedIds.size})
              </Button>
            </div>
          </div>
        )}
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
            <FileText className="h-12 w-12 opacity-20" />
            <p className="text-sm">ยังไม่มี lead ใน status นี้</p>
            <Button size="sm" className="bg-fresco hover:bg-fresco/90" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" /> เพิ่ม Lead แรก
            </Button>
          </div>
        ) : (
          <Card className="overflow-hidden shadow-soft">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-slate-50/70">
                <tr className="border-b border-border text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <th className="w-10 px-3 py-3">
                    <Checkbox
                      checked={allVisibleSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={toggleAll}
                      aria-label="เลือกทั้งหมด"
                    />
                  </th>
                  <th className="w-[19%] px-4 py-3">Name</th>
                  <th className="w-[21%] px-4 py-3">Company</th>
                  <th className="w-[15%] px-4 py-3">Industry</th>
                  <th className="w-[12%] px-4 py-3">Source</th>
                  <th className="w-[13%] px-4 py-3">Status</th>
                  <th className="w-[12%] px-4 py-3">Last Activity</th>
                  <th className="w-[8%] px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((lead) => (
                  <tr key={lead.id} className={cn("border-b border-border/60 hover:bg-slate-50/50", selectedIds.has(lead.id) && "bg-fresco/5")}>
                    {/* select */}
                    <td className="px-3 py-3">
                      <Checkbox
                        checked={selectedIds.has(lead.id)}
                        onCheckedChange={() => toggleOne(lead.id)}
                        aria-label="เลือก"
                      />
                    </td>

                    {/* Name (contact person) */}
                    <td className="px-4 py-3">
                      <p className="truncate font-medium text-foreground">{lead.contactName || "—"}</p>
                    </td>

                    {/* Company */}
                    <td className="px-4 py-3">
                      <p className="flex items-center gap-1.5 truncate text-foreground">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{lead.companyName}</span>
                      </p>
                    </td>

                    {/* Industry */}
                    <td className="truncate px-4 py-3 text-muted-foreground">{lead.industry || "—"}</td>

                    {/* Source */}
                    <td className="px-4 py-3">
                      <span className="inline-block max-w-full truncate rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        {lead.source}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={cn("inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLE[lead.status] ?? "bg-slate-100 text-slate-600")}>
                        {STATUS_LABEL[lead.status] ?? lead.status}
                      </span>
                    </td>

                    {/* Last Activity */}
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {lead.createdAt ? lead.createdAt.slice(0, 10) : "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        {lead.status !== "Converted" && (
                          <button
                            onClick={() => setConvertingLead(lead)}
                            title="Convert"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-fresco hover:bg-fresco/10"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setEditLead(lead)}
                          title="แก้ไข"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => doDelete(lead)}
                          disabled={deleting === lead.id}
                          title="ลบ"
                          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      {/* New Lead dialog */}
      <LeadDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onSaved={() => { setNewOpen(false); reload(); }}
      />

      {/* Edit Lead dialog */}
      <LeadDialog
        open={!!editLead}
        onOpenChange={(v) => { if (!v) setEditLead(null); }}
        initial={editLead}
        onSaved={() => { setEditLead(null); reload(); }}
      />

      {/* Convert Lead dialog */}
      {convertingLead && (
        <ConvertLeadDialog
          lead={convertingLead}
          open={!!convertingLead}
          onOpenChange={(v) => { if (!v) setConvertingLead(null); }}
          onConverted={onConverted}
        />
      )}
    </div>
  );
}
