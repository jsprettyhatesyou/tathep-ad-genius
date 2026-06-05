import process from "node:process";

// Server-only LLM client. น้องตาเทพ now runs on OpenAI (key swapped from Anthropic).
// The .server.ts suffix keeps the API key out of the client bundle; env is read
// lazily so it resolves per-request. Uses the OpenAI Chat Completions REST API via
// fetch (no SDK dependency). The tathepText/tathepJSON interface is unchanged, so
// every caller in ai.functions.ts keeps working without edits.
function apiKey(): string {
  const k = process.env.OPENAI_API_KEY;
  if (!k) throw new Error("Missing OPENAI_API_KEY — add it to .env (see .env.example).");
  return k;
}

export const TATHEP_MODEL = "gpt-4o";

async function openaiChat(body: Record<string, any>): Promise<any> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey()}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OpenAI ${res.status}: ${t.slice(0, 300)}`);
  }
  return res.json();
}

// น้องตาเทพ brand persona — the stable system prefix (prompt-cached).
// Keep this BYTE-STABLE across requests so the cache prefix matches; never
// interpolate per-request values (dates, ids) into it.
export const TATHEP_SYSTEM = `คุณคือ "น้องตาเทพ 👁️" — AI ผู้เชี่ยวชาญด้านโฆษณา, marketing technology, AI workflow และกลยุทธ์ Smart DOOH ของแพลตฟอร์ม Tathep

# Tathep คืออะไร
Tathep เป็นแพลตฟอร์ม Smart DOOH / Self-Serve Billboard ที่ให้ผู้ใช้:
- จองป้ายโฆษณา LED ออนไลน์ได้เอง, อัปโหลดโฆษณาเอง, เลือกเวลาและทำเลได้, ยิงแคมเปญได้ทันที, วัดผลผ่าน analytics
- จุดยืน: "Facebook Ads ของโลกป้ายโฆษณา" — "เหมือนยิงแอดออนไลน์ แต่ขึ้นจอจริง"
- จุดเด่น: Self-Serve booking, ซื้อโฆษณาเป็นวินาที, เลือกโลเคชั่น/เวลา/คนดูได้, AI audience analytics, real-time dashboard, ราคาเข้าถึงได้

# บทบาทของคุณในระบบ CRM นี้
คุณช่วยทีมขาย Smart DOOH วางกลยุทธ์ปิดดีล: วิเคราะห์ลูกค้า, จัดระดับ lead, ร่าง pitch + รับมือข้อโต้แย้ง, แนะนำจอที่เหมาะ

# โทนเสียง (สำคัญมาก)
- พูดแบบผู้เชี่ยวชาญที่อธิบายเรื่องยากให้เข้าใจง่าย + คิดแบบนักกลยุทธ์ธุรกิจ + mindset เจ้าของกิจการ/operator
- โมเดิร์น เป็นกันเอง มีอินไซต์ มืออาชีพ — ไม่หุ่นยนต์ ไม่ขายตรงจนเกินไป ไม่โอเวอร์เคลม
- ตอบเป็นภาษาไทยเป็นหลัก กระชับแต่มีคุณค่า เน้น actionable + ลงมือทำได้จริง
- ใช้คำของแบรนด์ได้เช่น: ยิงโฆษณา, เลือกเวลาได้, เลือกโลเคชั่นได้, AI วิเคราะห์คนดู, ป้ายอัจฉริยะ, โฆษณาที่วัดผลได้

# ห้าม
- เคลมเกินจริง ("การันตี 100%", "รวยเร็ว"), ศัพท์เทคนิคที่ไม่อธิบาย, โทนขายดันจนน่ารำคาญ, แต่งข้อมูลสำคัญที่ไม่รู้จริง — ถ้าไม่แน่ใจให้บอกว่าควรตรวจสอบอะไรเพิ่ม`;

/** Free-form generation (strategy, pitch). Returns markdown/text. */
export async function tathepText(userPrompt: string, maxTokens = 1800): Promise<string> {
  const data = await openaiChat({
    model: TATHEP_MODEL,
    max_tokens: maxTokens,
    temperature: 0.7,
    messages: [
      { role: "system", content: TATHEP_SYSTEM },
      { role: "user", content: userPrompt },
    ],
  });
  return (data?.choices?.[0]?.message?.content ?? "").trim();
}

/** Multi-turn chat (the Sales OS AI assistant). `extraSystem` injects live CRM
 *  context after the persona. Returns the assistant's reply text. */
export async function tathepChat(
  messages: { role: "user" | "assistant"; content: string }[],
  extraSystem = "",
  maxTokens = 900,
): Promise<string> {
  const data = await openaiChat({
    model: TATHEP_MODEL,
    max_tokens: maxTokens,
    temperature: 0.6,
    messages: [
      { role: "system", content: extraSystem ? `${TATHEP_SYSTEM}\n\n${extraSystem}` : TATHEP_SYSTEM },
      ...messages,
    ],
  });
  return (data?.choices?.[0]?.message?.content ?? "").trim();
}

/** Structured generation (classification, enrichment). Returns a parsed object.
 *  Uses OpenAI JSON mode + the schema embedded in the prompt (keeps the existing
 *  Anthropic-shaped schemas working without OpenAI's strict-schema constraints). */
export async function tathepJSON<T>(userPrompt: string, schema: Record<string, any>, maxTokens = 1200): Promise<T> {
  const data = await openaiChat({
    model: TATHEP_MODEL,
    max_tokens: maxTokens,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: `${TATHEP_SYSTEM}\n\nตอบกลับเป็น JSON object ที่ถูกต้องเท่านั้น (valid JSON) ห้ามมีข้อความหรือ markdown อื่นนอก JSON` },
      { role: "user", content: `${userPrompt}\n\nตอบกลับเป็น JSON object เท่านั้น โดยให้ตรงตาม JSON schema นี้ (ใช้เฉพาะ keys ที่กำหนด ห้ามเพิ่ม key อื่น):\n${JSON.stringify(schema)}` },
    ],
  });
  const text = data?.choices?.[0]?.message?.content ?? "{}";
  return JSON.parse(text) as T;
}
