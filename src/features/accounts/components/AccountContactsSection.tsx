import { UserPlus, Phone, Mail, MessageCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Contact } from "@/lib/mock-data";
import { ROLE_TONE } from "../constants/accountOptions";

export function AccountContactsSection({
  contacts,
  onAdd,
  onView,
}: {
  contacts: Contact[];
  onAdd: () => void;
  onView: (c: Contact) => void;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Contacts <span className="text-muted-foreground">· {contacts.length}</span>
        </h3>
        <Button variant="outline" size="sm" onClick={onAdd}>
          <UserPlus className="h-4 w-4" /> Add Contact
        </Button>
      </div>

      {contacts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
          ยังไม่มีผู้ติดต่อ — เพิ่มผู้ติดต่อเพื่อเริ่มเข้าหาบัญชีนี้
        </p>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => (
            <Card key={c.id} className="flex items-center justify-between gap-3 p-3 shadow-soft transition hover:border-fresco/30">
              <button type="button" onClick={() => onView(c)} className="min-w-0 flex-1 text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{c.name}</p>
                  <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-semibold", ROLE_TONE[c.roleType] ?? "bg-taptap-neutral-100 text-taptap-neutral-600")}>
                    {c.roleType}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-fresco/10 px-1.5 py-0.5 text-[10px] font-medium text-fresco">
                    {c.preferred === "LINE" ? <MessageCircle className="h-3 w-3" /> : c.preferred === "Email" ? <Mail className="h-3 w-3" /> : <Phone className="h-3 w-3" />}
                    {c.preferred}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{c.jobTitle || "—"}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  {c.phone && <span className="inline-flex items-center gap-0.5"><Phone className="h-3 w-3" />{c.phone}</span>}
                  {c.email && <span className="inline-flex items-center gap-0.5"><Mail className="h-3 w-3" />{c.email}</span>}
                  {c.lineId && <span className="inline-flex items-center gap-0.5"><MessageCircle className="h-3 w-3" />{c.lineId}</span>}
                </p>
              </button>
              <Button variant="ghost" size="sm" className="shrink-0 text-fresco" onClick={() => onView(c)}>
                <Eye className="h-3.5 w-3.5" /> View
              </Button>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
