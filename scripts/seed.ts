// Seed Supabase with the existing mock data.
// Run from the project root:
//   node --env-file=.env --experimental-strip-types scripts/seed.ts
//
// Idempotent: clears the tables first, then re-inserts. Order respects FKs.
import { getSupabaseAdmin } from "../src/lib/supabase.server.ts";
import {
  COMPANIES,
  CONTACTS,
  SCREENS,
  DEALS,
  ACTIVITIES,
} from "../src/lib/mock-data.ts";
import {
  companyToRow,
  contactToRow,
  screenToRow,
  dealToRow,
  activityToRow,
} from "../src/lib/db-mappers.ts";

const db = getSupabaseAdmin();

async function clearAll() {
  // reverse FK order
  for (const table of ["activities", "deals", "contacts", "screens", "companies"]) {
    const { error } = await db.from(table).delete().neq("id", "___none___");
    if (error) throw new Error(`clear ${table}: ${error.message}`);
  }
  console.log("✓ cleared existing rows");
}

async function insert(table: string, rows: any[]) {
  const { error } = await db.from(table).insert(rows);
  if (error) throw new Error(`insert ${table}: ${error.message}`);
  console.log(`✓ inserted ${rows.length} ${table}`);
}

async function main() {
  await clearAll();
  await insert("companies", COMPANIES.map(companyToRow));
  await insert("contacts", CONTACTS.map(contactToRow));
  await insert("screens", SCREENS.map(screenToRow));
  await insert("deals", DEALS.map(dealToRow));
  await insert("activities", ACTIVITIES.map(activityToRow));
  console.log("\n🎉 Seed complete.");
}

main().catch((e) => {
  console.error("\n❌ Seed failed:", e.message);
  process.exit(1);
});
