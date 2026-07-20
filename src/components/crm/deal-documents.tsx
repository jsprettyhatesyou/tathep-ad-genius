import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Plus, Printer, Send, Pencil, Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TextField, TextareaField, SelectField, DeleteConfirm } from "@/components/crm/form-kit";
import { formatTHB, type Company, type Contact, type Deal, type DealDocument, type DocLineItem, type DocType } from "@/lib/mock-data";
import {
  buildLineItemsFromDeal,
  computeDocTotals,
  lineAmount,
  defaultDueDays,
  addDays,
  DEFAULT_VAT_RATE,
} from "@/lib/pricing";
import { renderDocumentHTML } from "@/lib/document-html";
import {
  listDealDocuments,
  createDealDocument,
  updateDealDocument,
  deleteDealDocument,
  sendDealDocumentEmail,
} from "@/lib/api/documents.functions";

const today = () => new Date().toISOString().slice(0, 10);

const DOC_STATUSES = ["Draft", "Sent", "Accepted", "Rejected", "Paid", "Cancelled"] as const;
const UNIT_OPTIONS = ["วัน", "สัปดาห์", "เดือน", "ครั้ง", "งาน", "ชิ้น"] as const;

const TYPE_TH: Record<DocType, string> = { quotation: "ใบเสนอราคา", invoice: "ใบแจ้งหนี้" };

const STATUS_STYLE: Record<string, string> = {
  Draft: "bg-slate-100 text-slate-600",
  Sent: "bg-sky-100 text-sky-700",
  Accepted: "bg-emerald-100 text-emerald-700",
  Paid: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-rose-100 text-rose-700",
  Cancelled: "bg-slate-200 text-slate-500",
};

/** Open the document in a new window and trigger the browser print dialog (→ Save as PDF). */
function printDocument(doc: DealDocument, company?: Company | null, contact?: Contact | null) {
  const html = renderDocumentHTML(doc, { company, contact });
  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) {
    toast.error("เบราว์เซอร์บล็อก popup — อนุญาต popup สำหรับเว็บนี้แล้วลองใหม่");
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.onload = () => setTimeout(() => w.print(), 450);
}

