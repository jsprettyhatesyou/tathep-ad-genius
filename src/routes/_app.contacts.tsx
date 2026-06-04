import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AIPanel } from "@/components/crm/ai-panel";
import { TierBadge } from "@/components/crm/badges";
import { CONTACTS, getCompany, formatTHB, DEALS } from "@/lib/mock-data";
import { Plus, Search, MessageCircle, Phone, Mail, Users as UsersIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/contacts")({
  head: () => ({ meta: [{ title: "Contacts — Tathep CRM" }] }),
  component: ContactsPage,
});

function ContactsPage() {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = CONTACTS.filter((c) => !query || c.name.toLowerCase().includes(query.toLowerCase()));
  const selected = openId ? CONTACTS.find((c) => c.id === openId) : null;
  const company = selected ? getCompany(selected.companyId) : null;
  const deals = selected ? DEALS.filter((d) => d.contactId === selected.id) : [];

  return (
    <div>
      <PageHeader
        title="Contacts"
        subtitle={`${CONTACTS.length} people — decision makers, marketers & agency PMs`}
        actions={<Button size="sm" className="bg-fresco hover:bg-fresco/90"><Plus className="h-4 w-4" /> New Contact</Button>}
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

        <Card className="overflow-hidden shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/60 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">LINE</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Preferred</th>
                <th className="px-4 py-3">Last Contacted</th>
                <th className="px-4 py-3">Owner</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const comp = getCompany(c.companyId);
                return (
                  <tr key={c.id} onClick={() => setOpenId(c.id)} className="cursor-pointer border-b border-border/60 transition hover:bg-fresco/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-brand text-xs font-semibold text-white">
                          {c.name.replace(/คุณ|Mr\.|Ms\./g, "").trim().slice(0, 1)}
                        </div>
                        <span className="font-medium">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-fresco hover:underline">{comp?.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.jobTitle}</td>
                    <td className="px-4 py-3"><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs">{c.roleType}</span></td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-emerald-700"><MessageCircle className="h-3.5 w-3.5" />{c.lineId}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.phone}</td>
                    <td className="px-4 py-3"><PreferredBadge value={c.preferred} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{c.lastContacted}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.assignedTo}</td>
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
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-brand text-sm font-semibold text-white">
                  {selected.name.replace(/คุณ|Mr\.|Ms\./g, "").trim().slice(0, 2)}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{selected.name}</h2>
                  <p className="text-xs text-muted-foreground">{selected.jobTitle} · {company?.name}</p>
                </div>
              </div>
              <button onClick={() => setOpenId(null)} className="rounded-lg p-2 hover:bg-slate-100"><X className="h-4 w-4" /></button>
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
                          <p className="font-semibold text-fresco">{formatTHB(d.value)}</p>
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
    </div>
  );
}

function PreferredBadge({ value }: { value: string }) {
  const Icon = value === "LINE" ? MessageCircle : value === "Phone" ? Phone : value === "Email" ? Mail : UsersIcon;
  const cls = value === "LINE" ? "text-emerald-700 bg-emerald-50" : "text-fresco bg-fresco/10";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium", cls)}>
      <Icon className="h-3 w-3" /> {value}
    </span>
  );
}
