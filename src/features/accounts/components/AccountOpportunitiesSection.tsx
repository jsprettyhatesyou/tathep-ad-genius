import { useState } from "react";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StageBadge, PriorityDot } from "@/components/crm/badges";
import { DealDocumentsTab } from "@/components/crm/deal-documents";
import { formatTHB2, type Deal, type Company, type Contact, type Screen } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const payTone = (s?: string) =>
  s === "Paid" ? "bg-tt-success-100 text-tt-success-700"
  : s === "Overdue" ? "bg-tt-danger-100 text-tt-danger-700"
  : s ? "bg-tt-warning-100 text-tt-warning-700"
  : "bg-taptap-neutral-100 text-taptap-neutral-500";

export function AccountOpportunitiesSection({
  deals,
  company,
  contacts,
  screens,
  onCreate,
}: {
  deals: Deal[];
  company: Company;
  contacts: Contact[];
  screens: Screen[];
  onCreate: () => void;
}) {
  const [docDeal, setDocDeal] = useState<Deal | null>(null);
  const open = deals.filter((d) => !["Won", "Lost"].includes(d.stage));
  const closed = deals.filter((d) => ["Won", "Lost"].includes(d.stage));
  const ordered = [...open, ...closed];

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Related Opportunities <span className="text-muted-foreground">· {deals.length}</span>
        </h3>
        <Button variant="outline" size="sm" onClick={onCreate}>
          <Plus className="h-4 w-4" /> Create Opportunity
        </Button>
      </div>

      {deals.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          ยังไม่มีดีล — สร้างโอกาสการขายแรกของบัญชีนี้
        </p>
      ) : (
        <div className="space-y-2">
          {ordered.map((d) => (
            <Card key={d.id} className="p-3 shadow-soft transition hover:border-fresco/30">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <PriorityDot p={d.priority} />
                    <p className="truncate font-medium">{d.name}</p>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <StageBadge stage={d.stage} />
                    {d.paymentStatus && (
                      <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium", payTone(d.paymentStatus))}>
                        💳 {d.paymentStatus}
                      </span>
                    )}
                    {d.campaignStatus && (
                      <span className="rounded-md bg-taptap-100 px-1.5 py-0.5 text-[10px] font-medium text-taptap-700">
                        🎬 {d.campaignStatus}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    โอกาส {d.probability}% · ปิดคาด {d.expectedClose || "—"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold text-fresco tabular-nums">{formatTHB2(d.value)}</p>
                  <Button variant="outline" size="sm" className="mt-1 h-7 border-fresco/30 text-fresco hover:bg-fresco/5" onClick={() => setDocDeal(d)}>
                    <FileText className="h-3.5 w-3.5" /> ใบเสนอราคา / ใบแจ้งหนี้
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Quotation / Invoice manager for the selected opportunity */}
      <Dialog open={!!docDeal} onOpenChange={(o) => !o && setDocDeal(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>เอกสารของดีล · {docDeal?.name}</DialogTitle>
          </DialogHeader>
          {docDeal && (
            <DealDocumentsTab
              deal={docDeal}
              company={company}
              contact={contacts.find((c) => c.id === docDeal.contactId)}
              screens={screens}
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
