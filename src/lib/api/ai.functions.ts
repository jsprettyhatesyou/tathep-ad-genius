import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSupabaseAdmin } from "../supabase.server";
import { rowToCompany, rowToContact, rowToDeal, rowToScreen, rowToCampaign, rowToInfluencer } from "../db-mappers";
import { tathepText, tathepJSON, tathepChat } from "../claude.server";
import { enrichPhones, placesEnabled } from "../places.server";

const fmtTHB = (n: number) => new Intl.NumberFormat("th-TH").format(n);

// Gather company + its contacts/deals for context.
async function loadCompanyContext(companyId: string) {
  const db = getSupabaseAdmin();
  const [{ data: co }, { data: contacts }, { data: deals }] = await Promise.all([
    db.from("companies").select("*").eq("id", companyId).single(),
    db.from("contacts").select("*").eq("company_id", companyId),
    db.from("deals").select("*").eq("company_id", companyId),
  ]);
  if (!co) throw new Error("ไม่พบบริษัทนี้");
  return {
    company: rowToCompany(co),
    contacts: (contacts ?? []).map(rowToContact),
    deals: (deals ?? []).map(rowToDeal),
  };
}

function companyBrief(c: any, contacts: any[], deals: any[]) {
  return [
    `บริษัท: ${c.name}`,
    `ประเภท: ${c.type} / ${c.subType} · อุตสาหกรรม: ${c.industry} · จังหวัด: ${c.province} · ขนาด: ${c.size}`,
    `สถานะ: ${c.status} · Tier ปัจจุบัน: ${c.tier} · AI Class: ${c.aiClass} · Lead Score: ${c.leadScore}/100`,
    `งบโฆษณา/ปี: ${c.annualBudget} · มูลค่าดีลรวม: ${fmtTHB(c.totalDealValue)} บาท · แหล่งที่มา: ${c.source}`,
    c.summary ? `ข้อมูลเดิม: ${c.summary}` : "",
    contacts.length ? `ผู้ติดต่อ: ${contacts.map((p) => `${p.name} (${p.jobTitle || "-"}, ${p.roleType || "-"})`).join("; ")}` : "ยังไม่มีผู้ติดต่อในระบบ",
    deals.length ? `ดีล: ${deals.map((d) => `${d.name} [${d.stage}, ${fmtTHB(d.value)}฿]`).join("; ")}` : "ยังไม่มีดีล",
  ].filter(Boolean).join("\n");
}

/* ---------- Generate full sales strategy (markdown) ---------- */
export const generateStrategy = createServerFn({ method: "POST" })
  .inputValidator(z.object({ companyId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { company, contacts, deals } = await loadCompanyContext(data.companyId);
    const prompt = `สร้าง CRM sales card สำหรับลูกค้า Smart DOOH รายนี้ ให้ทีมขายใช้ได้ทันที

${companyBrief(company, contacts, deals)}

กติกา:
- ไม่เกิน 250 คำ
- ใช้ bullet เท่านั้น (ขึ้นต้นด้วย "- ") — ห้ามย่อหน้ายาวเกิน 1 ประโยค
- เน้น actionable + เจาะจง (ชื่อคน, ทำเล, ตัวเลข)
- ภาษาไทย

รูปแบบ output ตรงตามนี้ (ใช้ heading emoji เป๊ะ แต่ละหัวข้อมี 1-3 bullet):

🎯 Lead Quality
💡 Why This Lead
🎤 Best Pitch
👤 Recommended Contact
🚀 Campaign Idea
⚡ Next Actions
📈 Win Probability`;
    const strategy = await tathepText(prompt, 1400);
    return { strategy };
  });

/* ---------- Classify lead (structured) ---------- */
const CLASSIFY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    tier: { type: "string", enum: ["Platinum", "Gold", "Silver", "Bronze"] },
    aiClass: { type: "string", enum: ["Hot", "Warm", "Cold", "Agency Upsell"] },
    leadScore: { type: "integer" },
    reasoning: { type: "string" },
  },
  required: ["tier", "aiClass", "leadScore", "reasoning"],
};

