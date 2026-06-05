// Seed influencers + enrich campaigns into Brand Activations.
// Run AFTER supabase/migration_activations.sql:
//   node --env-file=.env --experimental-strip-types scripts/seed-activations.ts
import { getSupabaseAdmin } from "../src/lib/supabase.server.ts";

const db = getSupabaseAdmin();

const INFLUENCERS = [
  { id: "inf-1", name: "Bank Content Shifu", platform: "TikTok", followers: 300000, category: "Marketing", province: "กรุงเทพมหานคร", rate_card: "30,000 บาท/คลิป", avg_views: 250000, engagement_rate: 6.5, content_status: "Published", brands_worked_with: ["TT Mart", "Dermaglow"] },
  { id: "inf-2", name: "HuaHinFoodReview", platform: "Instagram", followers: 180000, category: "Food", province: "ประจวบคีรีขันธ์", rate_card: "15,000 บาท/โพสต์", avg_views: 90000, engagement_rate: 8.2, content_status: "In Progress", brands_worked_with: ["ครัวกัปตัน"] },
  { id: "inf-3", name: "ChaAmTravel", platform: "TikTok", followers: 220000, category: "Travel", province: "เพชรบุรี", rate_card: "20,000 บาท/คลิป", avg_views: 150000, engagement_rate: 7.1, content_status: "Briefed", brands_worked_with: [] },
  { id: "inf-4", name: "PattayaNightlifeTH", platform: "TikTok", followers: 410000, category: "Entertainment", province: "ชลบุรี", rate_card: "45,000 บาท/คลิป", avg_views: 380000, engagement_rate: 9.0, content_status: "Published", brands_worked_with: ["Big Bang Events"] },
  { id: "inf-5", name: "BeautyByNamwanTH", platform: "Instagram", followers: 540000, category: "Beauty", province: "กรุงเทพมหานคร", rate_card: "60,000 บาท/โพสต์", avg_views: 300000, engagement_rate: 5.8, content_status: "Idle", brands_worked_with: ["Dermaglow"] },
  { id: "inf-6", name: "PhuketEatsPro", platform: "YouTube", followers: 95000, category: "Food", province: "ภูเก็ต", rate_card: "25,000 บาท/วิดีโอ", avg_views: 60000, engagement_rate: 6.0, content_status: "Idle", brands_worked_with: [] },
];

async function main() {
  // 1) influencers (idempotent)
  await db.from("influencers").delete().like("id", "inf-%");
  const { error: e1 } = await db.from("influencers").insert(INFLUENCERS);
  if (e1) throw new Error("influencers: " + e1.message);
  console.log(`✓ inserted ${INFLUENCERS.length} influencers`);

  // 2) screen name -> id map
  const { data: screens } = await db.from("screens").select("id,name");
  const sid = (name: string) => (screens ?? []).find((s: any) => s.name === name)?.id;

  // 3) enrich campaigns
  const updates: Record<string, any> = {
    cm1: { objective: "Brand Awareness", influencer_ids: ["inf-5", "inf-1"], screen_ids: [sid("แลนด์มาร์คราชพฤกษ์"), sid("แยกพงษ์เพชร")].filter(Boolean), content_pieces: 5, billboard_reach: 4250000, influencer_views: 620000, social_engagement: 85000, store_visits: 3200, qr_scans: 1800, revenue: 920000, renewal_reasons: ["Engagement สูงกว่าค่าเฉลี่ย", "Reach เกินเป้า 18%", "ลูกค้า feedback เชิงบวก"] },
    cm2: { objective: "Drive Store Visits", influencer_ids: ["inf-1"], screen_ids: [sid("แยกพงษ์เพชร"), sid("แลนด์มาร์คราชพฤกษ์")].filter(Boolean), content_pieces: 3, billboard_reach: 1180000, influencer_views: 250000, social_engagement: 32000, store_visits: 5400, qr_scans: 3100, revenue: 195000, renewal_reasons: ["Store visits พุ่ง 28% ช่วงแคมเปญ", "QR scans สูง"] },
    cm3: { objective: "Launch Product", influencer_ids: ["inf-6"], screen_ids: [sid("แยกรร.ดาวรุ่ง")].filter(Boolean), content_pieces: 2, billboard_reach: 3120000, influencer_views: 110000, social_engagement: 21000, store_visits: 900, qr_scans: 1200, revenue: 540000, renewal_reasons: ["Awareness โครงการดีมาก", "ปิดการขายเฟสแรกเร็ว"] },
    cm4: { objective: "Launch Product", influencer_ids: ["inf-1"], screen_ids: [sid("แยกพงษ์เพชร")].filter(Boolean), content_pieces: 0, billboard_reach: 0, influencer_views: 0, social_engagement: 0, store_visits: 0, qr_scans: 0, revenue: 0, renewal_reasons: [] },
    cm5: { objective: "Brand Awareness", influencer_ids: ["inf-2", "inf-3"], screen_ids: [sid("สี่แยกชะอำ")].filter(Boolean), content_pieces: 4, billboard_reach: 1450000, influencer_views: 240000, social_engagement: 41000, store_visits: 1100, qr_scans: 800, revenue: 295000, renewal_reasons: ["กลุ่มนักท่องเที่ยวตอบรับดี"] },
  };
  for (const [id, patch] of Object.entries(updates)) {
    const { data, error } = await db.from("campaigns").update(patch).eq("id", id).select("id");
    if (error) throw new Error(`campaign ${id}: ${error.message}`);
    console.log(`✓ campaign ${id} ${data?.length ? "enriched" : "NOT FOUND"}`);
  }
  console.log("\n🎉 Brand Activations seeded.");
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
