// Realistic Thai mock data for Tathep CRM
export type AccountType = "Direct Client" | "Agency";
// Richer client classification — Tathep sells DOOH to direct advertisers AND agencies/partners.
export type ClientType = "Direct Client" | "Agency" | "Partner" | "Influencer" | "Reseller" | "Internal";
export type LeadTier = "Platinum" | "Gold" | "Silver" | "Bronze";
export type AIClass = "Hot" | "Warm" | "Cold" | "Agency Upsell";
export type Priority = "Urgent" | "High" | "Medium" | "Low";
export type AccountStatus = "Prospect" | "Active" | "Recurring" | "Inactive" | "Lost";
export type Stage =
  | "Lead"
  | "Qualified"
  | "Proposal Sent"
  | "Negotiation"
  | "Waiting Payment"
  | "Campaign Setup"
  | "Running"
  | "Won"
  | "Lost"
  | "On Hold";

export const STAGES: Stage[] = [
  "Lead",
  "Qualified",
  "Proposal Sent",
  "Negotiation",
  "Waiting Payment",
  "Campaign Setup",
  "Running",
  "Won",
  "Lost",
  "On Hold",
];

export interface Company {
  id: string;
  name: string;
  type: AccountType;
  subType: string;
  industry: string;
  province: string;
  status: AccountStatus;
  tier: LeadTier;
  leadScore: number;
  aiClass: AIClass;
  annualBudget: string;
  totalDealValue: number;
  assignedTo: string;
  lastActivity: string;
  website?: string;
  phone?: string; // central / head-office line (e.g. 02 Bangkok landline) — AI pulls this first
  size: string;
  source: string;
  tags: string[];
  summary: string;
  salesStrategy?: string; // AI-generated sales strategy, persisted so it survives reloads
  aiInsights?: import("../features/accounts/types/account").AccountAIInsight; // cached AI insight, persisted to DB
  // Extended classification (DOOH direct advertisers vs agencies/partners)
  clientType?: ClientType;
  agencyType?: string; // only meaningful when clientType === "Agency"
  partnerPotentialScore?: number; // 0-100 — strategic-partner value (agencies score higher)
  estimatedAnnualMarketingBudget?: string;
  numberOfBranches?: number;
  facebookUrl?: string;
  instagramUrl?: string;
  linkedinUrl?: string;
  tiktokUrl?: string;
}

// Raw, pre-qualification prospect. Convert → Account (Company) + Contact + Opportunity (Deal).
export type LeadStatus = "New" | "Working" | "Qualified" | "Unqualified" | "Converted";
export interface Lead {
  id: string;
  companyName: string;
  contactName?: string;
  jobTitle?: string;
  phone?: string;
  email?: string;
  lineId?: string;
  website?: string;
  province?: string;
  industry?: string;
  clientType?: ClientType;
  agencyType?: string;
  source: string;
  status: LeadStatus;
  assignedTo?: string;
  leadScore?: number;
  aiClass?: AIClass;
  estimatedBudget?: string;
  notes?: string;
  convertedCompanyId?: string;
  createdAt?: string;
}

export interface Contact {
  id: string;
  name: string;
  companyId: string;
  jobTitle: string;
  roleType: "Decision Maker" | "Budget Holder" | "Influencer" | "User" | "Gatekeeper";
  phone: string;
  lineId: string;
  email: string;
  preferred: "LINE" | "Phone" | "Email" | "Meeting";
  status: "Active" | "Cold" | "Engaged";
  lastContacted: string;
  assignedTo: string;
  createdAt?: string;
}

export interface Deal {
  id: string;
  name: string;
  companyId: string;
  contactId: string;
  clientType: AccountType;
  stage: Stage;
  value: number;
  tier: LeadTier;
  aiClass: AIClass;
  priority: Priority;
  campaignType: string;
  duration: string;
  screens: string[];
  expectedClose: string;
  probability: number;
  nextFollowUp: string;
  notes: string;
  // Extended opportunity fields
  leadSource?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  revenueType?: string;
  campaignStatus?: string;
  creativeStatus?: string;
  lostReason?: string;
  contractType?: string;
}