export const classifyLead = createServerFn({ method: "POST" })
  .inputValidator(z.object({ companyId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { company, contacts, deals } = await loadCompanyContext(data.companyId);
    const prompt = `จัดระดับ lead รายนี้สำหรับธุรกิจ Smart DOOH โดยประเมินจาก: งบประมาณ, ความเหมาะกับ DOOH, คุณภาพผู้ติดต่อ (มี decision maker ไหม), โอกาสปิด และมูลค่า\n\n${companyBrief(company, contacts, deals)}\n\nคืนค่า tier (Platinum/Gold/Silver/Bronze), aiClass (Hot/Warm/Cold/Agency Upsell — ใช้ Agency Upsell ถ้าเป็น Agency), leadScore (0-100) และ reasoning สั้นๆ เป็นภาษาไทย`;
    return tathepJSON<{ tier: string; aiClass: string; leadScore: number; reasoning: string }>(prompt, CLASSIFY_SCHEMA);
  });

/* ---------- Pitch + objection handling for a deal (structured) ---------- */
const PITCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    pitch: { type: "string" },
    objections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { objection: { type: "string" }, response: { type: "string" } },
        required: ["objection", "response"],
      },
    },
    talkingPoints: { type: "array", items: { type: "string" } },
    lineOpener: { type: "string" },
  },
  required: ["pitch", "objections", "talkingPoints", "lineOpener"],
};

export const generatePitch = createServerFn({ method: "POST" })
  .inputValidator(z.object({ dealId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const db = getSupabaseAdmin();
    const { data: dealRow } = await db.from("deals").select("*").eq("id", data.dealId).single();
    if (!dealRow) throw new Error("ไม่พบดีลนี้");
    const deal = rowToDeal(dealRow);
    const { company, contacts } = await loadCompanyContext(deal.companyId);
    const { data: screenRows } = await db.from("screens").select("*").eq("availability", "Available").limit(6);
    const screens = (screenRows ?? []).map(rowToScreen);
    const prompt = `สร้าง pitch และวิธีรับมือข้อโต้แย้งสำหรับดีล Smart DOOH นี้\n\nดีล: ${deal.name} [${deal.stage}, มูลค่า ${fmtTHB(deal.value)}฿, แคมเปญ ${deal.campaignType}, ระยะ ${deal.duration}]\n${companyBrief(company, contacts, [deal])}\n\nจอที่ว่างให้เลือกแนะนำ: ${screens.map((s) => `${s.name} (${s.province}, ${s.areaType}, ${s.ratePerSecond ?? 0.25}฿/วินาที, ${fmtTHB(s.dailyImpressions)} impr./วัน)`).join("; ") || "—"}\n\nคืนค่า: pitch (ย่อหน้าเดียว เน้นมุม DOOH-as-ads), objections (3 ข้อที่ลูกค้าน่าจะถาม+ วิธีตอบ), talkingPoints (3-4 ข้อ), lineOpener (ข้อความเปิดทาง LINE สั้นๆ สุภาพ) — ภาษาไทยทั้งหมด`;
    return tathepJSON(prompt, PITCH_SCHEMA);
  });

/* ============================ AI LEAD FINDER ============================ */

const LEAD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    leads: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          industry: { type: "string" },
          province: { type: "string" },
          website: { type: "string" },
          mainPhone: { type: "string" },
          companySize: { type: "string", enum: ["SME", "Mid-Market", "Enterprise", "Public Company"] },
          clientType: { type: "string", enum: ["Direct Client", "Agency", "Partner", "Influencer", "Reseller", "Internal"] },
          agencyType: { type: "string", enum: ["Advertising Agency", "Digital Marketing Agency", "Media Agency", "Influencer Agency", "Creative Agency", "PR Agency", "Event Agency", "Production House", "OOH Agency", "Marketing Consultant"] },
          advertisingIntent: { type: "string", enum: ["Very High", "High", "Medium", "Low"] },
          growthSignal: { type: "string", enum: ["Growing Fast", "Growing", "Stable", "Declining"] },
          doohFitScore: { type: "integer" },
          estMarketingBudget: { type: "string" },
          leadQualityScore: { type: "integer" },
          partnerPotentialScore: { type: "integer" },
          distanceKm: { type: "number" },
          nearestBillboard: { type: "string" },
          estTrafficVolume: { type: "string" },
          insights: { type: "array", items: { type: "string" } },
          suggestedPitch: { type: "string" },
          recommendedScreens: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                distance: { type: "string" },
                estReach: { type: "string" },
                matchScore: { type: "integer" },
              },
              required: ["name", "distance", "estReach", "matchScore"],
            },
          },
        },
        required: ["name", "industry", "province", "website", "companySize", "clientType", "advertisingIntent", "growthSignal", "doohFitScore", "estMarketingBudget", "leadQualityScore", "partnerPotentialScore", "distanceKm", "nearestBillboard", "estTrafficVolume", "insights", "suggestedPitch", "recommendedScreens"],
      },
    },
  },
  required: ["leads"],
};

