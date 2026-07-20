// Rule-based account health / risk signals (no AI — deterministic & instant).
// Surfaces the four risks the sales team cares about on every account.
import type { Company, Deal, Activity, Contact } from "@/lib/mock-data";
import type { AccountRisk } from "../types/account";
import { toDate, todayISO } from "./accountMetrics";

const DAY = 86_400_000;
const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / DAY);

const ACTIVE_STAGES = new Set(["Campaign Setup", "Running"]);
const CREATIVE_READY = new Set(["Approved", "Uploaded", "Published"]);
const PAYMENT_RISKY = new Set(["Overdue", "Pending", "Partially Paid"]);

export function computeRisks(
  company: Company,
  deals: Deal[],
  activities: Activity[],
  contacts: Contact[],
): AccountRisk[] {
  const risks: AccountRisk[] = [];
  const today = todayISO();
  const hasOpenDeal = deals.some((d) => !["Won", "Lost"].includes(d.stage));

  // 1) Low activity — no logged activity in 30+ days (only flag accounts in play)
  const lastAct = activities
    .map((a) => toDate(a.date))
    .filter(Boolean)
    .sort()
    .pop();
  if (hasOpenDeal) {
    if (!lastAct) {
      risks.push({ key: "low_activity", level: "high", title: "ไม่มีกิจกรรมเลย", detail: "ยังไม่เคยบันทึกกิจกรรมกับลูกค้ารายนี้ — ควรเริ่มติดต่อ" });
    } else {
      const gap = daysBetween(lastAct, today);
      if (gap >= 45) risks.push({ key: "low_activity", level: "high", title: "เงียบหายนาน", detail: `ไม่มีกิจกรรม ${gap} วัน — ดีลเสี่ยงเย็นลง` });
      else if (gap >= 30) risks.push({ key: "low_activity", level: "medium", title: "กิจกรรมน้อย", detail: `ไม่ได้ติดต่อ ${gap} วัน — ควร follow-up` });
    }
  }

  // 2) No decision maker captured
  const hasDM = contacts.some((c) => c.roleType === "Decision Maker" || c.roleType === "Budget Holder");
  if (!hasDM && hasOpenDeal) {
    risks.push({
      key: "no_decision_maker",
      level: contacts.length === 0 ? "high" : "medium",
      title: "ยังไม่เจอผู้มีอำนาจตัดสินใจ",
      detail: contacts.length === 0 ? "ยังไม่มีผู้ติดต่อในระบบ" : "ผู้ติดต่อที่มียังไม่ใช่ Decision Maker / Budget Holder",
    });
  }

  // 3) Payment delay — any deal with a risky payment status
  const latePay = deals.filter((d) => d.paymentStatus && PAYMENT_RISKY.has(d.paymentStatus));
  if (latePay.length) {
    const overdue = latePay.some((d) => d.paymentStatus === "Overdue");
    risks.push({
      key: "payment_delay",
      level: overdue ? "high" : "medium",
      title: overdue ? "มีบิลค้างชำระเกินกำหนด" : "รอชำระเงิน",
      detail: `${latePay.length} ดีล: ${latePay.map((d) => `${d.name} (${d.paymentStatus})`).join(", ")}`,
    });
  }

  // 4) Creative not ready on an active/launching campaign
  const creativeRisk = deals.filter(
    (d) => ACTIVE_STAGES.has(d.stage) && d.creativeStatus && !CREATIVE_READY.has(d.creativeStatus),
  );
  if (creativeRisk.length) {
    risks.push({
      key: "creative_not_ready",
      level: "medium",
      title: "ครีเอทีฟยังไม่พร้อม",
      detail: `${creativeRisk.length} แคมเปญกำลังขึ้นจอแต่ครีเอทีฟยัง: ${creativeRisk.map((d) => `${d.name} (${d.creativeStatus})`).join(", ")}`,
    });
  }

  return risks;
}

// 0-100 health score (higher = healthier). Used for an at-a-glance chip.
export function healthScore(risks: AccountRisk[]): number {
  const penalty = risks.reduce((s, r) => s + (r.level === "high" ? 30 : r.level === "medium" ? 15 : 5), 0);
  return Math.max(0, 100 - penalty);
}
