import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSupabaseAdmin } from "../supabase.server";
import {
  rowToScreen,
  rowToAreaAnalysis,
  areaAnalysisToRow,
  rowToContentPlan,
  contentPlanToRow,
  rowToCompany,
  companyToRow,
} from "../db-mappers";
import { tathepJSON } from "../claude.server";
import { findNearbyBusinesses, placesEnabled, type NearbyBusiness } from "../places.server";

const fmtTHB = (n: number) => new Intl.NumberFormat("th-TH").format(n);

const CONTENT_FORMATS = [
  "Interview เจ้าของร้าน",
  "Before/After หลังขึ้นป้าย",
  "Street Vlog",
  "Customer Reaction",
  "Mini Documentary",
  "Challenge",
  "ให้ AI ออกแบบโฆษณาให้ร้าน",
  "พาเจ้าของร้านเลือกป้ายในระบบเอง",
  "เบื้องหลังการขึ้นจอครั้งแรก",
];

/* ============================ analyzeAreaForContent ============================ */

const AREA_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    areaPriority: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          screenId: { type: "string" },
          screenName: { type: "string" },
          priorityRank: { type: "integer" },
          reasoning: { type: "string" },
        },
        required: ["screenId", "screenName", "priorityRank", "reasoning"],
      },
    },
    businessTypeRecommendations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          businessType: { type: "string" },
          count: { type: "integer" },
          salesPotential: { type: "string", enum: ["High", "Medium", "Low"] },
          salesPotentialReasoning: { type: "string" },
          caseStudyFit: { type: "string", enum: ["High", "Medium", "Low"] },
          caseStudyReasoning: { type: "string" },
          interviewFit: { type: "string", enum: ["High", "Medium", "Low"] },
          interviewReasoning: { type: "string" },
          exampleBusinesses: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                address: { type: "string" },
                rating: { type: "number" },
              },
              required: ["name", "address"],
            },
          },
          overallReasoning: { type: "string" },
        },
        required: [
          "businessType", "count", "salesPotential", "salesPotentialReasoning",
          "caseStudyFit", "caseStudyReasoning", "interviewFit", "interviewReasoning",
          "exampleBusinesses", "overallReasoning",
        ],
      },
    },
    topRecommendation: { type: "string" },
    topRecommendationReasoning: { type: "string" },
  },
  required: ["areaPriority", "businessTypeRecommendations", "topRecommendation", "topRecommendationReasoning"],
};

type AreaAnalysisAIResult = {
  areaPriority: { screenId: string; screenName: string; priorityRank: number; reasoning: string }[];
  businessTypeRecommendations: {
    businessType: string;
    count: number;
    salesPotential: "High" | "Medium" | "Low";
    salesPotentialReasoning: string;
    caseStudyFit: "High" | "Medium" | "Low";
    caseStudyReasoning: string;
    interviewFit: "High" | "Medium" | "Low";
    interviewReasoning: string;
    exampleBusinesses: { name: string; address: string; rating?: number }[];
    overallReasoning: string;
  }[];
  topRecommendation: string;
  topRecommendationReasoning: string;
};

