import process from "node:process";

// Server-only email sender via the Resend REST API (https://resend.com).
// Uses fetch (no SDK dependency) to match the project's OpenAI/Apify style.
// The .server.ts suffix keeps the API key out of the client bundle.
//
// Required env (see .env.example):
//   RESEND_API_KEY  — re_... from resend.com → API Keys
//   RESEND_FROM     — verified sender, e.g. "Tathep <docs@tathep.com>"
//                     (a verified domain is required to send to real inboxes;
//                      "onboarding@resend.dev" only works to your own address)

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  cc?: string | string[];
}

export interface SendEmailResult {
  id: string;
  provider: "resend";
}

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      "ยังไม่ได้ตั้งค่าอีเมล — เพิ่ม RESEND_API_KEY (และ RESEND_FROM) ใน .env ก่อนส่ง " +
        "(สมัครฟรีที่ resend.com → API Keys)",
    );
  }
  const from = process.env.RESEND_FROM || "Tathep <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      cc: input.cc,
      reply_to: input.replyTo,
      subject: input.subject,
      html: input.html,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = (await res.json()) as { id?: string };
  return { id: data?.id ?? "", provider: "resend" };
}