const INTENT_SCORE: Record<string, number> = { "Very High": 100, High: 75, Medium: 50, Low: 25 };
const GROWTH_SCORE: Record<string, number> = { "Growing Fast": 100, Growing: 75, Stable: 50, Declining: 25 };
const SIZE_SCORE: Record<string, number> = { "Public Company": 100, Enterprise: 85, "Mid-Market": 65, SME: 45 };

// AI Lead Finder — Claude acts as AI SDR + research assistant + media planner.
export const findLeads = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      query: z.string().optional(),
      industries: z.array(z.string()).optional(),
      billboards: z.array(z.string()).optional(),
      radiusKm: z.number().optional(),
      companySizes: z.array(z.string()).optional(),
      clientType: z.string().optional(),
      agencyType: z.string().optional(),
      marketingActivity: z.array(z.string()).optional(),
      leadSources: z.array(z.string()).optional(),
      advertisingIntent: z.string().optional(),
      expansionSignals: z.string().optional(),
      minDoohFit: z.number().optional(),
      count: z.number().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const db = getSupabaseAdmin();
    const { data: screenRows } = await db.from("screens").select("*");
    let screens = (screenRows ?? []).map(rowToScreen);
    if (data.billboards?.length) {
      const sel = screens.filter((s) => data.billboards!.includes(s.name));
      if (sel.length) screens = sel;
    }
    const screenList = screens
      .map((s) => `- ${s.name} (${s.province}, ${s.areaType}, ${fmtTHB(s.dailyImpressions)} impr./วัน, ${s.ratePerSecond ?? 0.25}฿/วินาที)`)
      .join("\n");

    const n = Math.min(Math.max(data.count ?? 6, 1), 8);
    const f = data;
    const filterLines = [
      f.query ? `คำค้นหา (natural language): "${f.query}"` : "",
      f.industries?.length ? `อุตสาหกรรม: ${f.industries.join(", ")}` : "",
      f.companySizes?.length ? `ขนาดบริษัท: ${f.companySizes.join(", ")}` : "",
      f.clientType ? `ประเภทลูกค้า (Client Type): ${f.clientType}` : "",
      f.agencyType ? `ประเภท Agency: ${f.agencyType}` : "",
      f.marketingActivity?.length ? `กิจกรรมการตลาดที่ต้องมี: ${f.marketingActivity.join(", ")}` : "",
      f.advertisingIntent ? `ระดับ Advertising Intent ขั้นต่ำ: ${f.advertisingIntent}` : "",
      f.expansionSignals ? `สัญญาณการเติบโต: ${f.expansionSignals}` : "",
      typeof f.minDoohFit === "number" ? `DOOH Fit Score ขั้นต่ำ: ${f.minDoohFit}` : "",
      typeof f.radiusKm === "number" ? `รัศมีจากป้าย: ภายใน ${f.radiusKm} กม.` : "",
    ].filter(Boolean).join("\n");

    const prompt = `คุณคือ AI SDR + Research Assistant + Media Planner ของ Tathep ช่วยทีมขายค้นหาผู้ลงโฆษณาศักยภาพสูงที่อยู่ใกล้ป้าย DOOH ของเรา

ป้ายโฆษณา (billboards) ที่เกี่ยวข้อง:
${screenList || "(ทั้งเครือข่าย)"}

เกณฑ์การค้นหา:
${filterLines || "(ไม่ระบุ — เสนอโอกาสที่ดีที่สุดทั่วไป)"}

เสนอ ${n} บริษัท/แบรนด์ในไทยที่มีอยู่จริง ซึ่งน่าจะซื้อโฆษณา DOOH ใกล้ป้ายเหล่านี้ที่สุด

กฎสำคัญ:
- ใช้เฉพาะบริษัท/แบรนด์ที่มีอยู่จริง ห้ามแต่งชื่อบริษัทขึ้นมา
${f.companySizes?.length ? `- ⚠️ ขนาดบริษัทเป็น HARD FILTER: ทุกบริษัทที่เสนอ companySize ต้องอยู่ใน [${f.companySizes.join(", ")}] เท่านั้น
  - ถ้าเลือก SME/Mid-Market: ห้ามเสนอเครือใหญ่/ห้างสรรพสินค้า/บริษัทมหาชน — ให้เสนอธุรกิจขนาดเล็ก-กลางที่มีอยู่จริง เช่น ร้าน/เชนท้องถิ่น, แบรนด์ภูมิภาค, ดีเวลล็อปเปอร์รายเล็ก, คลินิก/ร้านอาหาร/SME ที่รู้จักในพื้นที่ใกล้ป้าย
  - เน้นธุรกิจ "ในพื้นที่จังหวัดของป้าย" มากกว่าแบรนด์ระดับประเทศ` : ""}
${f.clientType ? `- ประเภทลูกค้า (clientType) ต้องเป็น "${f.clientType}" เท่านั้น` : ""}
${f.agencyType ? `- ถ้าเป็น Agency ต้องเป็นประเภท "${f.agencyType}" และคืนค่า agencyType ให้ตรง` : ""}
${f.industries?.length ? `- เน้นอุตสาหกรรม: ${f.industries.join(", ")} (industry ที่คืนต้องตรงกลุ่มนี้)` : ""}
- เข้าใจความต่างของ Client Type:
  - "Direct Client" = ผู้ลงโฆษณาปลายทาง (end advertiser) เช่น Central, Lotus's, TT Mart, Springfield Resort — ซื้อสื่อให้แบรนด์ตัวเอง
  - "Agency" = บริษัทที่บริหารงบโฆษณาให้ลูกค้าหลายราย (Media Agency / Digital Marketing Agency / Creative Agency ฯลฯ) — เข้าถึงงบของผู้ลงโฆษณาหลายแบรนด์ จึงเป็น strategic partner ที่มีมูลค่าสูงต่อ Tathep ให้คืน agencyType ด้วย
- partnerPotentialScore (0-100): ประเมินศักยภาพการเป็น "พาร์ทเนอร์เชิงกลยุทธ์ระยะยาว" ของ Tathep
  - Agency / Reseller / Partner ควรได้คะแนน partnerPotentialScore สูง (โดยทั่วไป 70-95) เพราะเข้าถึงงบหลายแบรนด์/ดีลซ้ำ
  - Direct Client ทั่วไปได้ปานกลาง (30-60) เว้นแต่เป็นเครือใหญ่ที่ยิงต่อเนื่อง
- ไม่ต้องใส่เบอร์โทร (mainPhone เว้นว่างได้) — ระบบจะดึงเบอร์กลางจริงจาก Google Maps ให้เองทีหลัง ห้ามเดา/แต่งเบอร์เด็ดขาด
- ห้ามแต่งอีเมลปลอม — เบอร์/อีเมลรายบุคคลให้ทีมขายไปเก็บเป็น contact ทีหลัง
- website ใส่เฉพาะที่มั่นใจว่าถูกต้อง ถ้าไม่แน่ใจให้เว้นว่าง
- distanceKm, estTrafficVolume เป็นการประเมินคร่าวๆ ตามทำเลของแบรนด์เทียบกับป้าย — ระบุว่าเป็นการประเมิน
- insights สูงสุด 4 ข้อ (สัญญาณจริง เช่น เปิดโครงการใหม่/ขยายสาขา/ยิงแอดอยู่ / บริหารงบหลายแบรนด์ถ้าเป็น agency)
- suggestedPitch สูงสุด 2 บรรทัด
- recommendedScreens เลือกจากรายชื่อป้ายข้างบนเท่านั้น (1-3 จอ) พร้อม matchScore 0-100
- ภาษาไทยสำหรับ insights/pitch ชื่อบริษัทตามจริง
- ให้คะแนน doohFitScore, leadQualityScore, partnerPotentialScore เป็น 0-100`;

    const out = await tathepJSON<{ leads: any[] }>(prompt, LEAD_SCHEMA, 6000);

    // AI Opportunity Ranking. Agencies/partners are scored on partnership value, not just
    // DOOH fit, since they unlock multiple advertiser budgets.
    const PARTNER_TYPES = ["Agency", "Reseller", "Partner"];
    const ranked = (out.leads ?? [])
      .map((l) => {
        const distScore = Math.max(0, 100 - (Number(l.distanceKm) || 0) * 2);
        const isPartner = PARTNER_TYPES.includes(l.clientType);
        const partner = l.partnerPotentialScore || (isPartner ? 75 : 40);
        const opportunityScore = isPartner
          // Partner ranking: 35% partner potential + 25% intent + 15% DOOH fit + 15% size + 10% growth
          ? Math.round(
              0.35 * partner +
                0.25 * (INTENT_SCORE[l.advertisingIntent] ?? 50) +
                0.15 * (l.doohFitScore || 0) +
                0.15 * (SIZE_SCORE[l.companySize] ?? 50) +
                0.1 * (GROWTH_SCORE[l.growthSignal] ?? 50),
            )
          // Direct-advertiser ranking: 30% DOOH fit + 25% intent + 20% growth + 15% size + 10% distance
          : Math.round(
              0.3 * (l.doohFitScore || 0) +
                0.25 * (INTENT_SCORE[l.advertisingIntent] ?? 50) +
                0.2 * (GROWTH_SCORE[l.growthSignal] ?? 50) +
                0.15 * (SIZE_SCORE[l.companySize] ?? 50) +
                0.1 * distScore,
            );
        return { ...l, partnerPotentialScore: partner, opportunityScore };
      })
      .filter((l) => typeof f.minDoohFit !== "number" || (l.doohFitScore || 0) >= f.minDoohFit!)
      .filter((l) => !f.companySizes?.length || f.companySizes.includes(l.companySize))
      .filter((l) => !f.clientType || l.clientType === f.clientType)
      .filter((l) => !f.agencyType || l.agencyType === f.agencyType)
      .sort((a, b) => b.opportunityScore - a.opportunityScore);

    // Verify against Google Maps (scraped) — use the OFFICIAL name + real phone + address.
    const places = await enrichPhones(ranked.map((l) => ({ name: l.name, locationHint: l.province })));
    const leads = ranked.map((l, i) => {
      const p = places[i];
      return {
        ...l,
        name: p?.matchedName || l.name, // real Google Maps business name
        aiName: l.name, // original AI-suggested name (for reference)
        mainPhone: p?.phone ?? "",
        mapsAddress: p?.address ?? "",
        mapsUrl: p?.mapsUrl,
        phoneVerified: !!p?.phone,
        nameVerified: !!p?.matchedName,
      };
    });

    return { leads, placesEnabled: placesEnabled() };
  });