// Real Google-Maps businesses around the selected billboard(s) first, then AI
// reasons over that real data — never lets the AI invent business names.
export const analyzeAreaForContent = createServerFn({ method: "POST" })
  .inputValidator(z.object({ screenIds: z.array(z.string().min(1)).min(1).max(5) }))
  .handler(async ({ data }) => {
    const db = getSupabaseAdmin();
    const { data: screenRows, error: screenErr } = await db
      .from("screens").select("*").in("id", data.screenIds);
    if (screenErr) throw new Error(screenErr.message);
    const screens = (screenRows ?? []).map(rowToScreen);
    if (!screens.length) throw new Error("ไม่พบป้ายที่เลือก");

    if (!placesEnabled()) {
      throw new Error("ยังไม่ได้ตั้งค่า APIFY_API_TOKEN — ต้องมีข้อมูลธุรกิจจริงจาก Google Maps ก่อนวิเคราะห์");
    }

    const perScreen = await Promise.all(
      screens
        .filter((s) => typeof s.lat === "number" && typeof s.lng === "number")
        .map(async (s) => ({
          screen: s,
          businesses: await findNearbyBusinesses({ lat: s.lat!, lng: s.lng! }, { radiusKm: 1, maxPerSearch: 5 }),
        })),
    );

    const businesses: (NearbyBusiness & { screenId: string; screenName: string })[] = perScreen.flatMap(
      ({ screen, businesses: bs }) => bs.map((b) => ({ ...b, screenId: screen.id, screenName: screen.name })),
    );

    const screenNames = screens.map((s) => s.name);

    if (!businesses.length) {
      const row = areaAnalysisToRow({
        screenIds: data.screenIds,
        screenNames,
        status: "no_businesses_found",
        businesses: [],
        areaPriority: [],
        businessTypeRecommendations: [],
      });
      const { data: inserted, error } = await db.from("area_content_analyses").insert(row).select().single();
      if (error) throw new Error(`บันทึกผลวิเคราะห์ไม่สำเร็จ: ${error.message}`);
      return rowToAreaAnalysis(inserted);
    }

    const screenBlock = screens
      .map((s) => `- ${s.name} (${s.province}, ${s.area}, ${s.areaType}, ${fmtTHB(s.dailyImpressions)} impr./วัน)`)
      .join("\n");
    const businessBlock = businesses
      .map((b) => `- [${b.matchedKeyword}] ${b.name} — ${b.category} — ${b.address}${b.rating ? ` (⭐${b.rating})` : ""} (ใกล้ป้าย: ${b.screenName})`)
      .join("\n");

    const prompt = `คุณคือ AI Field Marketing Strategist ของ Tathep (Smart DOOH) — วิเคราะห์พื้นที่รอบป้ายบิลบอร์ดที่เลือก เพื่อวางแผนให้ทีม Marketing/Sales ลงพื้นที่หาลูกค้าใหม่

ป้ายที่เลือก:
${screenBlock}

ธุรกิจจริงที่พบรอบป้าย (ดึงจาก Google Maps จริง ห้ามแต่งชื่อหรือใช้ชื่อธุรกิจอื่นนอกเหนือจากรายการนี้ใน exampleBusinesses):
${businessBlock}

วิเคราะห์และคืนค่า JSON:
- areaPriority: ถ้ามีป้ายมากกว่า 1 ป้าย ให้จัดอันดับว่าควรลงพื้นที่ป้ายไหนก่อน (priorityRank เริ่มที่ 1) พร้อมเหตุผล (ถ้ามีป้ายเดียวให้ใส่รายการเดียว priorityRank=1)
- businessTypeRecommendations: จัดกลุ่มธุรกิจจริงข้างบนตามประเภท (คาเฟ่ ร้านอาหาร ร้านมือถือ คลินิก โรงแรม ร้านเสริมสวย ร้านค้า Local) เฉพาะประเภทที่พบจริงเท่านั้น แต่ละกลุ่มระบุ: count (จำนวนที่พบ), salesPotential (High/Medium/Low โอกาสซื้อโฆษณา) พร้อมเหตุผล, caseStudyFit (เหมาะทำ Case Study แค่ไหน) พร้อมเหตุผล, interviewFit (เหมาะสัมภาษณ์เจ้าของร้านแค่ไหน) พร้อมเหตุผล, exampleBusinesses (2-4 ร้านจริงจากรายการข้างบนเท่านั้น), overallReasoning (สรุปเหตุผลโดยรวมว่าทำไมพื้นที่นี้เหมาะกับธุรกิจประเภทนี้ อิงจากสภาพแวดล้อมจริง)
- topRecommendation: ธุรกิจประเภทที่แนะนำให้เข้าหาก่อนเป็นอันดับแรก พร้อม topRecommendationReasoning อธิบายเหตุผล

ตอบเป็นภาษาไทยทั้งหมด เจาะจง อิงข้อมูลจริงที่ให้มา`;

    const ai = await tathepJSON<AreaAnalysisAIResult>(prompt, AREA_ANALYSIS_SCHEMA, 2500);

    const row = areaAnalysisToRow({
      screenIds: data.screenIds,
      screenNames,
      status: "ok",
      businesses,
      areaPriority: ai.areaPriority,
      businessTypeRecommendations: ai.businessTypeRecommendations,
      topRecommendation: ai.topRecommendation,
      topRecommendationReasoning: ai.topRecommendationReasoning,
    });
    const { data: inserted, error } = await db.from("area_content_analyses").insert(row).select().single();
    if (error) throw new Error(`บันทึกผลวิเคราะห์ไม่สำเร็จ: ${error.message}`);
    return rowToAreaAnalysis(inserted);
  });

