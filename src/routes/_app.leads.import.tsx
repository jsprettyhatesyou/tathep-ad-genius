import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/crm/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle2, FileSpreadsheet, ArrowLeft, Users } from "lucide-react";
import { toast } from "sonner";
import { importLeads } from "@/lib/api/crm.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/leads/import")({
  head: () => ({ meta: [{ title: "Import Leads — Tathep CRM" }] }),
  component: ImportPage,
});

type Lead = {
  companyName: string;
  website: string;
  industry: string;
  companyType?: string;
  province: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  lineId: string;
  jobTitle: string;
  role: string;
};

type Raw = { headers: string[]; data: string[][] };

// Mapping targets shown in each column dropdown.
const FIELD_OPTIONS = [
  { value: "company_name", label: "ชื่อบริษัท" },
  { value: "first_name", label: "ชื่อ (ผู้ติดต่อ)" },
  { value: "last_name", label: "นามสกุล (ผู้ติดต่อ)" },
  { value: "email", label: "อีเมล" },
  { value: "phone", label: "เบอร์โทร" },
  { value: "line_id", label: "LINE ID" },
  { value: "job_title", label: "ตำแหน่ง" },
  { value: "role", label: "บทบาท/ระดับตัดสินใจ" },
  { value: "company_website", label: "เว็บไซต์บริษัท" },
  { value: "company_type", label: "ประเภทบริษัท (Type)" },
  { value: "industry", label: "อุตสาหกรรม" },
  { value: "province", label: "จังหวัด" },
  { value: "ignore", label: "ไม่ใช้" },
];

const SAMPLE_LEADS: Lead[] = [
  { companyName: "ร้านอาหารส้มตำคุณยาย", website: "", industry: "F&B", province: "นนทบุรี", firstName: "สมหญิง", lastName: "ใจดี", email: "somying@somtam.th", phone: "081-111-2222", lineId: "@somtam", jobTitle: "เจ้าของ", role: "Decision Maker" },
  { companyName: "Solar Solutions Co., Ltd.", website: "solar.co.th", industry: "Energy", province: "ชลบุรี", firstName: "Krit", lastName: "T.", email: "krit@solar.co.th", phone: "086-333-4444", lineId: "", jobTitle: "Sales Director", role: "Budget Holder" },
  { companyName: "Bloom Dental Clinic", website: "", industry: "Healthcare", province: "ภูเก็ต", firstName: "หมอแนน", lastName: "", email: "nan@bloom.dental", phone: "", lineId: "@bloomdental", jobTitle: "ทันตแพทย์เจ้าของ", role: "Decision Maker" },
];

const HEADER_TOKENS = ["name", "company", "บริษัท", "first", "last", "ชื่อ", "นามสกุล", "email", "อีเมล", "phone", "เบอร์", "line", "job", "title", "ตำแหน่ง", "industry", "อุตสาหกรรม", "province", "จังหวัด", "website", "เว็บ", "department", "role", "status"];

// Minimal CSV parser: handles quoted fields, commas, CRLF.
function parseCsvText(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); out.push(row); row = []; cell = ""; }
    else if (ch === "\r") { /* skip */ }
    else cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); out.push(row); }
  return out.filter((r) => r.some((c) => c.trim() !== ""));
}

function splitHeaderData(cells: string[][]): Raw {
  if (!cells.length) return { headers: [], data: [] };
  const first = cells[0].map((h) => h.trim().toLowerCase());
  const hasHeader = first.some((h) => HEADER_TOKENS.some((k) => h.includes(k)));
  if (hasHeader) return { headers: cells[0].map((h) => h.trim()), data: cells.slice(1) };
  return { headers: cells[0].map((_, i) => `คอลัมน์ ${i + 1}`), data: cells };
}

