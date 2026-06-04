import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/crm/page-header";
import { AIPanel } from "@/components/crm/ai-panel";
import { TierBadge, AIClassBadge } from "@/components/crm/badges";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Sparkles, CheckCircle2, FileSpreadsheet, Eye } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/leads/import")({
  head: () => ({ meta: [{ title: "Import Leads — Tathep CRM" }] }),
  component: ImportPage,
});

type Row = {
  name: string;
  province: string;
  industry: string;
  enriched?: boolean;
  loading?: boolean;
  tier?: "Platinum" | "Gold" | "Silver" | "Bronze";
  aiClass?: "Hot" | "Warm" | "Cold" | "Agency Upsell";
  summary?: string;
  approach?: string;
};

const SAMPLE: Row[] = [
  { name: "ร้านอาหารส้มตำคุณยาย", province: "นนทบุรี", industry: "F&B" },
  { name: "Solar Solutions Co., Ltd.", province: "ชลบุรี", industry: "Energy" },
  { name: "Bloom Dental Clinic", province: "ภูเก็ต", industry: "Healthcare" },
  { name: "Urban Loft Real Estate", province: "กรุงเทพมหานคร", industry: "Real Estate" },
  { name: "ToyZone Kids Store", province: "นครสวรรค์", industry: "Retail" },
  { name: "PowerGym ฟิตเนส", province: "เพชรบุรี", industry: "Health & Fitness" },
];

const TIERS = ["Platinum", "Gold", "Silver", "Bronze"] as const;
const CLASSES = ["Hot", "Warm", "Cold", "Agency Upsell"] as const;

function ImportPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [enriching, setEnriching] = useState(false);

  const loadSample = () => setRows(SAMPLE.map((r) => ({ ...r })));

  const enrich = () => {
    if (!rows.length) { toast.error("กรุณาอัปโหลด CSV หรือ paste รายชื่อก่อน"); return; }
    setEnriching(true);
    setRows((rs) => rs.map((r) => ({ ...r, loading: true })));
    rows.forEach((_, i) => {
      setTimeout(() => {
        setRows((rs) =>
          rs.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  loading: false,
                  enriched: true,
                  tier: TIERS[Math.floor(Math.random() * TIERS.length)],
                  aiClass: CLASSES[Math.floor(Math.random() * CLASSES.length)],
                  summary: `${r.name} เป็นธุรกิจใน ${r.province} กำลังขยายตัว — โอกาส DOOH ในพื้นที่ใกล้เคียง`,
                  approach: "เริ่มด้วย LINE OA + ส่ง portfolio screens ในจังหวัด",
                }
              : r,
          ),
        );
        if (i === rows.length - 1) {
          setEnriching(false);
          toast.success("น้องตาเทพ enriched leads แล้ว ✨");
        }
      }, 350 * (i + 1));
    });
  };

  return (
    <div>
      <PageHeader title="Import Leads" subtitle="✨ Upload + AI Enrichment ด้วยน้องตาเทพ"
        actions={<Button size="sm" variant="outline" onClick={loadSample}><FileSpreadsheet className="h-4 w-4" /> Use sample data</Button>} />

      <div className="space-y-6 p-8">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-dashed border-2 border-border p-6 text-center shadow-soft hover:border-fresco/40 cursor-pointer transition lg:col-span-2"
            onClick={loadSample}>
            <Upload className="mx-auto h-10 w-10 text-fresco" />
            <p className="mt-3 font-medium">Drop CSV here or click to upload</p>
            <p className="mt-1 text-xs text-muted-foreground">รองรับ CSV ที่มี columns: name, province, industry</p>
          </Card>

          <Card className="p-5 shadow-soft">
            <p className="text-sm font-semibold">Paste a list</p>
            <p className="text-xs text-muted-foreground">วาง 1 บริษัทต่อบรรทัด</p>
            <textarea
              rows={5}
              className="mt-2 w-full rounded-lg border border-input bg-white p-2 text-sm focus:border-fresco focus:outline-none focus:ring-2 focus:ring-lake/30"
              placeholder={"ร้านกาแฟดาวฤกษ์\nคลินิกผิวสะอาด\n..."}
            />
            <Button size="sm" variant="outline" className="mt-2 w-full" onClick={loadSample}>Parse</Button>
          </Card>
        </div>

        {rows.length > 0 && (
          <Card className="overflow-hidden shadow-soft">
            <div className="flex items-center justify-between border-b border-border bg-slate-50/60 px-4 py-3">
              <p className="text-sm font-medium">{rows.length} rows parsed</p>
              <Button size="sm" onClick={enrich} disabled={enriching} className="bg-gradient-brand text-white hover:opacity-90">
                <Sparkles className="h-4 w-4" /> {enriching ? "น้องตาเทพ enriching…" : "Enrich with AI"}
              </Button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2">Company</th>
                  <th className="px-4 py-2">Province</th>
                  <th className="px-4 py-2">Industry</th>
                  <th className="px-4 py-2">AI Tier</th>
                  <th className="px-4 py-2">Class</th>
                  <th className="px-4 py-2">AI Summary</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.province}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.industry}</td>
                    <td className="px-4 py-3">
                      {r.loading ? <span className="inline-block h-4 w-16 animate-pulse rounded bg-fresco/20" />
                        : r.tier ? <TierBadge tier={r.tier} /> : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {r.loading ? <span className="inline-block h-4 w-20 animate-pulse rounded bg-fresco/20" />
                        : r.aiClass ? <AIClassBadge value={r.aiClass} /> : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.loading ? <span className="inline-block h-4 w-48 animate-pulse rounded bg-fresco/20" />
                        : r.summary || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.some((r) => r.enriched) && (
              <div className="flex items-center justify-between border-t border-border bg-fresco/5 p-4">
                <p className="flex items-center gap-1.5 text-sm text-fresco"><CheckCircle2 className="h-4 w-4" /> Ready to import as Prospect with source "Bulk Import"</p>
                <Button className="bg-fresco hover:bg-fresco/90" onClick={() => toast.success(`Imported ${rows.length} companies to /companies`)}>
                  Import to Companies
                </Button>
              </div>
            )}
          </Card>
        )}

        <AIPanel subtitle="Lead Discovery · Coming soon">
          <div className="flex items-start gap-3">
            <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg bg-white/60")}>
              <Eye className="h-5 w-5 text-fresco" />
            </div>
            <div>
              <p className="font-medium text-fresco">AI หา Lead</p>
              <p className="mt-0.5">ค้นหา lead ใหม่อัตโนมัติจาก Google Maps, Facebook, Instagram & TikTok — เปิดในเร็วๆ นี้</p>
            </div>
          </div>
        </AIPanel>
      </div>
    </div>
  );
}