/* ============================ generateContentPlan ============================ */

const CONTENT_PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    contentObjective: { type: "string" },
    contentObjectiveReasoning: { type: "string" },
    recommendedFormats: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { format: { type: "string" }, reasoning: { type: "string" } },
        required: ["format", "reasoning"],
      },
    },
    recordingGuide: {
      type: "object",
      additionalProperties: false,
      properties: {
        openingHook: { type: "string" },
        shotList: { type: "array", items: { type: "string" } },
        bRoll: { type: "array", items: { type: "string" } },
        interviewQuestions: { type: "array", items: { type: "string" } },
        closingScene: { type: "string" },
      },
      required: ["openingHook", "shotList", "bRoll", "interviewQuestions", "closingScene"],
    },
    suggestedInterviewQuestions: { type: "array", items: { type: "string" } },
    suggestedHooks: { type: "array", items: { type: "string" } },
    reasoning: { type: "string" },
  },
  required: [
    "contentObjective", "contentObjectiveReasoning", "recommendedFormats",
    "recordingGuide", "suggestedInterviewQuestions", "suggestedHooks", "reasoning",
  ],
};

type ContentPlanAIResult = {
  contentObjective: string;
  contentObjectiveReasoning: string;
  recommendedFormats: { format: string; reasoning: string }[];
  recordingGuide: { openingHook: string; shotList: string[]; bRoll: string[]; interviewQuestions: string[]; closingScene: string };
  suggestedInterviewQuestions: string[];
  suggestedHooks: string[];
  reasoning: string;
};

