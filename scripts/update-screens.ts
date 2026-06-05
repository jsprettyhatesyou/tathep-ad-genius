// Update the 9 screens with real billboard data from platform-admin.
// Run AFTER applying supabase/migration_screens.sql:
//   node --env-file=.env --experimental-strip-types scripts/update-screens.ts
import { getSupabaseAdmin } from "../src/lib/supabase.server.ts";

const db = getSupabaseAdmin();

// Pricing: 0.25 THB/sec everywhere, except these three at 1 THB/sec
const PREMIUM = new Set(["แยกพัทยาเหนือ", "แยกเทพประสิทธิ์", "ถนนเทพคุณากร"]);

const SCREENS = [
  { name: "แลนด์มาร์คราชพฤกษ์", code: "BB001",   size: "8x5 m",  resolution: "1920x1080", province: "นนทบุรี",    address: "ถนน ราชพฤกษ์ ตำบล บางพลับ อำเภอปากเกร็ด นนทบุรี 11120", lat: 13.906829165163686, lng: 100.45001558871934 },
  { name: "แยกพงษ์เพชร",        code: "BBQU358", size: "9x6 m",  resolution: "1080x720",  province: "นนทบุรี",    address: "บางเขน อำเภอเมืองนนทบุรี นนทบุรี", lat: 13.856338320218924, lng: 100.54495551354968 },
  { name: "แยกเดชาติวงศ์",      code: "BBKC841", size: "9x8 m",  resolution: "1080x960",  province: "นครสวรรค์",  address: "ปากน้ำโพ อำเภอเมืองนครสวรรค์ นครสวรรค์ 60000", lat: 15.693124918434066, lng: 100.12269224711446 },
  { name: "สี่แยกชะอำ",          code: "BB3A647", size: "3x2 m",  resolution: "1920x1080", province: "เพชรบุรี",   address: "ชะอำ เพชรบุรี", lat: 12.797980589099296, lng: 99.97196050761812 },
  { name: "แลนด์มาร์คมหาชัย",    code: "BBF1920", size: "4x7 m",  resolution: "352x672",   province: "สมุทรสาคร",  address: "มหาชัย สมุทรสาคร", lat: 13.547868523080467, lng: 100.28084288832514 },
  { name: "แยกรร.ดาวรุ่ง",       code: "BBLQ431", size: "9x5 m",  resolution: "896x480",   province: "ภูเก็ต",     address: "สี่แยก รร.ดาวรุ่ง ถ.เจ้าฟ้าตะวันออก ต.วิชิต อ.เมือง จ.ภูเก็ต", lat: 7.870088210087502, lng: 98.37493757339364 },
  { name: "แยกเทพประสิทธิ์",     code: "BB68996", size: "14x6 m", resolution: "1920x1080", province: "ชลบุรี",     address: "ซ. สุริยา เมืองพัทยา อำเภอบางละมุง ชลบุรี 20150", lat: 12.90905592236136, lng: 100.896277885679 },
  { name: "แยกพัทยาเหนือ",       code: "BBRV727", size: "10x5 m", resolution: "1920x1080", province: "ชลบุรี",     address: "ถนน พัทยาเหนือ เมืองพัทยา อำเภอบางละมุง ชลบุรี 20150", lat: 12.948417626842796, lng: 100.90570857174488 },
  { name: "ถนนเทพคุณากร",        code: "BBSO909", size: "10x6 m", resolution: "1920x1080", province: "ฉะเชิงเทรา", address: "ถนน เทพคุณากร ตำบลหน้าเมือง อำเภอเมืองฉะเชิงเทรา ฉะเชิงเทรา 24000", lat: 13.673376272498786, lng: 101.06299813130084 },
];

async function main() {
  for (const s of SCREENS) {
    const ratePerSecond = PREMIUM.has(s.name) ? 1 : 0.25;
    const { data, error } = await db
      .from("screens")
      .update({
        code: s.code,
        size: s.size,
        resolution: s.resolution,
        province: s.province,
        address: s.address,
        lat: s.lat,
        lng: s.lng,
        rate_per_second: ratePerSecond,
      })
      .eq("name", s.name)
      .select("id,name");
    if (error) throw new Error(`${s.name}: ${error.message}`);
    console.log(`✓ ${s.name} [${s.code}] · ${s.size} · ${s.resolution} · ${ratePerSecond}฿/วิ · ${data?.length ? "updated" : "NOT FOUND"}`);
  }
  console.log("\n🎉 อัปเดตข้อมูลป้ายจริงครบแล้ว");
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });
