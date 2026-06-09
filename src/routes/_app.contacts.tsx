import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIPanel } from "@/components/crm/ai-panel";
import { TierBadge } from "@/components/crm/badges";
import { formatTHB2, type Contact } from "@/lib/mock-data";
import { listContacts, listCompanies, listDeals, listActivities, deleteContact, deleteContacts } from "@/lib/api/crm.functions";
import { ContactDialog } from "@/components/crm/entity-dialogs";
import { DeleteConfirm } from "@/components/crm/form-kit";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Plus, Search, MessageCircle, Phone, Mail, X, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_app/contacts")({
  head: () => ({ meta: [{ title: "Contacts — Tathep CRM" }] }),
  loader: async () => {
    const [contacts, companies, deals, activities] = await Promise.all([
      listContacts(),
      listCompanies(),
      listDeals(),
      listActivities(),
    ]);
    return { contacts, companies, deals, activities };
  },
  component: ContactsPage,
});

// "YYYY-MM-DD" from an ISO-ish string, else "".
const toDate = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : "");

function ContactsPage() {
  const { contacts: CONTACTS, companies, deals: DEALS, activities } = Route.useLoaderData();
  const companyMap = new Map(companies.map((c) => [c.id, c]));
  const getCompany = (id: string) => companyMap.get(id);

  // Latest real activity date per contact (activities.date is ISO datetime).
  const lastActivityByContact = new Map<string, string>();
  for (const a of activities) {
    if (!a.contactId || !a.date) continue;
    const cur = lastActivityByContact.get(a.contactId);
    if (!cur || a.date > cur) lastActivityByContact.set(a.contactId, a.date);
  }
  const lastActivityDate = (c: Contact) =>
    toDate(lastActivityByContact.get(c.id)) || toDate(c.createdAt) || "—";
  const router = useRouter();
  const refresh = () => router.invalidate();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{ open: boolean; initial: Contact | null }>({ open: false, initial: null });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const removeContact = async (id: string) => {
    try {
      await deleteContact({ data: { id } });
      toast.success("ลบผู้ติดต่อแล้ว");
      setOpenId(null);
      refresh();
    } catch (e: any) {
      toast.error(`ลบไม่สำเร็จ: ${e?.message ?? "error"}`);
    }
  };

  const rows = CONTACTS.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.jobTitle ?? "").toLowerCase().includes(q) ||
      (getCompany(c.companyId)?.name ?? "").toLowerCase().includes(q)
    );
  })
    .slice()
    .sort((a, b) => {
      const ca = getCompany(a.companyId)?.name ?? "";
      const cb = getCompany(b.companyId)?.name ?? "";
      return ca.localeCompare(cb, "th") || a.name.localeCompare(b.name, "th");
    });
  const selected = openId ? CONTACTS.find((c) => c.id === openId) : null;
  const company = selected ? getCompany(selected.companyId) : null;
  const deals = selected ? DEALS.filter((d) => d.contactId === selected.id) : [];

  // ---- bulk selection ----
  const allVisibleSelected = rows.length > 0 && rows.every((c) => selectedIds.has(c.id));
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
      if (allVisibleSelected) rows.forEach((c) => n.delete(c.id));
      else rows.forEach((c) => n.add(c.id));
      return n;
    });
  const clearSel = () => setSelectedIds(new Set());

  const bulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    if (!confirm(`ลบผู้ติดต่อ ${ids.length} รายการที่เลือก?`)) return;
    try {
      await deleteContacts({ data: { ids } });
      toast.success(`ลบ ${ids.length} รายการแล้ว`);
      clearSel();
      refresh();
    } catch (e: any) {
      toast.error(`ลบไม่สำเร็จ: ${e?.message ?? "error"}`);
    }
  };

  return (
    <div>
      <PageHeader
        title="Contacts"
        subtitle={`${CONTACTS.length} people`}
        actions={<Button size="sm" className="bg-fresco hover:bg-fresco/90" onClick={() => setDialog({ open: true, initial: null })}><Plus className="h-4 w-4" /> New Contact</Button>}
      />

      <div className="space-y-4 p-8">
        <Card className="p-3 shadow-soft">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, title…"
              className="h-9 w-full max-w-md rounded-lg border border-input bg-white pl-9 pr-3 text-sm focus:border-fresco focus:outline-none focus:ring-2 focus:ring-lake/30"
            />
          </div>
        </Card>

        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50/60 px-4 py-2.5">
            <span className="text-sm font-medium text-rose-700">เลือก {selectedIds.size} รายการ</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={clearSel}>ยกเลิก</Button>
              <Button size="sm" className="bg-rose-600 text-white hover:bg-rose-700" onClick={bulkDelete}>
                <Trash2 className="h-4 w-4" /> ลบที่เลือก ({selectedIds.size})
              </Button>
            </div>
          </div>
        )}

        <Card className="overflow-hidden shadow-soft">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/60 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <th className="w-10 px-3 py-3">
                  <Checkbox
                    checked={allVisibleSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={toggleAll}
                    aria-label="เลือกทั้งหมด"
                  />
                </th>
                <th className="w-[24%] px-4 py-3">Name</th>
                <th className="w-[26%] px-4 py-3">Company</th>
                <th className="w-[22%] px-4 py-3">Title</th>
                <th className="w-[16%] px-4 py-3">Phone</th>
                <th className="w-[12%] px-4 py-3">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const comp = getCompany(c.companyId);
                return (
                  <tr key={c.id} onClick={() => setOpenId(c.id)} className={cn("cursor-pointer border-b border-border/60 transition hover:bg-fresco/5", selectedIds.has(c.id) && "bg-fresco/5")}>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(c.id)}
                        onCheckedChange={() => toggleOne(c.id)}
                        aria-label="เลือก"
                      />
                    </td>
                    <td className="truncate px-4 py-3 font-medium">{c.name}</td>
                    <td className="truncate px-4 py-3 text-fresco">{comp?.name ?? "—"}</td>
                    <td className="truncate px-4 py-3 text-muted-foreground">{c.jobTitle || "—"}</td>
                    <td className="truncate px-4 py-3 text-muted-foreground">{c.phone || "—"}</td>
                    <td className="truncate px-4 py-3 text-muted-foreground tabular-nums">{lastActivityDate(c)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      {selected && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm" onClick={() => setOpenId(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto bg-background shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{selected.name}</h2>
                  <p className="text-xs text-muted-foreground">{selected.jobTitle} · {company?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={() => setDialog({ open: true, initial: selected })}>
                  <Pencil className="h-4 w-4" /> แก้ไข
                </Button>
                <DeleteConfirm onConfirm={() => removeContact(selected.id)} description={`ลบผู้ติดต่อ "${selected.name}"`} />
                <button onClick={() => setOpenId(null)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid grid-cols-3 gap-2">
                <a href={`tel:${selected.phone}`} className="flex flex-col items-center gap-1 rounded-lg border border-border bg-white p-3 text-xs hover:border-fresco/40"><Phone className="h-4 w-4 text-fresco" /> Call</a>
                <a className="flex flex-col items-center gap-1 rounded-lg border border-border bg-white p-3 text-xs hover:border-fresco/40"><MessageCircle className="h-4 w-4 text-emerald-600" /> LINE</a>
                <a href={`mailto:${selected.email}`} className="flex flex-col items-center gap-1 rounded-lg border border-border bg-white p-3 text-xs hover:border-fresco/40"><Mail className="h-4 w-4 text-fresco" /> Email</a>
              </div>

              <AIPanel subtitle="Contact Brief" onGenerate={() => {}}>
                <p>{selected.name} เป็น <b>{selected.roleType}</b> ที่ {company?.name} ดูแลเรื่อง marketing & media buying. ช่องทางที่ตอบดีที่สุดคือ <b>{selected.preferred}</b>. โทนการสื่อสารควรเป็น Insight-driven และมีตัวเลขประกอบ</p>
                <p className="mt-2">แนะนำเปิดประเด็นด้วย <i>"เห็นว่าบริษัทกำลัง{company?.aiClass === "Hot" ? "ขยายสาขา" : "ทำการตลาดต่อเนื่อง"} — น่าจะลอง pilot DOOH ในช่วง peak"</i></p>
              </AIPanel>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Related Deals</h3>
                {deals.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">ยังไม่มี deal</p>
                ) : (
                  <div className="space-y-2">
                    {deals.map((d) => (
                      <Card key={d.id} className="flex items-center justify-between p-3 text-sm shadow-soft">
                        <div>
                          <p className="font-medium">{d.name}</p>
                          <p className="text-xs text-muted-foreground">{d.stage}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <TierBadge tier={d.tier} />
                          <p className="font-semibold text-fresco">{formatTHB2(d.value)}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <ContactDialog
        open={dialog.open}
        initial={dialog.initial}
        companies={companies}
        onOpenChange={(o) => setDialog((s) => ({ ...s, open: o }))}
        onSaved={refresh}
      />
    </div>
  );
}