// Per-lead AI asset: brief (7-section card), outreach email, or call script.
export const leadAsset = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      kind: z.enum(["brief", "email", "callscript"]),
      lead: z.record(z.string(), z.any()),
    }),
  )
  .handler(async ({ data }) => {
    const l = data.lead;
    const ctx = `บริษัท: ${l.name} · อุตสาหกรรม: ${l.industry} · จังหวัด: ${l.province} · ขนาด: ${l.companySize}\nAdvertising Intent: ${l.advertisingIntent} · Growth: ${l.growthSignal} · DOOH Fit: ${l.doohFitScore}/100 · งบโฆษณาประเมิน: ${l.estMarketingBudget}\nป้ายที่แนะนำ: ${(l.recommendedScreens ?? []).map((s: any) => s.name).join(", ")} · ป้ายใกล้สุด: ${l.nearestBillboard} (~${l.distanceKm} กม.)\nอินไซต์: ${(l.insights ?? []).join("; ")}`;

    if (data.kind === "brief") {
      const prompt = `สร้าง CRM sales card สำหรับ prospect DOOH รายนี้\n\n${ctx}\n\nกติกา: ไม่เกิน 250 คำ, ใช้ bullet เท่านั้น (- ), ห้ามย่อหน้ายาวเกิน 1 ประโยค, ภาษาไทย, actionable\nรูปแบบ (heading emoji เป๊ะ):\n🎯 Lead Quality\n💡 Why This Lead\n🎤 Best Pitch\n👤 Recommended Contact\n🚀 Campaign Idea\n⚡ Next Actions\n📈 Win Probability`;
      return { text: await tathepText(prompt, 1400) };
    }
    if (data.kind === "email") {
      const prompt = `เขียนอีเมล outreach แนะนำบริการ Smart DOOH ของ Tathep ถึง prospect รายนี้\n\n${ctx}\n\nกระชับ มืออาชีพ ภาษาไทย: หัวเรื่อง (Subject) + เนื้ออีเมล 3-4 ย่อหน้าสั้น เน้นมุม location-based + วัดผลได้ + CTA ขอนัดคุย 15 นาที`;
      return { text: await tathepText(prompt, 900) };
    }
    const prompt = `เขียน call script (สคริปต์โทรหา) สำหรับทีมขายโทรหา prospect DOOH รายนี้\n\n${ctx}\n\nภาษาไทย: เปิดสาย (hook) → คำถาม discovery 2-3 ข้อ → pitch สั้น → รับมือข้อโต้แย้งที่พบบ่อย 1-2 ข้อ → ปิดนัดหมาย แบบ bullet สั้นๆ`;
    return { text: await tathepText(prompt, 1000) };
  });