export function DealDocumentsTab({
  deal,
  company,
  contact,
  screens,
}: {
  deal: Deal;
  company?: Company | null;
  contact?: Contact | null;
  screens: any[];
}) {
  const [docs, setDocs] = useState<DealDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<{ open: boolean; type: DocType; initial: DealDocument | null }>(
    { open: false, type: "quotation", initial: null },
  );

  const load = async () => {
    setLoading(true);
    try {
      setDocs(await listDealDocuments({ data: { dealId: deal.id } }));
    } catch (e: any) {
      toast.error(`โหลดเอกสารไม่สำเร็จ: ${e?.message ?? "error"}`);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deal.id]);

  const openNew = (type: DocType) => setEditor({ open: true, type, initial: null });
  const openEdit = (d: DealDocument) => setEditor({ open: true, type: d.type, initial: d });

  const remove = async (id: string) => {
    try {
      await deleteDealDocument({ data: { id } });
      toast.success("ลบเอกสารแล้ว");
      load();
    } catch (e: any) {
      toast.error(`ลบไม่สำเร็จ: ${e?.message ?? "error"}`);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button size="sm" className="bg-fresco hover:bg-fresco/90" onClick={() => openNew("quotation")}>
          <Plus className="h-4 w-4" /> ใบเสนอราคา
        </Button>
        <Button size="sm" variant="outline" onClick={() => openNew("invoice")}>
          <Plus className="h-4 w-4" /> ใบแจ้งหนี้
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด…
        </div>
      ) : docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-slate-50/60 p-8 text-center text-sm text-muted-foreground">
          <FileText className="mx-auto mb-2 h-6 w-6 opacity-40" />
          ยังไม่มีเอกสาร — สร้างใบเสนอราคาหรือใบแจ้งหนี้จากดีลนี้ได้เลย
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="rounded-xl border border-border bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-fresco/10 px-1.5 py-0.5 text-[11px] font-semibold text-fresco">
                      {TYPE_TH[d.type]}
                    </span>
                    <span className="font-mono text-sm font-semibold">{d.docNumber}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[d.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {d.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    ออก {d.issueDate}
                    {d.dueDate ? ` · ${d.type === "quotation" ? "ยืนราคาถึง" : "ครบกำหนด"} ${d.dueDate}` : ""}
                    {d.sentAt ? " · ส่งแล้ว ✓" : ""}
                  </p>
                </div>
                <p className="shrink-0 text-base font-bold text-fresco">{formatTHB(d.total)}</p>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-2">
                <Button size="sm" variant="outline" onClick={() => printDocument(d, company, contact)}>
                  <Printer className="h-3.5 w-3.5" /> พิมพ์ / PDF
                </Button>
                <SendButton doc={d} defaultEmail={contact?.email} onSent={load} />
                <Button size="sm" variant="ghost" onClick={() => openEdit(d)}>
                  <Pencil className="h-3.5 w-3.5" /> แก้ไข
                </Button>
                <DeleteConfirm
                  onConfirm={() => remove(d.id)}
                  description={`ลบ ${TYPE_TH[d.type]} ${d.docNumber}`}
                  trigger={
                    <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-50">
                      <Trash2 className="h-3.5 w-3.5" /> ลบ
                    </Button>
                  }
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {editor.open && (
        <DocumentEditor
          key={editor.initial?.id ?? `new-${editor.type}`}
          deal={deal}
          company={company}
          contact={contact}
          screens={screens}
          type={editor.type}
          initial={editor.initial}
          onClose={() => setEditor((s) => ({ ...s, open: false }))}
          onSaved={() => {
            setEditor((s) => ({ ...s, open: false }));
            load();
          }}
        />
      )}
    </div>
  );
}

/* ---------------- Send-by-email button + dialog ---------------- */
function SendButton({ doc, defaultEmail, onSent }: { doc: DealDocument; defaultEmail?: string; onSent: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(doc.recipientEmail || defaultEmail || "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!email.trim()) return toast.error("กรุณาระบุอีเมลผู้รับ");
    setSending(true);
    try {
      await sendDealDocumentEmail({ data: { id: doc.id, to: email.trim(), message: message.trim() || undefined } });
      toast.success(`ส่ง ${TYPE_TH[doc.type]} ${doc.docNumber} ไปที่ ${email} แล้ว ✓`);
      setOpen(false);
      onSent();
    } catch (e: any) {
      toast.error(`ส่งไม่สำเร็จ: ${e?.message ?? "error"}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Send className="h-3.5 w-3.5" /> ส่งอีเมล
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ส่ง {TYPE_TH[doc.type]} {doc.docNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <TextField label="อีเมลผู้รับ" type="email" value={email} onChange={setEmail} placeholder="customer@example.com" required />
            <TextareaField label="ข้อความถึงลูกค้า (ไม่บังคับ)" value={message} onChange={setMessage} rows={4} placeholder="เรียนคุณลูกค้า, แนบใบเสนอราคาตามที่คุยกันนะครับ…" />
            <p className="text-xs text-muted-foreground">เอกสารจะถูกแนบเป็นเนื้อหาอีเมล (HTML) — ลูกค้ากดพิมพ์/บันทึก PDF ได้เอง</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>ยกเลิก</Button>
            <Button className="bg-fresco hover:bg-fresco/90" onClick={send} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} ส่งอีเมล
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------------- Document editor (line items + live totals) ---------------- */
function DocumentEditor({
  deal,
  company,
  contact,
  screens,
  type,
  initial,
  onClose,
  onSaved,
}: {
  deal: Deal;
  company?: Company | null;
  contact?: Contact | null;
  screens: any[];
  type: DocType;
  initial: DealDocument | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const seedDate = initial?.issueDate || today();
  const [issueDate, setIssueDate] = useState(seedDate);
  const [dueDate, setDueDate] = useState(initial?.dueDate || addDays(seedDate, defaultDueDays(type)));
  const [items, setItems] = useState<DocLineItem[]>(
    initial?.lineItems?.length ? initial.lineItems : buildLineItemsFromDeal(deal, screens),
  );
  const [discount, setDiscount] = useState(initial?.discount ?? 0);
  const [vatRate, setVatRate] = useState(initial?.vatRate ?? DEFAULT_VAT_RATE);
  const [status, setStatus] = useState(initial?.status ?? "Draft");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [terms, setTerms] = useState(
    initial?.terms ??
      (type === "quotation"
        ? "ราคานี้ยังไม่รวมค่าผลิตสื่อ · ยืนราคาตามวันที่ระบุ · ชำระมัดจำ 50% ก่อนเริ่มแคมเปญ"
        : "กรุณาชำระภายในวันครบกำหนด · โอนเข้าบัญชีบริษัทตามรายละเอียดด้านล่าง"),
  );
  const [saving, setSaving] = useState(false);

  const totals = computeDocTotals(items, discount, vatRate);

  const setItem = (i: number, patch: Partial<DocLineItem>) =>
    setItems((arr) =>
      arr.map((it, idx) => {
        if (idx !== i) return it;
        const next = { ...it, ...patch };
        next.amount = lineAmount(next);
        return next;
      }),
    );
  const addItem = () =>
    setItems((arr) => [...arr, { description: "", qty: 1, unit: "เดือน", unitPrice: 0, amount: 0 }]);
  const removeItem = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));

  const save = async () => {
    if (items.length === 0) return toast.error("เพิ่มอย่างน้อย 1 รายการ");
    setSaving(true);
    try {
      if (initial) {
        await updateDealDocument({
          data: {
            id: initial.id,
            patch: { lineItems: items, discount, vatRate, status, issueDate, dueDate, notes, terms },
          },
        });
        toast.success("บันทึกเอกสารแล้ว");
      } else {
        await createDealDocument({
          data: {
            dealId: deal.id,
            companyId: deal.companyId,
            contactId: deal.contactId || undefined,
            type,
            lineItems: items,
            discount,
            vatRate,
            issueDate,
            dueDate,
            notes,
            terms,
            recipientEmail: contact?.email,
          },
        });
        toast.success(`สร้าง ${TYPE_TH[type]} แล้ว`);
      }
      onSaved();
    } catch (e: any) {
      toast.error(`บันทึกไม่สำเร็จ: ${e?.message ?? "error"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {initial ? `แก้ไข ${TYPE_TH[type]} ${initial.docNumber}` : `สร้าง ${TYPE_TH[type]}`}
            <span className="ml-2 text-sm font-normal text-muted-foreground">· {company?.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <TextField label="วันที่ออก" type="date" value={issueDate} onChange={setIssueDate} />
            <TextField label={type === "quotation" ? "ยืนราคาถึง" : "ครบกำหนดชำระ"} type="date" value={dueDate} onChange={setDueDate} />
            {initial && <SelectField label="สถานะ" value={status} onChange={(v) => setStatus(v as any)} options={DOC_STATUSES} />}
          </div>

          {/* line items */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">รายการ</span>
              <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3.5 w-3.5" /> เพิ่มรายการ</Button>
            </div>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium">รายละเอียด</th>
                    <th className="w-16 px-1 py-1.5 text-right font-medium">จำนวน</th>
                    <th className="w-24 px-1 py-1.5 text-left font-medium">หน่วย</th>
                    <th className="w-28 px-1 py-1.5 text-right font-medium">ราคา/หน่วย</th>
                    <th className="w-28 px-2 py-1.5 text-right font-medium">รวม</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-2 py-1.5">
                        <input
                          value={it.description}
                          onChange={(e) => setItem(i, { description: e.target.value })}
                          placeholder="รายละเอียดรายการ"
                          className="h-8 w-full rounded-md border border-input bg-white px-2 text-sm focus:border-fresco focus:outline-none"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <input
                          type="number"
                          value={it.qty}
                          onChange={(e) => setItem(i, { qty: Number(e.target.value) || 0 })}
                          className="h-8 w-full rounded-md border border-input bg-white px-1.5 text-right text-sm focus:border-fresco focus:outline-none"
                        />
                      </td>
                      <td className="px-1 py-1.5">
                        <select
                          value={it.unit}
                          onChange={(e) => setItem(i, { unit: e.target.value })}
                          className="h-8 w-full rounded-md border border-input bg-white px-1 text-sm focus:border-fresco focus:outline-none"
                        >
                          {!UNIT_OPTIONS.includes(it.unit as any) && it.unit && <option value={it.unit}>{it.unit}</option>}
                          {UNIT_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                      <td className="px-1 py-1.5">
                        <input
                          type="number"
                          value={it.unitPrice}
                          onChange={(e) => setItem(i, { unitPrice: Number(e.target.value) || 0 })}
                          className="h-8 w-full rounded-md border border-input bg-white px-1.5 text-right text-sm focus:border-fresco focus:outline-none"
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium tabular-nums">{formatTHB(it.amount)}</td>
                      <td className="px-1 py-1.5 text-center">
                        <button onClick={() => removeItem(i)} className="text-slate-400 hover:text-rose-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2 rounded-lg border border-border bg-slate-50/60 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">ยอดรวม</span>
                <span className="font-medium tabular-nums">{formatTHB(totals.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">ส่วนลด (THB)</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  className="h-8 w-28 rounded-md border border-input bg-white px-2 text-right text-sm focus:border-fresco focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">VAT (%)</span>
                <input
                  type="number"
                  value={vatRate}
                  onChange={(e) => setVatRate(Number(e.target.value) || 0)}
                  className="h-8 w-28 rounded-md border border-input bg-white px-2 text-right text-sm focus:border-fresco focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>VAT</span>
                <span className="tabular-nums">{formatTHB(totals.vatAmount)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold text-fresco">
                <span>ยอดสุทธิ</span>
                <span className="tabular-nums">{formatTHB(totals.total)}</span>
              </div>
            </div>
          </div>

          <TextareaField label="หมายเหตุ" value={notes} onChange={setNotes} rows={2} />
          <TextareaField label="เงื่อนไข" value={terms} onChange={setTerms} rows={2} />
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose}>ยกเลิก</Button>
          <Button className="bg-fresco hover:bg-fresco/90" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {initial ? "บันทึก" : "สร้างเอกสาร"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
