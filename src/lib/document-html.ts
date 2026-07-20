// Renders a quotation / invoice as a standalone, printable HTML document.
// Pure & isomorphic: the browser uses it for the print-to-PDF window, and the
// server reuses the exact same markup as the email body — one source of truth.
import type { Company, Contact, DealDocument } from "./mock-data";
import { ISSUER, type Issuer } from "./issuer";

const esc = (s: unknown): string =>
  String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!),
  );

const baht = (n: number): string =>
  "฿" +
  (Math.round(n || 0)).toLocaleString("th-TH", { maximumFractionDigits: 0 });

const DOC_LABEL: Record<DealDocument["type"], { th: string; en: string }> = {
  quotation: { th: "ใบเสนอราคา", en: "QUOTATION" },
  invoice: { th: "ใบแจ้งหนี้", en: "INVOICE" },
};

export interface DocRenderContext {
  company?: Company | null;
  contact?: Contact | null;
  issuer?: Issuer;
}

/** Just the document body (no <html> wrapper) — used inside the email. */
export function renderDocumentBody(doc: DealDocument, ctx: DocRenderContext = {}): string {
  const issuer = ctx.issuer ?? ISSUER;
  const label = DOC_LABEL[doc.type] ?? DOC_LABEL.quotation;
  const dueLabel = doc.type === "quotation" ? "ยืนราคาถึง" : "ครบกำหนดชำระ";

  const rows = (doc.lineItems ?? [])
    .map(
      (it, i) => `
      <tr>
        <td class="c">${i + 1}</td>
        <td>${esc(it.description)}</td>
        <td class="r">${(it.qty ?? 0).toLocaleString("th-TH")}</td>
        <td class="c">${esc(it.unit)}</td>
        <td class="r">${baht(it.unitPrice)}</td>
        <td class="r">${baht(it.amount)}</td>
      </tr>`,
    )
    .join("");

  const discountRow =
    doc.discount > 0
      ? `<tr><td>ส่วนลด</td><td class="r">-${baht(doc.discount)}</td></tr>`
      : "";

  return `
  <div class="doc">
    <header class="head">
      <div class="issuer">
        ${issuer.logoUrl ? `<img src="${esc(issuer.logoUrl)}" alt="logo" class="logo"/>` : `<div class="brand">👁️ ${esc(issuer.name)}</div>`}
        <div class="muted small">
          ${esc(issuer.address)}<br/>
          เลขผู้เสียภาษี: ${esc(issuer.taxId)}<br/>
          โทร ${esc(issuer.phone)} · ${esc(issuer.email)} · ${esc(issuer.website)}
        </div>
      </div>
      <div class="title">
        <div class="doctype">${esc(label.th)}</div>
        <div class="doctype-en">${esc(label.en)}</div>
        <table class="meta">
          <tr><td>เลขที่</td><td class="r">${esc(doc.docNumber)}</td></tr>
          <tr><td>วันที่</td><td class="r">${esc(doc.issueDate)}</td></tr>
          ${doc.dueDate ? `<tr><td>${dueLabel}</td><td class="r">${esc(doc.dueDate)}</td></tr>` : ""}
          <tr><td>สถานะ</td><td class="r">${esc(doc.status)}</td></tr>
        </table>
      </div>
    </header>

    <section class="billto">
      <div class="muted small label">ลูกค้า / Bill To</div>
      <div class="cust">${esc(ctx.company?.name ?? "—")}</div>
      <div class="muted small">
        ${ctx.contact?.name ? `ผู้ติดต่อ: ${esc(ctx.contact.name)}<br/>` : ""}
        ${(ctx.company as any)?.address ? `${esc((ctx.company as any).address)}<br/>` : ""}
        ${ctx.company?.province ? `${esc(ctx.company.province)}<br/>` : ""}
        ${ctx.contact?.email ? `${esc(ctx.contact.email)} · ` : ""}${ctx.contact?.phone ? esc(ctx.contact.phone) : esc(ctx.company?.phone ?? "")}
      </div>
    </section>

    <table class="items">
      <thead>
        <tr>
          <th class="c">#</th><th>รายการ</th><th class="r">จำนวน</th>
          <th class="c">หน่วย</th><th class="r">ราคา/หน่วย</th><th class="r">รวม</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="6" class="c muted">— ไม่มีรายการ —</td></tr>`}</tbody>
    </table>

    <div class="foot">
      <div class="terms">
        ${doc.notes ? `<div class="muted small"><b>หมายเหตุ:</b> ${esc(doc.notes)}</div>` : ""}
        ${doc.terms ? `<div class="muted small" style="margin-top:6px"><b>เงื่อนไข:</b> ${esc(doc.terms)}</div>` : ""}
        ${
          issuer.bankAccountNo && issuer.bankAccountNo !== "—"
            ? `<div class="muted small" style="margin-top:10px"><b>ชำระเงิน:</b> ${esc(issuer.bankName)} · ${esc(issuer.bankAccountName)} · เลขที่ ${esc(issuer.bankAccountNo)}</div>`
            : ""
        }
      </div>
      <table class="totals">
        <tr><td>ยอดรวม</td><td class="r">${baht(doc.subtotal)}</td></tr>
        ${discountRow}
        <tr><td>VAT ${doc.vatRate}%</td><td class="r">${baht(doc.vatAmount)}</td></tr>
        <tr class="grand"><td>ยอดสุทธิ</td><td class="r">${baht(doc.total)}</td></tr>
      </table>
    </div>

    <div class="sign">
      <div class="sigbox"><div class="line"></div>ผู้เสนอราคา / ผู้มีอำนาจลงนาม</div>
      <div class="sigbox"><div class="line"></div>ผู้อนุมัติ / ลูกค้า</div>
    </div>
  </div>`;
}

const STYLES = `
  *{box-sizing:border-box}
  body{font-family:'Sarabun',-apple-system,'Segoe UI',sans-serif;color:#0f172a;margin:0;background:#f1f5f9}
  .doc{max-width:800px;margin:24px auto;background:#fff;padding:40px 44px;box-shadow:0 1px 8px rgba(0,0,0,.08)}
  .head{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #0ea5e9;padding-bottom:18px}
  .brand{font-size:20px;font-weight:700;color:#0ea5e9;margin-bottom:6px}
  .logo{max-height:48px;margin-bottom:6px}
  .title{text-align:right;min-width:240px}
  .doctype{font-size:24px;font-weight:700;color:#0f172a}
  .doctype-en{font-size:12px;letter-spacing:2px;color:#64748b;margin-bottom:8px}
  .muted{color:#64748b}
  .small{font-size:12px;line-height:1.55}
  table{border-collapse:collapse;width:100%}
  .meta td{padding:1px 0}
  .meta td.r{padding-left:16px;font-weight:600;color:#0f172a}
  .billto{margin:22px 0 14px}
  .billto .label{text-transform:uppercase;letter-spacing:1px}
  .cust{font-size:16px;font-weight:700;margin:2px 0}
  .items{margin-top:8px;font-size:13px}
  .items th{background:#0f172a;color:#fff;padding:9px 10px;text-align:left;font-weight:600}
  .items td{padding:9px 10px;border-bottom:1px solid #e2e8f0}
  .items tbody tr:nth-child(even){background:#f8fafc}
  .r{text-align:right}.c{text-align:center}
  .foot{display:flex;justify-content:space-between;gap:24px;margin-top:18px}
  .terms{flex:1;max-width:55%}
  .totals{width:280px}
  .totals td{padding:6px 4px;border-bottom:1px solid #e2e8f0}
  .totals .grand td{border-top:2px solid #0ea5e9;border-bottom:none;font-size:17px;font-weight:700;color:#0ea5e9;padding-top:10px}
  .sign{display:flex;justify-content:space-between;gap:40px;margin-top:48px}
  .sigbox{flex:1;text-align:center;font-size:12px;color:#64748b}
  .sigbox .line{border-top:1px dotted #94a3b8;margin:40px 16px 8px}
  @media print{body{background:#fff}.doc{box-shadow:none;margin:0;max-width:none;padding:24px}}
`;

/** Full standalone HTML document (with <head>, fonts, print CSS). */
export function renderDocumentHTML(doc: DealDocument, ctx: DocRenderContext = {}): string {
  const label = DOC_LABEL[doc.type] ?? DOC_LABEL.quotation;
  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${esc(label.th)} ${esc(doc.docNumber)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>${STYLES}</style>
</head>
<body>${renderDocumentBody(doc, ctx)}</body>
</html>`;
}
