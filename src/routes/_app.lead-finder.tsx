import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/crm/page-header";
import { AIPanel } from "@/components/crm/ai-panel";
import { TierBadge, AIClassBadge, ScoreChip } from "@/components/crm/badges";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, Globe, Facebook, Instagram, MapPin, Building2, Plus, Save, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/lead-finder")({
  head: () => ({ meta: [{ title: "Lead Finder — Tathep CRM" }] }),
  component: LeadFinderPage,
});

const SMART_LISTS = [
  { icon: "🔥", label: "Hot Leads This Week", n: 24 },
  { icon: "🏢", label: "Agencies & Media Buyers", n: 18 },
  { icon: "🚀", label: "Fast Growing Businesses", n: 12 },
  { icon: "🏪", label: "New Store Openings", n: 9 },
  { icon: "🎉", label: "Event & Festival Opportunities", n: 7 },
  { icon: "💰", label: "High Budget Prospects", n: 15 },
  { icon: "📈", label: "Competitor Advertisers", n: 11 },
];

type Lead = {
  name: string; industry: string; province: string; website: string; facebook: string;
  phone: string; locations: number; budget: string; score: number; doohScore: number;
  tier: "Platinum" | "Gold" | "Silver" | "Bronze"; cls: "Hot" | "Warm" | "Cold" | "Agency Upsell";
};

const SAMPLE_LEADS: Lead[] = [
  { name: "Sushi Hokkaido Premium", industry: "F&B", province: "กรุงเทพมหานคร", website: "sushihokkaido.co.th", facebook: "@sushihokkaido", phone: "02-555-1122", locations: 8, budget: "200K–500K", score: 84, doohScore: 91, tier: "Platinum", cls: "Hot" },
  { name: "Bright Smile Dental Group", industry: "Healthcare", province: "นนทบุรี", website: "brightsmile.co.th", facebook: "@brightsmile", phone: "02-444-9988", locations: 5, budget: "100K–500K", score: 78, doohScore: 86, tier: "Gold", cls: "Hot" },
  { name: "EVCharge Solutions", industry: "Energy", province: "ชลบุรี", website: "evcharge.th", facebook: "@evcharge.th", phone: "081-222-3344", locations: 12, budget: "500K+", score: 88, doohScore: 82, tier: "Platinum", cls: "Hot" },
  { name: "Cafe Lumière", industry: "F&B", province: "ภูเก็ต", website: "lumiere.cafe", facebook: "@lumierecafe", phone: "076-555-7788", locations: 2, budget: "10K–50K", score: 56, doohScore: 64, tier: "Silver", cls: "Warm" },
  { name: "Maxima Media Agency", industry: "Advertising", province: "กรุงเทพมหานคร", website: "maxima.media", facebook: "@maximamedia", phone: "02-111-3344", locations: 1, budget: "500K+", score: 81, doohScore: 78, tier: "Platinum", cls: "Agency Upsell" },
  { name: "PetPark Pet Shop", industry: "Retail", province: "นครสวรรค์", website: "petpark.shop", facebook: "@petpark.shop", phone: "056-222-1144", locations: 3, budget: "50K–100K", score: 62, doohScore: 71, tier: "Gold", cls: "Warm" },
];

