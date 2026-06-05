import { createFileRoute, useNavigate, useRouter, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listLeads, deleteLead } from "@/lib/api/crm.functions";
import type { Lead, LeadStatus } from "@/lib/mock-data";
import { LEAD_STATUSES } from "@/lib/crm-options";
import { LeadDialog, ConvertLeadDialog } from "@/components/crm/entity-dialogs";
import {
  Plus, Pencil, Trash2, ArrowRightLeft, Building2, User, Sparkles,
  FileText, Phone, Mail, MapPin, Upload,
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

const scoreColor = (n: number) =>
  n >= 80 ? "text-emerald-600 font-semibold" : n >= 60 ? "text-fresco font-medium" : n >= 40 ? "text-amber-600" : "text-slate-400";

const aiStyle: Record<string, string> = {
  Hot: "bg-rose-50 text-rose-700",
  Warm: "bg-orange-50 text-orange-700",
  Cold: "bg-slate-100 text-slate-500",
  "Agency Upsell": "bg-violet-50 text-violet-700",
};

const ALL_TABS = ["All", ...LEAD_STATUSES] as const;

function LeadsPage() {
  const { leads } = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  const reload = () => router.invalidate();

  const [tab, setTab] = useState<"All" | LeadStatus>("All");
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const visible = tab === "All" ? leads : leads.filter((l) => l.status === tab);

  const counts: Record<string, number> = { All: leads.length };
  for (const s of LEAD_STATUSES) counts[s] = leads.filter((l) => l.status === s).length;

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
              {t}
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50/70">
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">บริษัท / ผู้ติดต่อ</th>
                    <th className="px-4 py-3">Industry</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-center">Score</th>
                    <th className="px-4 py-3 text-center">AI</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((lead) => (
                    <tr key={lead.id} className="border-b border-border/60 hover:bg-slate-50/50">
                      {/* Company / Contact */}
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{lead.companyName}</p>
                            {lead.contactName && (
                              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                {lead.contactName}
                                {lead.jobTitle && <span className="text-slate-400">· {lead.jobTitle}</span>}
                              </p>
                            )}
                            {(lead.phone || lead.email) && (
                              <p className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground/80">
                                {lead.phone && <span className="flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{lead.phone}</span>}
                                {lead.email && <span className="flex items-center gap-0.5"><Mail className="h-2.5 w-2.5" />{lead.email}</span>}
                              </p>
                            )}
                            {lead.province && (
                              <p className="flex items-center gap-0.5 text-[11px] text-muted-foreground/70">
                                <MapPin className="h-2.5 w-2.5" />{lead.province}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Industry */}
                      <td className="px-4 py-3 text-xs text-muted-foreground">{lead.industry || "—"}</td>

                      {/* Source */}
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {lead.source}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_STYLE[lead.status] ?? "bg-slate-100 text-slate-600")}>
                          {lead.status}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3 text-center">
                        <span className={cn("text-sm tabular-nums", scoreColor(lead.leadScore ?? 0))}>
                          {lead.leadScore ?? 0}
                        </span>
                      </td>

                      {/* AI Class */}
                      <td className="px-4 py-3 text-center">
                        {lead.aiClass ? (
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", aiStyle[lead.aiClass] ?? "bg-slate-100 text-slate-600")}>
                            {lead.aiClass}
                          </span>
                        ) : "—"}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {lead.status !== "Converted" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 gap-1 border-fresco/30 px-2 text-fresco hover:bg-fresco/5"
                              onClick={() => setConvertingLead(lead)}
                            >
                              <ArrowRightLeft className="h-3 w-3" /> Convert
                            </Button>
                          )}
                          <button
                            onClick={() => setEditLead(lead)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => doDelete(lead)}
                            disabled={deleting === lead.id}
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
            </div>
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
