// Dropdown option lists for CRM forms. Mirrors the union types in mock-data.ts.
import { STAGES, TEAM, INDUSTRIES } from "./mock-data";

export const ACCOUNT_TYPES = ["Direct Client", "Agency"] as const;

// ----- Client classification (Tathep sells DOOH to advertisers AND agencies) -----
export const CLIENT_TYPES = [
  { value: "Direct Client", label: "Direct Client", hint: "End advertiser" },
  { value: "Agency", label: "Agency", hint: "Manages advertising for clients" },
  { value: "Partner", label: "Partner", hint: "Strategic partner" },
  { value: "Influencer", label: "Influencer", hint: "Creator / Influencer" },
  { value: "Reseller", label: "Reseller", hint: "Sales partner" },
  { value: "Internal", label: "Internal", hint: "Tathep internal company" },
] as const;

// Agency Type — only shown when Client Type = Agency
export const AGENCY_TYPES = [
  "Advertising Agency", "Digital Marketing Agency", "Media Agency", "Influencer Agency",
  "Creative Agency", "PR Agency", "Event Agency", "Production House", "OOH Agency", "Marketing Consultant",
] as const;

// Industries grouped by category (searchable dropdown). Agency industries kept in their own section.
export const INDUSTRY_GROUPS: { label: string; options: readonly string[] }[] = [
  { label: "Food & Beverage", options: ["F&B / Restaurant", "Cafe / Bakery", "FMCG"] },
  { label: "Retail & E-commerce", options: ["Retail", "Shopping Mall", "E-commerce"] },
  { label: "Property", options: ["Real Estate"] },
  { label: "Travel & Hospitality", options: ["Hotel / Resort", "Travel / Tourism"] },
  { label: "Health & Wellness", options: ["Healthcare", "Beauty / Wellness", "Fitness / Gym"] },
  { label: "Finance", options: ["Banking / Finance", "Insurance"] },
  { label: "Technology & Telecom", options: ["Technology / SaaS", "Telecom"] },
  { label: "Auto & Education", options: ["Automotive", "Education"] },
  { label: "Entertainment & Events", options: ["Entertainment", "Events / Organizer"] },
  { label: "Government & Public", options: ["Government", "NGO / Foundation"] },
  { label: "Agency", options: [...AGENCY_TYPES] },
  { label: "Other", options: ["Other"] },
];

// Flat list of all valid industries (validation / fallback)
export const INDUSTRY_OPTIONS_V2 = INDUSTRY_GROUPS.flatMap((g) => g.options) as readonly string[];
export const ACCOUNT_STATUSES = ["Prospect", "Active", "Recurring", "Inactive", "Lost"] as const;
export const LEAD_TIERS = ["Platinum", "Gold", "Silver", "Bronze"] as const;
export const AI_CLASSES = ["Hot", "Warm", "Cold", "Agency Upsell"] as const;
export const PRIORITIES = ["Urgent", "High", "Medium", "Low"] as const;
export const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"] as const;
export const LEAD_SOURCES = ["Website", "Referral", "Outbound", "LINE OA", "Bulk Import", "Lead Finder", "Event"] as const;
export const LEAD_STATUSES = ["New", "Working", "Qualified", "Unqualified", "Converted"] as const;
export const ANNUAL_BUDGETS = ["<50K THB", "50K–200K THB", "200K–500K THB", "500K–1M THB", "1M+ THB"] as const;

export const CONTACT_ROLES = ["Decision Maker", "Budget Holder", "Influencer", "User", "Gatekeeper"] as const;
export const CONTACT_PREFERRED = ["LINE", "Phone", "Email", "Meeting"] as const;
export const CONTACT_STATUSES = ["Active", "Cold", "Engaged"] as const;

export const CAMPAIGN_TYPES = ["Brand Awareness", "Product Launch", "Seasonal", "Event", "Ongoing", "Test"] as const;
export const DURATIONS = ["1 Week", "2 Weeks", "1 Month", "2 Months", "3 Months", "6 Months"] as const;

export const ACTIVITY_TYPES = ["Call", "Meeting", "LINE", "Email", "Demo", "Proposal Sent", "Follow-up", "Site Visit"] as const;
export const ACTIVITY_STATUSES = ["Planned", "Done", "Missed", "Rescheduled"] as const;