function LeadFinderPage() {
  const [query, setQuery] = useState("Restaurants in Bangkok");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Lead[]>([]);

  const find = () => {
    setSearching(true);
    setResults([]);
    setTimeout(() => { setResults(SAMPLE_LEADS); setSearching(false); toast.success("Found 6 leads"); }, 1400);
  };

  return (
    <div>
      <PageHeader title="Lead Finder" subtitle="🚀 AI Lead Discovery — Apollo + Clay + Google Maps สำหรับ DOOH" />
      <div className="space-y-6 p-8">
        {/* Search */}
        <Card className="p-5 shadow-soft bg-gradient-ai border-fresco/20">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fresco" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Dental Clinics in Nonthaburi"
                className="h-11 w-full rounded-lg border border-fresco/30 bg-white pl-9 pr-3 text-sm focus:border-fresco focus:outline-none focus:ring-2 focus:ring-lake/30"
              />
            </div>
            <Button onClick={find} disabled={searching} className="bg-gradient-brand text-white h-11 px-6 hover:opacity-90">
              <Sparkles className="h-4 w-4" /> {searching ? "Searching…" : "Find Leads"}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
            {["Restaurants in Bangkok", "Cafes near Universities", "Hotels in Pattaya", "Car Dealerships in Chonburi", "Real Estate in Chiang Mai"].map((s) => (
              <button key={s} onClick={() => setQuery(s)} className="rounded-full bg-white/70 px-2.5 py-1 text-fresco hover:bg-white">{s}</button>
            ))}
          </div>
          {searching && (
            <div className="mt-4 space-y-1.5 rounded-lg bg-white/70 p-3 text-xs text-fresco">
              <p className="animate-pulse">⌕ Searching businesses…</p>
              <p className="animate-pulse">📊 Analyzing social media…</p>
              <p className="animate-pulse">🎯 Calculating DOOH Fit Score…</p>
              <p className="animate-pulse">✨ Generating recommendations…</p>
            </div>
          )}
        </Card>

        {/* Smart Lists */}
        <div>
          <h2 className="mb-3 text-sm font-semibold">Smart Lists</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {SMART_LISTS.map((l) => (
              <Card key={l.label} className="flex items-center justify-between p-3 text-sm shadow-soft hover:border-fresco/40 cursor-pointer transition">
                <span><span className="mr-1">{l.icon}</span>{l.label}</span>
                <span className="rounded-full bg-fresco/10 px-2 py-0.5 text-xs font-semibold text-fresco">{l.n}</span>
              </Card>
            ))}
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-2">
            {results.map((l, i) => (
              <Card key={i} className="p-5 shadow-soft transition hover:shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-fresco/10 text-fresco"><Building2 className="h-5 w-5" /></div>
                    <div>
                      <p className="font-semibold">{l.name}</p>
                      <p className="text-xs text-muted-foreground">{l.industry} · <MapPin className="inline h-3 w-3" /> {l.province} · {l.locations} locations</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <TierBadge tier={l.tier} />
                    <AIClassBadge value={l.cls} />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Lead Score</p>
                    <ScoreChip score={l.score} />
                  </div>
                  <div>
                    <p className="text-muted-foreground">DOOH Fit Score</p>
                    <ScoreChip score={l.doohScore} />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{l.website}</span>
                  <span className="flex items-center gap-1"><Facebook className="h-3 w-3" />{l.facebook}</span>
                  <span>{l.phone}</span>
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">฿{l.budget}</span>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1"><Save className="h-3.5 w-3.5" /> Save</Button>
                  <Button size="sm" variant="outline" className="flex-1"><Plus className="h-3.5 w-3.5" /> Add to CRM</Button>
                  <Button size="sm" className="flex-1 bg-gradient-brand text-white hover:opacity-90"><Zap className="h-3.5 w-3.5" /> Strategy</Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <AIPanel subtitle="AI Sales Strategy · Top Lead" onGenerate={() => {}}>
            <div className="space-y-2">
              <p><b>Pitch:</b> Sushi Hokkaido เพิ่งเปิดสาขาที่ 8 ใน Emporium — DOOH ใน CBD จะ amplify การเปิดตัว reach 158K/วัน</p>
              <p><b>Campaign idea:</b> 2-week launch burst ที่แยกพงษ์เพชร + แลนด์มาร์คราชพฤกษ์</p>
              <p><b>Budget:</b> ฿180,000 (test) → upsell 3-month monthly retainer</p>
              <p><b>LINE outreach:</b> "สวัสดีครับ พอดีเห็นว่า Sushi Hokkaido เพิ่งเปิดสาขาใหม่ — เรามี DOOH inventory ในย่านที่ตรงกับ traffic ลูกค้า อยากแชร์ insight 15 นาทีไหมครับ?"</p>
            </div>
          </AIPanel>
        )}
      </div>
    </div>
  );
}