export const generateContentPlan = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      analysisId: z.string().min(1),
      businessType: z.string().min(1),
      business: z
        .object({
          name: z.string(),
          address: z.string().optional(),
          category: z.string().optional(),
          mapsUrl: z.string().optional(),
          rating: z.number().optional(),
        })
        .optional(),
    }),
  )
  .handler(async ({ data }) => {
    const db = getSupabaseAdmin();
    const { data: analysisRow, error: analysisErr } = await db
      .from("area_content_analyses").select("*").eq("id", data.analysisId).single();
    if (analysisErr || !analysisRow) throw new Error("ไม่พบผลวิเคราะห์พื้นที่นี้ — กรุณาวิเคราะห์พื้นที่ใหม่");
    const analysis = rowToAreaAnalysis(analysisRow);

    const rec = analysis.businessTypeRecommendations.find((r) => r.businessType === data.businessType);
    const business = data.business ?? rec?.exampleBusinesses?.[0];

    const prompt = `คุณคือ AI Content Strategist ของ Tathep (Smart DOOH) — สร้างแผนคอนเทนต์ field marketing ให้ทีมลงพื้นที่ถ่ายทำได้ทันที ไม่ต้องคิดหน้างานเอง

พื้นที่: ${analysis.screenNames.join(", ")}
ประเภทธุรกิจเป้าหมาย: ${data.businessType}
${business ? `ร้านตัวอย่างจริง: ${business.name} — ${business.address ?? ""}${"rating" in business && business.rating ? ` (⭐${business.rating})` : ""}` : ""}
${rec ? `เหตุผลที่พื้นที่นี้เหมาะกับธุรกิจประเภทนี้: ${rec.overallReasoning}` : ""}

Content Format ที่อนุญาตให้เลือกใช้ (เลือก 2-4 แบบที่เหมาะกับร้านนี้ที่สุด):
${CONTENT_FORMATS.map((f) => `- ${f}`).join("\n")}

สร้างแผนคอนเทนต์เต็มรูปแบบเป็น JSON (ภาษาไทยทั้งหมด อิงข้อมูลร้าน/พื้นที่จริงข้างบน ทุกคำแนะนำต้องมีเหตุผลกำกับ):
- contentObjective: เป้าหมายหลักของคอนเทนต์ชิ้นนี้ (เช่น สร้าง Awareness / แนะนำแพลตฟอร์ม / เปลี่ยนร้านค้าให้กลายเป็น Case Study) + contentObjectiveReasoning
- recommendedFormats: เลือกจากลิสต์ด้านบน 2-4 แบบ พร้อมเหตุผลของแต่ละแบบว่าทำไมเหมาะกับร้านนี้
- recordingGuide: openingHook (ประโยคเปิดฉาก), shotList (ลิสต์ช็อตที่ต้องถ่าย), bRoll (บรรยากาศ/รายละเอียดที่ควรถ่ายเก็บไว้), interviewQuestions (คำถามที่ใช้ระหว่างถ่ายทำ), closingScene (ฉากปิดท้าย)
- suggestedInterviewQuestions: คำถามสัมภาษณ์ที่คัดสรรแล้วสำหรับใช้จริง (เช่น ร้านเปิดมากี่ปี ลูกค้าส่วนใหญ่มาจากไหน เคยโฆษณามาก่อนไหม ถ้ามีงบ 300 บาทอยากลองขึ้นป้ายไหม)
- suggestedHooks: hook/แคปชั่นเปิดคลิปที่ใช้ได้จริง 3-5 แบบ
- reasoning: สรุปเหตุผลโดยรวมว่าทำไมแผนนี้เหมาะกับร้าน/พื้นที่นี้`;

    const ai = await tathepJSON<ContentPlanAIResult>(prompt, CONTENT_PLAN_SCHEMA, 1800);

    // Auto-create (or reuse) the real business as an Account so Sales can act on it immediately —
    // dedup by name so regenerating a plan for the same shop doesn't spam duplicate Accounts.
    let companyRow: any = null;
    if (business?.name) {
      const { data: existing } = await db
        .from("companies").select("*").ilike("name", business.name).limit(1).maybeSingle();
      if (existing) {
        companyRow = existing;
      } else {
        const { data: screenRow } = await db
          .from("screens").select("province").eq("id", analysis.screenIds[0]).maybeSingle();
        const newCompanyRow = companyToRow({
          name: business.name,
          type: "Direct Client",
          clientType: "Direct Client",
          industry: data.businessType,
          province: screenRow?.province ?? undefined,
          status: "Prospect",
          source: "AI Content Planner",
          tags: [data.businessType],
          summary: `พบจาก AI Content Planner ใกล้ป้าย ${analysis.screenNames.join(", ")}${rec ? ` — ${rec.overallReasoning}` : ""}`,
        });
        const { data: inserted, error } = await db.from("companies").insert(newCompanyRow).select().single();
        if (error) throw new Error(`สร้าง Account ไม่สำเร็จ: ${error.message}`);
        companyRow = inserted;
      }
    }

    const row = contentPlanToRow({
      analysisId: data.analysisId,
      screenId: analysis.screenIds[0],
      companyId: companyRow?.id,
      businessType: data.businessType,
      businessRef: business
        ? {
            name: business.name,
            address: business.address,
            category: (business as any).category,
            mapsUrl: (business as any).mapsUrl,
            rating: business.rating,
          }
        : {},
      contentObjective: ai.contentObjective,
      contentObjectiveReasoning: ai.contentObjectiveReasoning,
      recommendedFormats: ai.recommendedFormats,
      recordingGuide: ai.recordingGuide,
      suggestedInterviewQuestions: ai.suggestedInterviewQuestions,
      suggestedHooks: ai.suggestedHooks,
      reasoning: ai.reasoning,
    });
    const { data: inserted, error } = await db.from("content_plans").insert(row).select().single();
    if (error) throw new Error(`บันทึก Content Plan ไม่สำเร็จ: ${error.message}`);
    return { plan: rowToContentPlan(inserted), company: companyRow ? rowToCompany(companyRow) : null };
  });