function autoGuessMapping(headers: string[]): string[] {
  return headers.map((h) => {
    const l = h.toLowerCase().trim();
    if (/(first.?name|ชื่อจริง)/.test(l)) return "first_name";
    if (/(last.?name|surname|นามสกุล)/.test(l)) return "last_name";
    if (/(website|เว็บ|url|domain)/.test(l)) return "company_website";
    if (/(company.?size|จำนวนพนักงาน|ขนาด)/.test(l)) return "ignore";
    if (/(company.?type|ประเภทบริษัท|account.?type)/.test(l)) return "company_type";
    if (/(e-?mail|อีเมล)/.test(l)) return "email";
    if (/(mobile|phone|tel|เบอร์|โทร)/.test(l)) return "phone";
    if (/line/.test(l)) return "line_id";
    if (/(decision|บทบาท)/.test(l)) return "role";
    if (/(job|title|position|ตำแหน่ง|level|department|แผนก)/.test(l)) return "job_title";
    if (/(industry|อุตสาหกรรม|ประเภท|sector|category)/.test(l)) return "industry";
    if (/(province|จังหวัด|city|location|พื้นที่)/.test(l)) return "province";
    if (/(^company$|company name|บริษัท|องค์กร|brand|^account$)/.test(l)) return "company_name";
    if (/(name|ชื่อ)/.test(l)) return "first_name";
    return "ignore";
  });
}

// Read a CSV file as text, repairing common Thai encoding problems:
//  - UTF-8 bytes that were decoded as Latin-1 then re-saved (mojibake "à¸...")
//  - legacy Windows-874 / TIS-620 Thai encoding
async function readCsvText(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  // mojibake: looks like double-encoded UTF-8 and every char fits in a byte → re-decode
  if (/[ÃÂà][¸¹º~]/.test(utf8) && [...utf8].every((c) => c.charCodeAt(0) < 256)) {
    try {
      const fixed = new TextDecoder("utf-8").decode(Uint8Array.from(utf8, (c) => c.charCodeAt(0)));
      if (!fixed.includes("�")) return fixed;
    } catch { /* ignore */ }
  }
  // replacement chars → try Thai Windows-874
  if (utf8.includes("�")) {
    try {
      const w = new TextDecoder("windows-874").decode(bytes);
      if (!w.includes("�")) return w;
    } catch { /* ignore */ }
  }
  return utf8;
}

function buildLeads(raw: Raw, mapping: string[]): Lead[] {
  const get = (r: string[], field: string) => {
    const i = mapping.findIndex((m) => m === field);
    return i >= 0 ? (r[i] ?? "").trim() : "";
  };
  return raw.data
    .map((r) => ({
      companyName: get(r, "company_name"),
      website: get(r, "company_website"),
      industry: get(r, "industry"),
      companyType: get(r, "company_type"),
      province: get(r, "province"),
      firstName: get(r, "first_name"),
      lastName: get(r, "last_name"),
      email: get(r, "email"),
      phone: get(r, "phone"),
      lineId: get(r, "line_id"),
      jobTitle: get(r, "job_title"),
      role: get(r, "role"),
    }))
    .filter((l) => l.companyName || l.firstName || l.lastName);
}

