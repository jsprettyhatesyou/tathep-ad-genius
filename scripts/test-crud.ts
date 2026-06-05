// End-to-end CRUD test against the real Supabase DB via the actual server
// functions (validates mappers + columns). Run:
//   node --env-file=.env --experimental-strip-types scripts/test-crud.ts
import { getSupabaseAdmin } from "../src/lib/supabase.server.ts";
import { companyToRow, contactToRow, dealToRow, activityToRow } from "../src/lib/db-mappers.ts";

const db = getSupabaseAdmin();
const ok = (m: string) => console.log("✓", m);

async function main() {
  // CREATE company
  const { data: co, error: e1 } = await db.from("companies")
    .insert(companyToRow({ name: "__TEST__ Acme", type: "Direct Client", status: "Prospect", tier: "Gold", aiClass: "Warm", leadScore: 60, industry: "F&B", province: "ภูเก็ต", size: "11-50", source: "Outbound", annualBudget: "200K–500K THB", assignedTo: "ปิยะ", website: "", summary: "test", totalDealValue: 0, lastActivity: "now", subType: "SME", tags: [] }))
    .select("*").single();
  if (e1) throw new Error("createCompany: " + e1.message);
  ok(`createCompany id=${co.id}`);

  // UPDATE company
  const { error: e2 } = await db.from("companies").update(companyToRow({ tier: "Platinum", leadScore: 95 })).eq("id", co.id);
  if (e2) throw new Error("updateCompany: " + e2.message);
  ok("updateCompany tier->Platinum");

  // CREATE contact under company
  const { data: ct, error: e3 } = await db.from("contacts")
    .insert(contactToRow({ name: "__TEST__ Contact", companyId: co.id, jobTitle: "CEO", roleType: "Decision Maker", phone: "0810000000", lineId: "@t", email: "t@t.com", preferred: "LINE", status: "Active", assignedTo: "ปิยะ", lastContacted: "now" }))
    .select("*").single();
  if (e3) throw new Error("createContact: " + e3.message);
  ok(`createContact id=${ct.id} (companyId=${ct.company_id})`);

  // CREATE deal linked to company+contact
  const { data: d, error: e4 } = await db.from("deals")
    .insert(dealToRow({ name: "__TEST__ Deal", companyId: co.id, contactId: ct.id, clientType: "Direct Client", stage: "New Lead", value: 123000, tier: "Gold", aiClass: "Warm", priority: "High", campaignType: "Brand Awareness", duration: "1 Month", probability: 40, expectedClose: "2026-07-01", nextFollowUp: "2026-06-10", notes: "n", screens: [] }))
    .select("*").single();
  if (e4) throw new Error("createDeal: " + e4.message);
  ok(`createDeal id=${d.id} value=${d.value}`);

  // UPDATE deal stage
  const { error: e5 } = await db.from("deals").update({ stage: "Won" }).eq("id", d.id);
  if (e5) throw new Error("updateDealStage: " + e5.message);
  ok("updateDealStage ->Won");

  // CREATE activity linked
  const { data: a, error: e6 } = await db.from("activities")
    .insert(activityToRow({ type: "Call", title: "__TEST__ Activity", status: "Planned", date: "2026-06-10T10:00", companyId: co.id, contactId: ct.id, dealId: d.id, assignedTo: "ปิยะ", summary: "s", nextAction: "x" }))
    .select("*").single();
  if (e6) throw new Error("createActivity: " + e6.message);
  ok(`createActivity id=${a.id}`);

  // CLEANUP (delete in FK order)
  await db.from("activities").delete().eq("id", a.id);
  await db.from("deals").delete().eq("id", d.id);
  await db.from("contacts").delete().eq("id", ct.id);
  await db.from("companies").delete().eq("id", co.id);
  ok("cleanup: deleted activity, deal, contact, company");

  console.log("\n🎉 Full CRUD round-trip passed — mappers & columns all valid.");
}

main().catch((e) => { console.error("\n❌", e.message); process.exit(1); });