export const listContentPlansForCompany = createServerFn({ method: "GET" })
  .inputValidator(z.object({ companyId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { data: rows, error } = await getSupabaseAdmin()
      .from("content_plans")
      .select("*")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (rows ?? []).map(rowToContentPlan);
  });

// Generate a Content Plan straight from an Account (no billboard/area analysis required) —
// grounded in the company's own real CRM data (name, industry, province, summary).
export const generateContentPlanForCompany = createServerFn({ method: "POST" })
  .inputValidator(z.object({ companyId: z.string().min(1) }))
  .handler(async ({ data }) => {
    const db = getSupabaseAdmin();
    const { data: companyRow, error: companyErr } = await db
      .from("companies").select("*").eq("id", data.companyId).single();
    if (companyErr || !companyRow) throw new Error("ไม่พบบัญชีนี้");
    const company = rowToCompany(companyRow);
    const businessType = company.industry || company.subType || "ธุรกิจทั่วไป";

    const prompt = `คุณคือ AI Content Strategist ของ Tathep (Smart DOOH) — สร้างแผนคอนเทนต์ field marketing ให้ทีมลงพื้นที่ถ่ายทำได้ทันที ไม่ต้องคิดหน้างานเอง

ร้าน/บริษัท: ${company.name}
ประเภทธุรกิจ: ${businessType}
${company.province ? `พื้นที่: ${company.province}` : ""}
${company.summary ? `ข้อมูลเพิ่มเติม: ${company.summary}` : ""}

Content Format ที่อนุญาตให้เลือกใช้ (เลือก 2-4 แบบที่เหมาะกับร้านนี้ที่สุด):
${CONTENT_FORMATS.map((f) => `- ${f}`).join("\n")}

สร้างแผนคอนเทนต์เต็มรูปแบบเป็น JSON (ภาษาไทยทั้งหมด อิงข้อมูลร้านข้างบน ทุกคำแนะนำต้องมีเหตุผลกำกับ):
- contentObjective: เป้าหมายหลักของคอนเทนต์ชิ้นนี้ (เช่น สร้าง Awareness / แนะนำแพลตฟอร์ม / เปลี่ยนร้านค้าให้กลายเป็น Case Study) + contentObjectiveReasoning
- recommendedFormats: เลือกจากลิสต์ด้านบน 2-4 แบบ พร้อมเหตุผลของแต่ละแบบว่าทำไมเหมาะกับร้านนี้
- recordingGuide: openingHook (ประโยคเปิดฉาก), shotList (ลิสต์ช็อตที่ต้องถ่าย), bRoll (บรรยากาศ/รายละเอียดที่ควรถ่ายเก็บไว้), interviewQuestions (คำถามที่ใช้ระหว่างถ่ายทำ), closingScene (ฉากปิดท้าย)
- suggestedInterviewQuestions: คำถามสัมภาษณ์ที่คัดสรรแล้วสำหรับใช้จริง (เช่น ร้านเปิดมากี่ปี ลูกค้าส่วนใหญ่มาจากไหน เคยโฆษณามาก่อนไหม ถ้ามีงบ 300 บาทอยากลองขึ้นป้ายไหม)
- suggestedHooks: hook/แคปชั่นเปิดคลิปที่ใช้ได้จริง 3-5 แบบ
- reasoning: สรุปเหตุผลโดยรวมว่าทำไมแผนนี้เหมาะกับร้านนี้`;

    const ai = await tathepJSON<ContentPlanAIResult>(prompt, CONTENT_PLAN_SCHEMA, 1800);

    const row = contentPlanToRow({
      companyId: company.id,
      businessType,
      businessRef: { name: company.name, address: company.province, category: businessType },
      contentObjective: ai.contentObjective,
      contentObjectiveReasoning: ai.contentObjectiveReasoning,
      recommendedFormats: ai.recommendedFormats,
      recordingGuide: ai.recordingGuide,
      suggestedInterviewQuestions: ai.suggestedInterviewQuestions,
      suggestedHooks: ai.suggestedHooks,
      reasoning: ai.reasoning,
    });
    const { data: inserted, error } = await db.from("content_plans").insert(row).select().single();
    if (error) throw new Error(`บันทึก Content Plan ไม่สำเร็จ: ${error.message}`);
    return rowToContentPlan(inserted);
  });

/* ============================ history reads ============================ */

export const listAreaAnalyses = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await getSupabaseAdmin()
    .from("area_content_analyses")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToAreaAnalysis);
});

export const getAreaAnalysisDetail = createServerFn({ method: "GET" })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const db = getSupabaseAdmin();
    const [{ data: aRow, error: aErr }, { data: planRows, error: pErr }] = await Promise.all([
      db.from("area_content_analyses").select("*").eq("id", data.id).single(),
      db.from("content_plans").select("*").eq("analysis_id", data.id).order("created_at", { ascending: false }),
    ]);
    if (aErr || !aRow) throw new Error("ไม่พบผลการวิเคราะห์นี้");
    if (pErr) throw new Error(pErr.message);
    return { analysis: rowToAreaAnalysis(aRow), contentPlans: (planRows ?? []).map(rowToContentPlan) };
  });
