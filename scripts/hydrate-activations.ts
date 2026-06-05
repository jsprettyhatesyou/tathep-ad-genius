// Hydrate existing campaigns into activation workflow:
// build screens_plan/influencers_plan from screen_ids/influencer_ids + default tasks.
// Run AFTER supabase/migration_activation_ops.sql:
//   node --env-file=.env --experimental-strip-types scripts/hydrate-activations.ts
import { getSupabaseAdmin } from "../src/lib/supabase.server.ts";
import { buildScreensPlan, buildInfluencersPlan, generateDefaultTasks } from "../src/lib/activation.ts";

const db = getSupabaseAdmin();

async function main() {
  const { data: scr } = await db.from("screens").select("id,name,province");
  const screensMin = (scr ?? []).map((s: any) => ({ id: s.id, name: s.name, province: s.province }));
  const { data: inf } = await db.from("influencers").select("id,name,platform,category,province,followers,rate_card");
  const infMin = (inf ?? []).map((i: any) => ({ id: i.id, name: i.name, platform: i.platform, category: i.category, province: i.province, followers: i.followers, rateCard: i.rate_card }));

  const { data: camps } = await db.from("campaigns").select("id,start_date,end_date,owner,screen_ids,influencer_ids,screens_plan,influencers_plan,tasks");
  for (const c of camps ?? []) {
    const patch: any = {};
    if (!(c.screens_plan?.length) && c.screen_ids?.length) patch.screens_plan = buildScreensPlan(c.screen_ids, screensMin, c.start_date ?? "", c.end_date ?? "", []);
    if (!(c.influencers_plan?.length) && c.influencer_ids?.length) patch.influencers_plan = buildInfluencersPlan(c.influencer_ids, infMin, []);
    if (!(c.tasks?.length)) patch.tasks = generateDefaultTasks(c.start_date ?? "", c.end_date ?? "", c.owner ?? "");
    if (Object.keys(patch).length) {
      const { error } = await db.from("campaigns").update(patch).eq("id", c.id);
      if (error) throw new Error(`${c.id}: ${error.message}`);
      console.log(`✓ hydrated ${c.id}: ${Object.keys(patch).join(", ")}`);
    } else {
      console.log(`· ${c.id} already hydrated`);
    }
  }
  console.log("\n🎉 hydrate complete");
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