/* ============================ BRAND ACTIVATIONS AI ============================ */

// Generate an AI insight for a campaign/activation (billboard + influencer blend).
export const generateCampaignInsight = createServerFn({ method: "POST" })
  .inputValidator(z.object({ campaignId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const db = getSupabaseAdmin();
    const { data: cRow } = await db.from("campaigns").select("*").eq("id", data.campaignId).single();
    if (!cRow) throw new Error("ไม่พบแคมเปญนี้");
    const c = rowToCampaign(cRow);
    const company = c.companyId ? rowToCompany((await db.from("companies").select("*").eq("id", c.companyId).single()).data ?? {}) : null;
    const infs = c.influencerIds?.length ? ((await db.from("influencers").select("*").in("id", c.influencerIds)).data ?? []).map(rowToInfluencer) : [];

    const ctx = `แคมเปญ: ${c.name} · ลูกค้า: ${company?.name ?? "-"} · วัตถุประสงค์: ${c.objective ?? "-"} · สถานะ: ${c.status}\n` +
      `ผลลัพธ์: Billboard Reach ${fmtTHB(c.billboardReach ?? 0)} · Influencer Views ${fmtTHB(c.influencerViews ?? 0)} · Engagement ${fmtTHB(c.socialEngagement ?? 0)} · Store Visits ${fmtTHB(c.storeVisits ?? 0)} · QR Scans ${fmtTHB(c.qrScans ?? 0)} · Revenue ${fmtTHB(c.revenue ?? 0)}฿\n` +
      `Influencers: ${infs.map((i) => `${i.name} (${i.platform}, ${fmtTHB(i.followers)} followers, ${i.category})`).join("; ") || "ไม่มี"}`;

    const insight = await tathepText(
      `วิเคราะห์ผลแคมเปญ DOOH+Influencer นี้ ให้ AI Insight สั้นๆ 3 bullet (ขึ้นต้น "- ") เปรียบเทียบพลังของ billboard vs creator content, กลุ่มที่ engage มากสุด, และผลต่อ store visits/ยอดขาย — ภาษาไทย กระชับ ใช้ตัวเลขจริง\n\n${ctx}`,
      600,
    );
    await db.from("campaigns").update({ ai_insight: insight }).eq("id", c.id);
    return { insight };
  });

// AI Campaign Matchmaker: input a company/lead → recommend billboards + influencers.
const MATCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    recommendedScreens: { type: "array", items: { type: "string" } },
    recommendedInfluencers: { type: "array", items: { type: "string" } },
    expectedReach: { type: "integer" },
    expectedVisits: { type: "integer" },
    campaignScore: { type: "integer" },
    rationale: { type: "string" },
  },
  required: ["recommendedScreens", "recommendedInfluencers", "expectedReach", "expectedVisits", "campaignScore", "rationale"],
};