// ----- Quotation / Invoice (ใบเสนอราคา / ใบแจ้งหนี้) -----
export type DocType = "quotation" | "invoice";
export type DocStatus =
  | "Draft"
  | "Sent"
  | "Accepted"
  | "Rejected"
  | "Paid"
  | "Cancelled";

// A single billable line on a quotation/invoice.
export interface DocLineItem {
  description: string;
  screenId?: string; // optional link back to a Screen (name or id)
  qty: number;
  unit: string; // "วัน" | "เดือน" | "สัปดาห์" | "ครั้ง" …
  unitPrice: number; // THB per unit
  amount: number; // qty * unitPrice (recomputed, stored for the printout)
}

export interface DealDocument {
  id: string;
  dealId: string;
  companyId: string;
  contactId?: string;
  type: DocType;
  docNumber: string; // QT-2026-0001 / INV-2026-0001
  status: DocStatus;
  issueDate: string; // YYYY-MM-DD
  dueDate?: string; // valid-until (quotation) / due date (invoice)
  lineItems: DocLineItem[];
  subtotal: number;
  discount: number; // absolute THB amount off the subtotal
  vatRate: number; // percent, e.g. 7
  vatAmount: number;
  total: number;
  currency: string; // "THB"
  notes?: string;
  terms?: string;
  recipientEmail?: string;
  sentAt?: string;
  createdAt?: string;
}

export interface Activity {
  id: string;
  type: "Call" | "Meeting" | "LINE" | "Email" | "Demo" | "Proposal Sent" | "Follow-up" | "Site Visit";
  title: string;
  date: string;
  status: "Planned" | "Done" | "Missed" | "Rescheduled";
  dealId?: string;
  contactId?: string;
  companyId?: string;
  summary: string;
  nextAction?: string;
  duration?: string;
  assignedTo: string;
}