// ----- Deal / Opportunity extended fields -----
export const DEAL_LEAD_SOURCES = [
  "Organic", "Google Search", "Facebook", "Instagram", "TikTok", "LINE OA",
  "Referral", "Partner", "Event", "Sales Outreach", "Existing Customer", "Agency",
] as const;
export const PAYMENT_METHODS = ["Platform", "Account Transfer", "TikTok Shop", "Cash", "Invoice", "Credit Term"] as const;
export const PAYMENT_STATUSES = ["Pending", "Partially Paid", "Paid", "Refunded", "Cancelled", "Overdue"] as const;
export const REVENUE_TYPES = ["Self-Service", "Sales Assisted", "Agency Managed", "Partner Managed"] as const;
export const DEAL_CAMPAIGN_STATUSES = [
  "Draft", "Waiting Approval", "Approved", "Scheduled", "Running", "Paused", "Completed", "Rejected",
] as const;
export const CREATIVE_STATUSES = [
  "Not Submitted", "Pending Review", "Revision Required", "Approved", "Uploaded", "Published",
] as const;
export const LOST_REASONS = [
  "Budget Too High", "No Response", "Competitor Won", "No Need", "Wrong Timing",
  "Technical Issue", "Duplicate Lead", "Internal Decision", "Other",
] as const;
export const SCREEN_INVENTORY = [
  "แยกรร.ดาวรุ่ง", "แยกพงษ์เพชร", "แยกเดชาติวงศ์", "สี่แยกชะอำ", "แยกเทพประสิทธิ์",
  "แลนด์มาร์คราชพฤกษ์", "แยกพัทยาเหนือ", "แลนด์มาร์คมหาชัย", "ถนนเทพคุณากร",
] as const;
export const CONTRACT_TYPES = ["One-Time", "Monthly", "Quarterly", "Yearly", "Subscription"] as const;

// All 77 Thai provinces (Bangkok first, rest alphabetical-ish by Thai).
export const THAI_PROVINCES = [
  "กรุงเทพมหานคร", "กระบี่", "กาญจนบุรี", "กาฬสินธุ์", "กำแพงเพชร", "ขอนแก่น",
  "จันทบุรี", "ฉะเชิงเทรา", "ชลบุรี", "ชัยนาท", "ชัยภูมิ", "ชุมพร",
  "เชียงราย", "เชียงใหม่", "ตรัง", "ตราด", "ตาก", "นครนายก", "นครปฐม",
  "นครพนม", "นครราชสีมา", "นครศรีธรรมราช", "นครสวรรค์", "นนทบุรี", "นราธิวาส",
  "น่าน", "บึงกาฬ", "บุรีรัมย์", "ปทุมธานี", "ประจวบคีรีขันธ์", "ปราจีนบุรี",
  "ปัตตานี", "พระนครศรีอยุธยา", "พะเยา", "พังงา", "พัทลุง", "พิจิตร", "พิษณุโลก",
  "เพชรบุรี", "เพชรบูรณ์", "แพร่", "ภูเก็ต", "มหาสารคาม", "มุกดาหาร", "แม่ฮ่องสอน",
  "ยโสธร", "ยะลา", "ร้อยเอ็ด", "ระนอง", "ระยอง", "ราชบุรี", "ลพบุรี", "ลำปาง",
  "ลำพูน", "เลย", "ศรีสะเกษ", "สกลนคร", "สงขลา", "สตูล", "สมุทรปราการ",
  "สมุทรสงคราม", "สมุทรสาคร", "สระแก้ว", "สระบุรี", "สิงห์บุรี", "สุโขทัย",
  "สุพรรณบุรี", "สุราษฎร์ธานี", "สุรินทร์", "หนองคาย", "หนองบัวลำภู", "อ่างทอง",
  "อำนาจเจริญ", "อุดรธานี", "อุตรดิตถ์", "อุทัยธานี", "อุบลราชธานี",
] as const;

export const STAGE_OPTIONS = STAGES;
export const TEAM_OPTIONS = TEAM;
export const INDUSTRY_OPTIONS = INDUSTRIES;
export const PROVINCE_OPTIONS = THAI_PROVINCES;
export const CAMPAIGN_STATUSES = ["Draft", "Active", "Paused", "Completed", "Cancelled"] as const;
export const SCREEN_AREA_TYPES = ["CBD", "Highway", "Mall", "Residential", "Hospital", "University", "Nightlife", "Industrial"] as const;
export const SCREEN_AVAILABILITY = ["Available", "Occupied", "Maintenance"] as const;

export const INF_PLATFORMS = ["TikTok", "Facebook", "Instagram", "YouTube", "X / Twitter"] as const;
export const INF_CATEGORIES = ["Marketing", "Food", "Travel", "Beauty", "Entertainment", "Lifestyle", "Fitness", "Tech", "Family", "Auto"] as const;
export const INF_CONTENT_STATUS = ["Idle", "Briefed", "In Progress", "Published"] as const;
export const CAMPAIGN_OBJECTIVES = ["Drive Store Visits", "Launch Product", "Grand Opening", "Brand Awareness", "Event Promotion"] as const;