export const matchmakeCampaign = createServerFn({ method: "POST" })
  .inputValidator(z.object({ companyId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const db = getSupabaseAdmin();
    const { data: coRow } = await db.from("companies").select("*").eq("id", data.companyId).single();
    if (!coRow) throw new Error("ไม่พบบริษัทนี้");
    const company = rowToCompany(coRow);
    const screens = ((await db.from("screens").select("*")).data ?? []).map(rowToScreen);
    const influencers = ((await db.from("influencers").select("*")).data ?? []).map(rowToInfluencer);

    const prompt = `คุณคือ AI Media Planner ของ Tathep — จับคู่ "ป้าย DOOH + Influencer" ที่ดีที่สุดให้ลูกค้ารายนี้\n\n` +
      `ลูกค้า: ${company.name} · ${company.industry} · ${company.province} · ${company.summary ?? ""}\n\n` +
      `ป้ายที่มี:\n${screens.map((s) => `- ${s.name} (${s.province}, ${s.areaType}, ${s.ratePerSecond ?? 0.25}฿/วิ)`).join("\n")}\n\n` +
      `Influencers ที่มี:\n${influencers.map((i) => `- ${i.name} (${i.platform}, ${fmtTHB(i.followers)} followers, ${i.category}, ${i.province})`).join("\n") || "(ยังไม่มี)"}\n\n` +
      `เลือกป้าย 1-3 จอ (recommendedScreens = ชื่อจากรายการเท่านั้น) + influencer 1-3 คน (recommendedInfluencers = ชื่อจากรายการเท่านั้น) ที่ตรงกับทำเล/กลุ่มเป้าหมายของลูกค้า, ประเมิน expectedReach + expectedVisits + campaignScore (0-100) + rationale สั้นๆ ภาษาไทย`;

    return tathepJSON(prompt, MATCH_SCHEMA, 1500);
  });

/* ---------- Enrich a single imported lead (structured) ---------- */
const ENRICH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    tier: { type: "string", enum: ["Platinum", "Gold", "Silver", "Bronze"] },
    aiClass: { type: "string", enum: ["Hot", "Warm", "Cold", "Agency Upsell"] },
    summary: { type: "string" },
    approach: { type: "string" },
  },
  required: ["tier", "aiClass", "summary", "approach"],
};

