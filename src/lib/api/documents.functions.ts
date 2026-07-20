import { createServerFn } from "@tanstack/react-start";
import process from "node:process";
import { z } from "zod";

import { getSupabaseAdmin } from "../supabase.server";
import {
  rowToDocument,
  documentToRow,
  rowToCompany,
  rowToContact,
} from "../db-mappers";
import { computeDocTotals, normalizeLineItems } from "../pricing";
import { renderDocumentHTML } from "../document-html";
import { resolveIssuer } from "../issuer";
import { sendEmail } from "../email.server";
import type { DealDocument, DocLineItem } from "../mock-data";

const lineItemSchema = z.object({
  description: z.string().default(""),
  screenId: z.string().optional(),
  qty: z.number().default(0),
  unit: z.string().default(""),
  unitPrice: z.number().default(0),
  amount: z.number().default(0),
});

/* ---------- list documents for a deal ---------- */
export const listDealDocuments = createServerFn({ method: "GET" })
  .inputValidator(z.object({ dealId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { data: rows, error } = await getSupabaseAdmin()
      .from("deal_documents")
      .select("*")
      .eq("deal_id", data.dealId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map(rowToDocument);
  });

/* ---------- next running number, e.g. QT-2026-0007 ---------- */
async function nextDocNumber(db: any, type: "quotation" | "invoice", issueDate: string): Promise<string> {
  const prefix = type === "quotation" ? "QT" : "INV";
  const year = (issueDate || new Date().toISOString().slice(0, 10)).slice(0, 4);
  const { count, error } = await db
    .from("deal_documents")
    .select("id", { count: "exact", head: true })
    .eq("type", type)
    .like("doc_number", `${prefix}-${year}-%`);
  if (error) throw new Error(error.message);
  const seq = (count ?? 0) + 1;
  return `${prefix}-${year}-${String(seq).padStart(4, "0")}`;
}

/* ---------- create ---------- */
export const createDealDocument = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      dealId: z.string().min(1),
      companyId: z.string().min(1),
      contactId: z.string().optional(),
      type: z.enum(["quotation", "invoice"]),
      lineItems: z.array(lineItemSchema).default([]),
      discount: z.number().default(0),
      vatRate: z.number().default(7),
      issueDate: z.string().min(1),
      dueDate: z.string().optional(),
      notes: z.string().optional(),
      terms: z.string().optional(),
      recipientEmail: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const db = getSupabaseAdmin();
    const items = normalizeLineItems(data.lineItems as DocLineItem[]);
    const totals = computeDocTotals(items, data.discount, data.vatRate);
    const docNumber = await nextDocNumber(db, data.type, data.issueDate);

    const doc: Partial<DealDocument> = {
      dealId: data.dealId,
      companyId: data.companyId,
      contactId: data.contactId,
      type: data.type,
      docNumber,
      status: "Draft",
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      lineItems: items,
      ...totals,
      currency: "THB",
      notes: data.notes,
      terms: data.terms,
      recipientEmail: data.recipientEmail,
    };

    const { data: row, error } = await db
      .from("deal_documents")
      .insert(documentToRow(doc))
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToDocument(row);
  });

/* ---------- update (recompute totals when money fields change) ---------- */
export const updateDealDocument = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1), patch: z.record(z.string(), z.any()) }))
  .handler(async ({ data }) => {
    const db = getSupabaseAdmin();
    const patch = { ...(data.patch as Partial<DealDocument>) };

    // If line items / discount / vat changed, recompute the totals authoritatively.
    if (patch.lineItems || patch.discount != null || patch.vatRate != null) {
      const { data: cur, error: e0 } = await db
        .from("deal_documents")
        .select("line_items, discount, vat_rate")
        .eq("id", data.id)
        .single();
      if (e0) throw new Error(e0.message);
      const items = normalizeLineItems((patch.lineItems ?? cur.line_items ?? []) as DocLineItem[]);
      const discount = patch.discount ?? Number(cur.discount ?? 0);
      const vatRate = patch.vatRate ?? Number(cur.vat_rate ?? 7);
      Object.assign(patch, { lineItems: items, ...computeDocTotals(items, discount, vatRate) });
    }

    const { data: row, error } = await db
      .from("deal_documents")
      .update(documentToRow(patch))
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToDocument(row);
  });

/* ---------- delete ---------- */
export const deleteDealDocument = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { error } = await getSupabaseAdmin().from("deal_documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

/* ---------- send by email (Resend) ---------- */
export const sendDealDocumentEmail = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().min(1),
      to: z.string().email().optional(),
      subject: z.string().optional(),
      message: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const db = getSupabaseAdmin();

    const { data: docRow, error: e1 } = await db
      .from("deal_documents")
      .select("*")
      .eq("id", data.id)
      .single();
    if (e1 || !docRow) throw new Error(e1?.message ?? "ไม่พบเอกสารนี้");
    const doc = rowToDocument(docRow);

    const recipient = (data.to || doc.recipientEmail || "").trim();
    if (!recipient) throw new Error("ไม่มีอีเมลผู้รับ — กรุณาระบุอีเมล");

    // load company + contact for the document header
    const [{ data: coRow }, contactRes] = await Promise.all([
      db.from("companies").select("*").eq("id", doc.companyId).single(),
      doc.contactId
        ? db.from("contacts").select("*").eq("id", doc.contactId).single()
        : Promise.resolve({ data: null }),
    ]);
    const company = coRow ? rowToCompany(coRow) : null;
    const contact = contactRes?.data ? rowToContact(contactRes.data) : null;
    const issuer = resolveIssuer(process.env);

    const docLabel = doc.type === "quotation" ? "ใบเสนอราคา" : "ใบแจ้งหนี้";
    const subject = data.subject || `${docLabel} ${doc.docNumber} จาก ${issuer.name}`;

    const intro = data.message
      ? `<p style="font-family:'Sarabun',sans-serif;font-size:14px;color:#0f172a;max-width:800px;margin:16px auto;">${data.message.replace(/\n/g, "<br/>")}</p>`
      : "";
    const html =
      `<div style="background:#f1f5f9;padding:8px">` +
      intro +
      renderDocumentHTML(doc, { company, contact, issuer }) +
      `</div>`;

    const result = await sendEmail({ to: recipient, subject, html, replyTo: issuer.email });

    // mark sent
    const sentAt = new Date().toISOString();
    const { data: updated } = await db
      .from("deal_documents")
      .update({
        status: doc.status === "Draft" ? "Sent" : doc.status,
        sent_at: sentAt,
        recipient_email: recipient,
      })
      .eq("id", doc.id)
      .select("*")
      .single();

    return { ok: true, emailId: result.id, document: updated ? rowToDocument(updated) : doc };
  });