function ImportPage() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [importing, setImporting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [raw, setRaw] = useState<Raw | null>(null);
  const [mapping, setMapping] = useState<string[]>([]);

  const loadSample = () => { setRaw(null); setLeads(SAMPLE_LEADS.map((l) => ({ ...l }))); };

  const ingest = (cells: string[][], label: string) => {
    if (!cells.length) { toast.error("ไม่พบข้อมูลในไฟล์"); return; }
    const r = splitHeaderData(cells);
    if (!r.data.length) { toast.error("ไฟล์มีแต่หัวคอลัมน์ ไม่มีข้อมูล"); return; }
    setRaw(r);
    setMapping(autoGuessMapping(r.headers));
    setLeads([]);
    toast.success(`อ่าน ${r.data.length} แถว · ${r.headers.length} คอลัมน์จาก ${label} — เลือกการแมป`);
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    try { ingest(parseCsvText(await readCsvText(file)), file.name); }
    catch { toast.error("อ่านไฟล์ไม่สำเร็จ"); }
  };

  const parsePasted = () => {
    if (!pasted.trim()) { toast.error("วางข้อมูลก่อน"); return; }
    ingest(parseCsvText(pasted), "ข้อความที่วาง");
  };

  const setColMap = (i: number, v: string) =>
    setMapping((m) => m.map((x, idx) => (idx === i ? v : x)));

  const applyMapping = () => {
    if (!raw) return;
    const hasName = mapping.some((m) => ["company_name", "first_name", "last_name"].includes(m));
    if (!hasName) { toast.error("เลือกอย่างน้อย 1 คอลัมน์เป็น ชื่อบริษัท หรือ ชื่อผู้ติดต่อ"); return; }
    const built = buildLeads(raw, mapping);
    if (!built.length) { toast.error("ไม่มีแถวที่มีข้อมูล — ตรวจสอบการแมปอีกครั้ง"); return; }
    setLeads(built);
    toast.success(`พร้อมนำเข้า ${built.length} รายการ ✅`);
  };

  const doImport = async () => {
    setImporting(true);
    try {
      const res = await importLeads({ data: { leads } });
      toast.success(`นำเข้าสำเร็จ — ${res.companiesCreated} บริษัทใหม่, ${res.contactsCreated} ผู้ติดต่อ ✅`);
      navigate({ to: res.contactsCreated > 0 ? "/contacts" : "/companies" });
    } catch (e: any) {
      toast.error(`นำเข้าไม่สำเร็จ: ${e?.message ?? "error"}`);
    } finally {
      setImporting(false);
    }
  };

  const withContacts = leads.filter((l) => l.firstName || l.lastName).length;
  const companyCount = new Set(leads.map((l) => l.companyName).filter(Boolean)).size;

  return (
    <div>
      <PageHeader title="Import Leads"
        actions={<Button size="sm" variant="outline" onClick={loadSample}><FileSpreadsheet className="h-4 w-4" /> Use sample data</Button>} />

      <div className="space-y-6 p-8">
        <div className="grid gap-4 lg:grid-cols-3">
          <label
            className="block cursor-pointer rounded-xl border-2 border-dashed border-border p-6 text-center shadow-soft transition hover:border-fresco/40 lg:col-span-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
          >
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
            <Upload className="mx-auto h-10 w-10 text-fresco" />
            <p className="mt-3 font-medium">คลิกเพื่ออัปโหลด</p>
          </label>

          <Card className="p-5 shadow-soft">
            <p className="text-sm font-semibold">Paste a list</p>
            <textarea
              rows={5}
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              className="mt-2 w-full rounded-lg border border-input bg-white p-2 text-sm focus:border-fresco focus:outline-none focus:ring-2 focus:ring-lake/30"
              placeholder={"Firstname, Company, Email\nสมชาย, Pay Solution, somchai@x.com"}
            />
            <Button size="sm" variant="outline" className="mt-2 w-full" onClick={parsePasted}>Parse</Button>
          </Card>
        </div>

        {/* Column mapping — spreadsheet-style table */}
        {raw && leads.length === 0 && (
          <Card className="overflow-hidden shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-slate-50/60 px-4 py-3">
              <div>
                <p className="text-sm font-semibold">แมปคอลัมน์ — เลือกหัวคอลัมน์จาก dropdown ด้านบนแต่ละช่อง</p>
                <p className="text-xs text-muted-foreground">แสดงตัวอย่าง {Math.min(raw.data.length, 8)} จาก {raw.data.length} แถว · ต้องมีอย่างน้อย 1 คอลัมน์เป็น "ชื่อผู้ติดต่อ" หรือ "ชื่อบริษัท"</p>
              </div>
              <div className="flex items-center gap-2">
                <Button className="bg-fresco hover:bg-fresco/90" onClick={applyMapping}>
                  <CheckCircle2 className="h-4 w-4" /> ยืนยัน → ดูตัวอย่าง
                </Button>
                <Button variant="outline" onClick={() => { setRaw(null); setMapping([]); }}>ยกเลิก</Button>
              </div>
            </div>
            <div className="max-h-[460px] overflow-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-border align-top">
                    {raw.headers.map((h, i) => {
                      const used = (mapping[i] ?? "ignore") !== "ignore";
                      return (
                        <th key={i} className={cn("min-w-[180px] border-r border-border/50 p-2 text-left", used ? "bg-fresco/5" : "bg-slate-50/40")}>
                          <p className="mb-1 truncate text-xs font-semibold text-foreground" title={h}>{h}</p>
                          <select
                            value={mapping[i] ?? "ignore"}
                            onChange={(e) => setColMap(i, e.target.value)}
                            className={cn(
                              "h-8 w-full rounded-md border bg-white px-2 text-xs focus:border-fresco focus:outline-none focus:ring-2 focus:ring-lake/30",
                              used ? "border-fresco/40 font-medium text-fresco" : "border-input text-muted-foreground",
                            )}
                          >
                            {FIELD_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {raw.data.slice(0, 8).map((row, ri) => (
                    <tr key={ri} className="border-b border-border/40 hover:bg-slate-50/50">
                      {raw.headers.map((_, ci) => (
                        <td
                          key={ci}
                          className={cn("max-w-[220px] truncate border-r border-border/30 px-2 py-1.5 text-xs", (mapping[ci] ?? "ignore") === "ignore" ? "text-muted-foreground/50" : "text-foreground")}
                          title={row[ci]}
                        >
                          {row[ci] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Preview + import */}
        {leads.length > 0 && (
          <Card className="overflow-hidden shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-slate-50/60 px-4 py-3">
              <p className="text-sm font-medium">
                {leads.length} แถว · <Users className="inline h-3.5 w-3.5" /> {withContacts} ผู้ติดต่อ · {companyCount} บริษัท
              </p>
              <div className="flex items-center gap-2">
                {raw && (
                  <Button size="sm" variant="outline" onClick={() => setLeads([])}>
                    <ArrowLeft className="h-4 w-4" /> แมปคอลัมน์ใหม่
                  </Button>
                )}
                <Button size="sm" className="bg-fresco hover:bg-fresco/90" onClick={doImport} disabled={importing}>
                  <CheckCircle2 className="h-4 w-4" /> {importing ? "กำลังนำเข้า…" : "นำเข้า CRM"}
                </Button>
              </div>
            </div>
            <div className="max-h-[480px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2">ผู้ติดต่อ</th>
                    <th className="px-4 py-2">บริษัท</th>
                    <th className="px-4 py-2">อีเมล</th>
                    <th className="px-4 py-2">เบอร์โทร</th>
                    <th className="px-4 py-2">ตำแหน่ง</th>
                    <th className="px-4 py-2">บทบาท</th>
                    <th className="px-4 py-2">ประเภท</th>
                    <th className="px-4 py-2">อุตสาหกรรม</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l, i) => (
                    <tr key={i} className="border-b border-border/60">
                      <td className="px-4 py-2 font-medium">{[l.firstName, l.lastName].filter(Boolean).join(" ") || "—"}</td>
                      <td className="px-4 py-2">{l.companyName || "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{l.email || "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{l.phone || "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{l.jobTitle || "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{l.role || "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{l.companyType || "—"}</td>
                      <td className="px-4 py-2 text-muted-foreground">{l.industry || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-1.5 border-t border-border bg-fresco/5 p-4 text-sm text-fresco">
              <CheckCircle2 className="h-4 w-4" /> บริษัทซ้ำจะถูกรวมอัตโนมัติ · ผู้ติดต่อจะถูกผูกกับบริษัท · source = "Bulk Import"
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