export const enrichLead = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1),
      province: z.string().optional(),
      industry: z.string().optional(),
      companyType: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const prompt = `ประเมิน lead ใหม่นี้สำหรับธุรกิจ Smart DOOH\nบริษัท: ${data.name}\nจังหวัด: ${data.province || "ไม่ระบุ"} · อุตสาหกรรม: ${data.industry || "ไม่ระบุ"} · ประเภท: ${data.companyType || "ไม่ระบุ"}\n\nคืนค่า tier, aiClass, summary (1-2 ประโยคว่าทำไมน่าสนใจสำหรับ DOOH) และ approach (วิธีเข้าหาแรกที่แนะนำ) เป็นภาษาไทย`;
    return tathepJSON<{ tier: string; aiClass: string; summary: string; approach: string }>(prompt, ENRICH_SCHEMA);
  });

/* ---------- Sales OS AI assistant (multi-turn chat over live CRM data) ---------- */
// Compact, real CRM snapshot the assistant can quote when answering pipeline questions.
async function crmSnapshot(): Promise<string> {
  const db = getSupabaseAdmin();
  const [coRes, dealRes] = await Promise.all([
    db.from("companies").select("*"),
    db.from("deals").select("*"),
  ]);
  const companies = (coRes.data ?? []).map(rowToCompany);
  const deals = (dealRes.data ?? []).map(rowToDeal);
  const open = deals.filter((d) => !["Won", "Lost"].includes(d.stage));
  const won = deals.filter((d) => d.stage === "Won");
  const pipeline = open.reduce((s, d) => s + (d.value || 0), 0);
  const wonValue = won.reduce((s, d) => s + (d.value || 0), 0);
  const byStage: Record<string, number> = {};
  for (const d of deals) byStage[d.stage] = (byStage[d.stage] || 0) + 1;
  const coName = new Map(companies.map((c) => [c.id, c.name]));
  const agencies = companies.filter((c) => (c.clientType ?? c.type) === "Agency").length;
  const topDeals = [...open]
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, 6)
    .map((d) => `- ${d.name} (${coName.get(d.companyId) ?? "-"}) — ฿${fmtTHB(d.value)} · ${d.stage} · ปิดคาด ${d.expectedClose || "-"}`);
  return [
    "# ข้อมูล CRM ปัจจุบัน (อ้างอิงตัวเลขจริงเหล่านี้เวลาตอบเรื่อง pipeline)",
    `บริษัททั้งหมด: ${companies.length} (เป็น Agency ${agencies})`,
    `ดีลทั้งหมด: ${deals.length} · เปิดอยู่ ${open.length} · ปิดได้ (Won) ${won.length}`,
    `มูลค่า pipeline (ดีลที่เปิดอยู่): ฿${fmtTHB(pipeline)} · มูลค่าปิดได้รวม: ฿${fmtTHB(wonValue)}`,
    `ดีลแยกตาม stage: ${Object.entries(byStage).map(([k, v]) => `${k} ${v}`).join(", ") || "-"}`,
    `ดีลใหญ่สุดที่เปิดอยู่:\n${topDeals.join("\n") || "- (ยังไม่มีดีลเปิด)"}`,
  ].join("\n");
}

export const assistantChat = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      messages: z
        .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1) }))
        .min(1)
        .max(40),
    }),
  )
  .handler(async ({ data }) => {
    const ctx = await crmSnapshot();
    const system = `${ctx}

คุณคือ "Sales OS AI" — ผู้ช่วยนักกลยุทธ์สื่อ (media strategist) ของทีมขาย Smart DOOH
ช่วยเรื่อง: หา/วิเคราะห์ lead, แนะนำจอ DOOH ที่เหมาะ, ร่าง outreach (อีเมล/ข้อความ), พยากรณ์รายได้, สรุปและจัดลำดับความสำคัญ pipeline
ตอบกระชับ ตรงประเด็น เป็นภาษาไทย ใช้ bullet เมื่อช่วยให้อ่านง่าย และจบด้วย next step ที่ลงมือทำได้
เวลาถามตัวเลข ให้ใช้ตัวเลขจาก CRM ด้านบน ถ้าไม่มีข้อมูลให้บอกตรงๆ ว่ายังไม่มีในระบบ อย่าเดา`;
    const reply = await tathepChat(data.messages, system, 900);
    return { reply };
  });