export interface Screen {
  id: string;
  name: string;
  province: string;
  area: string;
  areaType: "CBD" | "Highway" | "Mall" | "Residential" | "Hospital" | "University" | "Nightlife" | "Industrial";
  size: string;
  resolution: string;
  availability: "Available" | "Occupied" | "Maintenance";
  rate15s: number;
  rateDaily: number;
  rateMonthly: number;
  dailyImpressions: number;
  audience: string[];
  hours: string;
  ratePerSecond?: number;
  code?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

// AI Content Recommendation (field marketing content planner)
export interface NearbyBusiness {
  name: string;
  category: string;
  categories?: string[];
  address: string;
  lat?: number;
  lng?: number;
  rating?: number;
  reviewsCount?: number;
  mapsUrl?: string;
  matchedKeyword: string;
}

export interface AreaPriorityItem {
  screenId: string;
  screenName: string;
  priorityRank: number;
  reasoning: string;
}

export interface BusinessTypeRecommendation {
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
}

export interface AreaContentAnalysis {
  id: string;
  screenIds: string[];
  screenNames: string[];
  status: "ok" | "no_businesses_found";
  businesses: NearbyBusiness[];
  areaPriority: AreaPriorityItem[];
  businessTypeRecommendations: BusinessTypeRecommendation[];
  topRecommendation?: string;
  topRecommendationReasoning?: string;
  createdAt?: string;
}

export interface ContentFormatSuggestion {
  format: string;
  reasoning: string;
}

export interface RecordingGuide {
  openingHook: string;
  shotList: string[];
  bRoll: string[];
  interviewQuestions: string[];
  closingScene: string;
}

export interface ContentPlanBusinessRef {
  name?: string;
  address?: string;
  category?: string;
  mapsUrl?: string;
  rating?: number;
}

export interface ContentPlan {
  id: string;
  analysisId?: string;
  screenId?: string;
  companyId?: string;
  businessType: string;
  businessRef: ContentPlanBusinessRef;
  contentObjective: string;
  contentObjectiveReasoning: string;
  recommendedFormats: ContentFormatSuggestion[];
  recordingGuide: RecordingGuide;
  suggestedInterviewQuestions: string[];
  suggestedHooks: string[];
  reasoning: string;
  createdAt?: string;
}

export const SCREENS: Screen[] = [
  { id: "scr-1", name: "แลนด์มาร์คราชพฤกษ์", province: "นนทบุรี", area: "ราชพฤกษ์", areaType: "Residential", size: "12x6 m", resolution: "1920x960", availability: "Available", rate15s: 250, rateDaily: 18000, rateMonthly: 420000, dailyImpressions: 142000, audience: ["Commuters", "Residents"], hours: "06:30 - 22:00" },
  { id: "scr-2", name: "แยกพงษ์เพชร", province: "นนทบุรี", area: "พงษ์เพชร", areaType: "CBD", size: "10x5 m", resolution: "1600x800", availability: "Occupied", rate15s: 280, rateDaily: 19500, rateMonthly: 445000, dailyImpressions: 158000, audience: ["Commuters", "Office"], hours: "07:00 - 22:00" },
  { id: "scr-3", name: "แยกเดชาติวงศ์", province: "นครสวรรค์", area: "เดชาติวงศ์", areaType: "Highway", size: "14x7 m", resolution: "1920x960", availability: "Available", rate15s: 180, rateDaily: 13500, rateMonthly: 310000, dailyImpressions: 98000, audience: ["Commuters", "Tourists"], hours: "07:00 - 22:00" },
  { id: "scr-4", name: "สี่แยกชะอำ", province: "เพชรบุรี", area: "ชะอำ", areaType: "Highway", size: "10x5 m", resolution: "1600x800", availability: "Available", rate15s: 200, rateDaily: 14500, rateMonthly: 335000, dailyImpressions: 112000, audience: ["Tourists", "Commuters"], hours: "06:00 - 22:00" },
  { id: "scr-5", name: "แลนด์มาร์คมหาชัย", province: "สมุทรสาคร", area: "มหาชัย", areaType: "CBD", size: "12x6 m", resolution: "1920x960", availability: "Occupied", rate15s: 220, rateDaily: 16000, rateMonthly: 370000, dailyImpressions: 128000, audience: ["Commuters", "Shoppers"], hours: "06:00 - 22:00" },
  { id: "scr-6", name: "แยกรร.ดาวรุ่ง", province: "ภูเก็ต", area: "เมืองภูเก็ต", areaType: "Nightlife", size: "10x5 m", resolution: "1600x800", availability: "Available", rate15s: 320, rateDaily: 22000, rateMonthly: 510000, dailyImpressions: 168000, audience: ["Tourists", "Night"], hours: "07:00 - 22:00" },
  { id: "scr-7", name: "แยกเทพประสิทธิ์", province: "ชลบุรี", area: "พัทยา", areaType: "Nightlife", size: "12x6 m", resolution: "1920x960", availability: "Maintenance", rate15s: 300, rateDaily: 21000, rateMonthly: 485000, dailyImpressions: 175000, audience: ["Tourists", "Night"], hours: "06:00 - 22:00" },
  { id: "scr-8", name: "แยกพัทยาเหนือ", province: "ชลบุรี", area: "พัทยาเหนือ", areaType: "CBD", size: "14x7 m", resolution: "1920x960", availability: "Occupied", rate15s: 310, rateDaily: 21500, rateMonthly: 495000, dailyImpressions: 182000, audience: ["Tourists", "Shoppers"], hours: "06:00 - 22:00" },
  { id: "scr-9", name: "ถนนเทพคุณากร", province: "ฉะเชิงเทรา", area: "เมืองฉะเชิงเทรา", areaType: "Highway", size: "10x5 m", resolution: "1600x800", availability: "Available", rate15s: 170, rateDaily: 12500, rateMonthly: 285000, dailyImpressions: 92000, audience: ["Commuters", "Residents"], hours: "07:00 - 21:00" },
];

export const COMPANIES: Company[] = [
  { id: "c1", name: "กาแฟภูเขา Coffee Roasters", type: "Direct Client", subType: "Restaurant", industry: "F&B", province: "เชียงใหม่", status: "Active", tier: "Gold", leadScore: 72, aiClass: "Warm", annualBudget: "200K–500K THB", totalDealValue: 380000, assignedTo: "พิมพ์ใจ", lastActivity: "2 ชม. ก่อน", website: "phukhao.coffee", size: "11-50", source: "LINE OA", tags: ["Repeat", "High Budget"], summary: "เครือร้านกาแฟ specialty 7 สาขาในภาคเหนือ กำลังขยายเข้ากรุงเทพ Q2 มีงบโฆษณาประจำ และเน้น branding มากกว่า performance" },
  { id: "c2", name: "คลินิกผิวพรรณ Dermaglow", type: "Direct Client", subType: "Clinic", industry: "Healthcare", province: "กรุงเทพมหานคร", status: "Recurring", tier: "Platinum", leadScore: 88, aiClass: "Hot", annualBudget: "500K–1M THB", totalDealValue: 920000, assignedTo: "ธนกฤต", lastActivity: "เมื่อวาน", website: "dermaglow.co.th", size: "51-200", source: "Referral", tags: ["VIP", "Repeat"], summary: "เครือคลินิกความงาม 12 สาขาใน กทม. และปริมณฑล มีการทำ digital marketing สม่ำเสมอ และมองหาช่องทาง branding offline" },
  { id: "c3", name: "Bangkok Bites Agency", type: "Agency", subType: "Full-Service Agency", industry: "Advertising", province: "กรุงเทพมหานคร", status: "Active", tier: "Platinum", leadScore: 92, aiClass: "Agency Upsell", annualBudget: "1M+ THB", totalDealValue: 1850000, assignedTo: "ปิยะ", lastActivity: "3 ชม. ก่อน", website: "bangkokbites.com", size: "51-200", source: "Outbound", tags: ["VIP", "Repeat"], summary: "Full-service agency ที่มี client เป็นแบรนด์อาหารกลาง-ใหญ่ เคยซื้อสื่อ DOOH กับเรา 4 แคมเปญ และกำลังต่อยอด" },
  { id: "c4", name: "ร้านอาหารทะเลครัวกัปตัน", type: "Direct Client", subType: "Restaurant", industry: "F&B", province: "ภูเก็ต", status: "Prospect", tier: "Silver", leadScore: 55, aiClass: "Warm", annualBudget: "50K–200K THB", totalDealValue: 0, assignedTo: "วิภา", lastActivity: "3 วันก่อน", size: "11-50", source: "Bulk Import", tags: ["Seasonal"], summary: "ร้านอาหารทะเลขนาดกลาง 2 สาขา เน้นกลุ่มนักท่องเที่ยว ฤดูกาล High season ต.ค.-มี.ค." },
  { id: "c5", name: "Pure Property Phuket", type: "Direct Client", subType: "SME", industry: "Real Estate", province: "ภูเก็ต", status: "Active", tier: "Gold", leadScore: 78, aiClass: "Hot", annualBudget: "500K–1M THB", totalDealValue: 650000, assignedTo: "ธนกฤต", lastActivity: "วันนี้", website: "pureproperty.co.th", size: "11-50", source: "Website", tags: ["High Budget"], summary: "บริษัทอสังหาฯ ในภูเก็ต กำลังเปิดตัวโครงการคอนโดใหม่ใจกลางป่าตอง ต้องการสร้าง awareness ในกลุ่มนักลงทุน" },
  { id: "c6", name: "Creative Hub Studio", type: "Agency", subType: "Creative Agency", industry: "Advertising", province: "กรุงเทพมหานคร", status: "Active", tier: "Gold", leadScore: 74, aiClass: "Agency Upsell", annualBudget: "500K–1M THB", totalDealValue: 540000, assignedTo: "ปิยะ", lastActivity: "5 ชม. ก่อน", website: "creativehub.studio", size: "11-50", source: "Referral", tags: ["Repeat"], summary: "Creative boutique ที่ดูแลแบรนด์ lifestyle 8 ราย ส่วนใหญ่เป็น SME ที่ outsourcing ทั้ง production และ media buying" },
  { id: "c7", name: "ฟิตเนสเฮ้าส์ FitnHouse", type: "Direct Client", subType: "SME", industry: "Health & Fitness", province: "ชลบุรี", status: "Prospect", tier: "Silver", leadScore: 48, aiClass: "Warm", annualBudget: "50K–200K THB", totalDealValue: 0, assignedTo: "พิมพ์ใจ", lastActivity: "1 สัปดาห์ก่อน", website: "fitnhouse.com", size: "11-50", source: "Bulk Import", tags: [], summary: "ฟิตเนสในพัทยา 3 สาขา กำลังเปิดสาขาที่ 4 ที่บางเสร่ ต้องการสร้างการรับรู้ในพื้นที่ใหม่" },
  { id: "c8", name: "อิเล็กทรอนิกส์ TT Mart", type: "Direct Client", subType: "Retail", industry: "Retail", province: "นนทบุรี", status: "Recurring", tier: "Gold", leadScore: 80, aiClass: "Hot", annualBudget: "200K–500K THB", totalDealValue: 480000, assignedTo: "ธนกฤต", lastActivity: "เมื่อวาน", size: "51-200", source: "Website", tags: ["Repeat", "Seasonal"], summary: "เครือร้านเครื่องใช้ไฟฟ้า 6 สาขา มียอดขายสูงในช่วง mega sale รายไตรมาส" },
  { id: "c9", name: "Big Bang Events Co.", type: "Agency", subType: "Media Agency", industry: "Events", province: "กรุงเทพมหานคร", status: "Active", tier: "Gold", leadScore: 70, aiClass: "Agency Upsell", annualBudget: "500K–1M THB", totalDealValue: 420000, assignedTo: "ปิยะ", lastActivity: "วันนี้", website: "bigbangevents.co", size: "11-50", source: "Outbound", tags: ["Event-based"], summary: "Event agency เชี่ยวชาญ concert และ exhibition จัดงาน 30+ events ต่อปี" },
  { id: "c10", name: "เลม่อนเฮ้าส์ ของหวาน", type: "Direct Client", subType: "Restaurant", industry: "F&B", province: "กรุงเทพมหานคร", status: "Prospect", tier: "Bronze", leadScore: 32, aiClass: "Cold", annualBudget: "<50K THB", totalDealValue: 0, assignedTo: "วิภา", lastActivity: "2 สัปดาห์ก่อน", size: "1-10", source: "Bulk Import", tags: [], summary: "ร้านของหวาน 1 สาขาในทองหล่อ กำลังพิจารณาการตลาด offline เป็นครั้งแรก" },
  { id: "c11", name: "Thai Wellness Spa Group", type: "Direct Client", subType: "Clinic", industry: "Wellness", province: "เพชรบุรี", status: "Active", tier: "Gold", leadScore: 76, aiClass: "Hot", annualBudget: "200K–500K THB", totalDealValue: 295000, assignedTo: "พิมพ์ใจ", lastActivity: "วันนี้", website: "thaiwellness.spa", size: "11-50", source: "Referral", tags: ["High Budget"], summary: "เครือสปา 5 สาขาในชะอำ-หัวหิน เน้นกลุ่มนักท่องเที่ยวต่างชาติ" },
  { id: "c12", name: "MotorMax Auto Dealer", type: "Direct Client", subType: "Retail", industry: "Automotive", province: "ชลบุรี", status: "Inactive", tier: "Silver", leadScore: 42, aiClass: "Cold", annualBudget: "200K–500K THB", totalDealValue: 180000, assignedTo: "ธนกฤต", lastActivity: "1 เดือนก่อน", size: "11-50", source: "Outbound", tags: [], summary: "ตัวแทนจำหน่ายรถยนต์มือสอง 3 โชว์รูม กลับมาทำการตลาดอีกครั้งหลังหยุดไป 6 เดือน" },
];

export const CONTACTS: Contact[] = [
  { id: "ct1", name: "คุณภูริ จันทรเสนา", companyId: "c1", jobTitle: "Founder & CEO", roleType: "Decision Maker", phone: "081-234-5678", lineId: "@phuri.coffee", email: "phuri@phukhao.coffee", preferred: "LINE", status: "Active", lastContacted: "2 ชม. ก่อน", assignedTo: "พิมพ์ใจ" },
  { id: "ct2", name: "คุณพลอย วงศ์ประเสริฐ", companyId: "c2", jobTitle: "Marketing Director", roleType: "Budget Holder", phone: "086-345-6789", lineId: "@ploy.derma", email: "ploy@dermaglow.co.th", preferred: "Email", status: "Engaged", lastContacted: "เมื่อวาน", assignedTo: "ธนกฤต" },
  { id: "ct3", name: "Mr. Kevin Tan", companyId: "c3", jobTitle: "Head of Strategy", roleType: "Decision Maker", phone: "098-111-2233", lineId: "@kevin.bbites", email: "kevin@bangkokbites.com", preferred: "Meeting", status: "Active", lastContacted: "3 ชม. ก่อน", assignedTo: "ปิยะ" },
  { id: "ct4", name: "คุณกัปตัน สมศักดิ์", companyId: "c4", jobTitle: "เจ้าของกิจการ", roleType: "Decision Maker", phone: "081-555-6677", lineId: "@captain.seafood", email: "captain@seafood.th", preferred: "LINE", status: "Cold", lastContacted: "3 วันก่อน", assignedTo: "วิภา" },
  { id: "ct5", name: "คุณณัฐพล รุ่งโรจน์", companyId: "c5", jobTitle: "Sales Manager", roleType: "Influencer", phone: "087-888-9900", lineId: "@nat.pure", email: "nat@pureproperty.co.th", preferred: "Phone", status: "Engaged", lastContacted: "วันนี้", assignedTo: "ธนกฤต" },
  { id: "ct6", name: "คุณริน เธียรประสิทธิ์", companyId: "c6", jobTitle: "Account Director", roleType: "Decision Maker", phone: "082-111-4455", lineId: "@rin.creative", email: "rin@creativehub.studio", preferred: "LINE", status: "Active", lastContacted: "5 ชม. ก่อน", assignedTo: "ปิยะ" },
  { id: "ct7", name: "คุณบาส อภินันท์", companyId: "c7", jobTitle: "Owner", roleType: "Decision Maker", phone: "089-222-3344", lineId: "@bas.fit", email: "bas@fitnhouse.com", preferred: "Phone", status: "Cold", lastContacted: "1 สัปดาห์ก่อน", assignedTo: "พิมพ์ใจ" },
  { id: "ct8", name: "คุณวิทยา ตั้งจิตเจริญ", companyId: "c8", jobTitle: "Marketing Lead", roleType: "Budget Holder", phone: "086-444-5566", lineId: "@witt.ttmart", email: "witt@ttmart.th", preferred: "Email", status: "Engaged", lastContacted: "เมื่อวาน", assignedTo: "ธนกฤต" },
  { id: "ct9", name: "คุณนิว สุริยะ", companyId: "c9", jobTitle: "Producer", roleType: "Decision Maker", phone: "081-666-7788", lineId: "@new.bigbang", email: "new@bigbangevents.co", preferred: "Meeting", status: "Active", lastContacted: "วันนี้", assignedTo: "ปิยะ" },
];

export const DEALS: Deal[] = [
  { id: "d1", name: "Dermaglow Q3 Brand Push", companyId: "c2", contactId: "ct2", clientType: "Direct Client", stage: "Negotiation", value: 480000, tier: "Platinum", aiClass: "Hot", priority: "Urgent", campaignType: "Brand Awareness", duration: "3 Months", screens: ["scr-1", "scr-5"], expectedClose: "2026-06-14", probability: 75, nextFollowUp: "2026-06-05", notes: "ลูกค้าขอลดราคา 8% แลกกับ commitment 3 เดือน" },
  { id: "d2", name: "Bangkok Bites — TastyTH Launch", companyId: "c3", contactId: "ct3", clientType: "Agency", stage: "Proposal Sent", value: 950000, tier: "Platinum", aiClass: "Agency Upsell", priority: "High", campaignType: "Product Launch", duration: "1 Month", screens: ["scr-1", "scr-2", "scr-5", "scr-8"], expectedClose: "2026-06-20", probability: 60, nextFollowUp: "2026-06-06", notes: "ส่ง proposal แล้ว รอ feedback จาก client side" },
  { id: "d3", name: "Pure Property Phase 2", companyId: "c5", contactId: "ct5", clientType: "Direct Client", stage: "Qualified", value: 380000, tier: "Gold", aiClass: "Hot", priority: "High", campaignType: "Product Launch", duration: "1 Month", screens: ["scr-6"], expectedClose: "2026-06-25", probability: 50, nextFollowUp: "2026-06-07", notes: "นัด site visit ที่ภูเก็ตวันที่ 7" },
  { id: "d4", name: "ภูเขา Coffee BKK Expansion", companyId: "c1", contactId: "ct1", clientType: "Direct Client", stage: "Qualified", value: 220000, tier: "Gold", aiClass: "Warm", priority: "Medium", campaignType: "Brand Awareness", duration: "2 Weeks", screens: ["scr-1", "scr-2"], expectedClose: "2026-07-10", probability: 35, nextFollowUp: "2026-06-08", notes: "Founder สนใจมาก รอตัดสินใจ store opening date" },
  { id: "d5", name: "TT Mart Mega Sale", companyId: "c8", contactId: "ct8", clientType: "Direct Client", stage: "Won", value: 195000, tier: "Gold", aiClass: "Hot", priority: "Medium", campaignType: "Seasonal", duration: "2 Weeks", screens: ["scr-1", "scr-2"], expectedClose: "2026-06-01", probability: 100, nextFollowUp: "2026-06-15", notes: "Won — เริ่ม campaign 10 มิ.ย." },
  { id: "d6", name: "Wellness Spa Tourist Drive", companyId: "c11", contactId: "ct1", clientType: "Direct Client", stage: "Proposal Sent", value: 165000, tier: "Gold", aiClass: "Hot", priority: "Medium", campaignType: "Ongoing", duration: "3 Months", screens: ["scr-4"], expectedClose: "2026-06-18", probability: 65, nextFollowUp: "2026-06-09", notes: "" },
  { id: "d7", name: "Big Bang Concert Series", companyId: "c9", contactId: "ct9", clientType: "Agency", stage: "Negotiation", value: 320000, tier: "Gold", aiClass: "Agency Upsell", priority: "High", campaignType: "Event", duration: "1 Month", screens: ["scr-7", "scr-8"], expectedClose: "2026-06-22", probability: 70, nextFollowUp: "2026-06-10", notes: "ขอ bundle pricing สำหรับ 3 events ใน Q3" },
  { id: "d8", name: "Creative Hub — Skincare Brand", companyId: "c6", contactId: "ct6", clientType: "Agency", stage: "Lead", value: 140000, tier: "Silver", aiClass: "Agency Upsell", priority: "Medium", campaignType: "Brand Awareness", duration: "1 Month", screens: ["scr-1"], expectedClose: "2026-07-15", probability: 20, nextFollowUp: "2026-06-08", notes: "ส่ง intro deck แล้ว" },
  { id: "d9", name: "FitnHouse บางเสร่ Opening", companyId: "c7", contactId: "ct7", clientType: "Direct Client", stage: "Qualified", value: 78000, tier: "Silver", aiClass: "Warm", priority: "Low", campaignType: "Event", duration: "2 Weeks", screens: ["scr-7"], expectedClose: "2026-07-20", probability: 30, nextFollowUp: "2026-06-12", notes: "" },
  { id: "d10", name: "ครัวกัปตัน High Season Test", companyId: "c4", contactId: "ct4", clientType: "Direct Client", stage: "Lead", value: 42000, tier: "Bronze", aiClass: "Cold", priority: "Low", campaignType: "Test", duration: "1 Week", screens: ["scr-6"], expectedClose: "2026-08-01", probability: 15, nextFollowUp: "2026-06-13", notes: "" },
  { id: "d11", name: "MotorMax Reactivation", companyId: "c12", contactId: "ct8", clientType: "Direct Client", stage: "On Hold", value: 120000, tier: "Silver", aiClass: "Cold", priority: "Low", campaignType: "Ongoing", duration: "1 Month", screens: ["scr-7"], expectedClose: "2026-08-15", probability: 10, nextFollowUp: "2026-06-20", notes: "Pause จนกว่าทีมการตลาด client พร้อม" },
  { id: "d12", name: "เลม่อนเฮ้าส์ First Touch", companyId: "c10", contactId: "ct1", clientType: "Direct Client", stage: "Lost", value: 28000, tier: "Bronze", aiClass: "Cold", priority: "Low", campaignType: "Test", duration: "1 Week", screens: ["scr-1"], expectedClose: "2026-05-20", probability: 0, nextFollowUp: "", notes: "Lost — Budget" },
];

export const ACTIVITIES: Activity[] = [
  { id: "a1", type: "LINE", title: "ตอบคำถาม screens ราคาให้คุณพลอย", date: "2026-06-04T09:30", status: "Done", dealId: "d1", contactId: "ct2", companyId: "c2", summary: "ลูกค้าถามรายละเอียดราคา 3 เดือน สรุปส่ง quotation ตอนบ่าย", assignedTo: "ธนกฤต" },
  { id: "a2", type: "Meeting", title: "Pitch meeting กับ Bangkok Bites", date: "2026-06-04T14:00", status: "Planned", dealId: "d2", contactId: "ct3", companyId: "c3", summary: "Present proposal เต็มรูปแบบ + AI strategy deck", nextAction: "ส่ง revised proposal", assignedTo: "ปิยะ" },
  { id: "a3", type: "Site Visit", title: "Site visit ป่าตอง กับ Pure Property", date: "2026-06-07T10:00", status: "Planned", dealId: "d3", contactId: "ct5", companyId: "c5", summary: "พา client ดูป้ายภูเก็ตและพื้นที่โครงการ", assignedTo: "ธนกฤต" },
  { id: "a4", type: "Call", title: "Follow-up คุณภูริ — coffee BKK", date: "2026-06-04T11:00", status: "Done", dealId: "d4", contactId: "ct1", companyId: "c1", summary: "คุยเรื่อง timing เปิดสาขา confirms ต.ค.", duration: "22 นาที", assignedTo: "พิมพ์ใจ" },
  { id: "a5", type: "Email", title: "ส่ง proposal Wellness Spa", date: "2026-06-03T16:00", status: "Done", dealId: "d6", contactId: "ct1", companyId: "c11", summary: "Sent proposal v2 พร้อม screen mockups", assignedTo: "พิมพ์ใจ" },
  { id: "a6", type: "Demo", title: "AI Dashboard demo — Big Bang", date: "2026-06-05T15:00", status: "Planned", dealId: "d7", contactId: "ct9", companyId: "c9", summary: "Show audience analytics dashboard", assignedTo: "ปิยะ" },
  { id: "a7", type: "Follow-up", title: "ติดตาม Creative Hub", date: "2026-06-08T10:00", status: "Planned", dealId: "d8", contactId: "ct6", companyId: "c6", summary: "Check feedback intro deck", assignedTo: "ปิยะ" },
  { id: "a8", type: "LINE", title: "ทักไปคุย FitnHouse", date: "2026-06-02T13:30", status: "Done", dealId: "d9", contactId: "ct7", companyId: "c7", summary: "ส่ง pricing เบื้องต้น + offer 15% สำหรับสาขาแรก", assignedTo: "พิมพ์ใจ" },
  { id: "a9", type: "Proposal Sent", title: "Proposal Bangkok Bites v3", date: "2026-06-01T17:00", status: "Done", dealId: "d2", contactId: "ct3", companyId: "c3", summary: "ส่ง proposal version 3 หลัง revise screens list", assignedTo: "ปิยะ" },
  { id: "a10", type: "Call", title: "Cold call MotorMax", date: "2026-06-03T11:00", status: "Missed", dealId: "d11", contactId: "ct8", companyId: "c12", summary: "ไม่รับสาย — reschedule สัปดาห์หน้า", assignedTo: "ธนกฤต" },
];

export const TEAM = ["เนท", "กิ๊ก", "หนึ่ง", "แคท", "อาเช่"];
export const INDUSTRIES = ["F&B", "Healthcare", "Real Estate", "Retail", "Advertising", "Events", "Wellness", "Automotive", "Education"];
export const PROVINCES = ["กรุงเทพมหานคร", "นนทบุรี", "ชลบุรี", "นครสวรรค์", "เพชรบุรี", "สมุทรสาคร", "ภูเก็ต", "ฉะเชิงเทรา", "เชียงใหม่"];

export const formatTHB = (n: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(n);

// Exact baht with 2 decimals — for per-second rates (e.g. ฿0.50) and opportunity prices.
export const formatTHB2 = (n: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export const formatNumber = (n: number) =>
  new Intl.NumberFormat("th-TH").format(n);

export const getCompany = (id: string) => COMPANIES.find((c) => c.id === id);
export const getContact = (id: string) => CONTACTS.find((c) => c.id === id);
export const getScreen = (id: string) => SCREENS.find((s) => s.id === id);
