import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TextField,
  NumberField,
  TextareaField,
  SelectField,
  Combobox,
  GroupedCombobox,
  MultiSelect,
  type Option,
} from "@/components/crm/form-kit";
import type { Company, Contact, Deal, Activity, Screen, Campaign, Influencer, Lead } from "@/lib/mock-data";
import { ACTIVATION_STATUS, ACTIVATION_OBJECTIVES, CAMPAIGN_TYPES as ACTIVATION_TYPES, buildScreensPlan, buildInfluencersPlan, generateDefaultTasks } from "@/lib/activation";
import {
  ACCOUNT_TYPES,
  CLIENT_TYPES,
  AGENCY_TYPES,
  INDUSTRY_GROUPS,
  ACCOUNT_STATUSES,
  LEAD_TIERS,
  AI_CLASSES,
  PRIORITIES,
  COMPANY_SIZES,
  LEAD_SOURCES,
  ANNUAL_BUDGETS,
  CONTACT_ROLES,
  CONTACT_PREFERRED,
  CONTACT_STATUSES,
  CAMPAIGN_TYPES,
  DURATIONS,
  ACTIVITY_TYPES,
  ACTIVITY_STATUSES,
  STAGE_OPTIONS,
  TEAM_OPTIONS,
  PROVINCE_OPTIONS,
  CAMPAIGN_STATUSES,
  SCREEN_AREA_TYPES,
  SCREEN_AVAILABILITY,
  INF_PLATFORMS,
  INF_CATEGORIES,
  INF_CONTENT_STATUS,
  CAMPAIGN_OBJECTIVES,
  LEAD_STATUSES,
  DEAL_LEAD_SOURCES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  REVENUE_TYPES,
  DEAL_CAMPAIGN_STATUSES,
  CREATIVE_STATUSES,
  LOST_REASONS,
  SCREEN_INVENTORY,
  CONTRACT_TYPES,
} from "@/lib/crm-options";
import {
  createCompany,
  updateCompany,
  createContact,
  updateContact,
  createDeal,
  updateDeal,
  createActivity,
  updateActivity,
  createScreen,
  updateScreen,
  createCampaign,
  updateCampaign,
  createInfluencer,
  updateInfluencer,
  createLead,
  updateLead,
  convertLead as serverConvertLead,
} from "@/lib/api/crm.functions";

const companyOpts = (companies: Company[]): Option[] =>
  companies.map((c) => ({ value: c.id, label: c.name }));

/* ===================== shared dialog shell ===================== */
function Shell({
  open,
  onOpenChange,
  title,
  children,
  onSubmit,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  children: ReactNode;
  onSubmit: () => void;
  saving: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
          <Button className="bg-fresco hover:bg-fresco/90" onClick={onSubmit} disabled={saving}>
            {saving ? "กำลังบันทึก…" : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

async function run(fn: () => Promise<unknown>, onDone: () => void, setSaving: (v: boolean) => void) {
  setSaving(true);
  try {
    await fn();
    toast.success("บันทึกเรียบร้อย");
    onDone();
  } catch (e: any) {
    toast.error(`บันทึกไม่สำเร็จ: ${e?.message ?? "error"}`);
  } finally {
    setSaving(false);
  }
}

/* ===================== Company ===================== */
export function CompanyDialog({
  open,
  onOpenChange,
  onSaved,
  initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  initial?: Company | null;
}) {
  if (!open) return null;
  return (
    <CompanyForm key={initial?.id ?? "new"} open={open} onOpenChange={onOpenChange} onSaved={onSaved} initial={initial} />
  );
}

function CompanyForm({ open, onOpenChange, onSaved, initial }: any) {
  const [f, setF] = useState<Partial<Company>>(
    initial ?? {
      name: "", clientType: "Direct Client", type: "Direct Client", status: "Prospect", tier: "Bronze", aiClass: "Cold",
      leadScore: 50, industry: "", province: "", size: "11-50", source: "Outbound",
      annualBudget: "50K–200K THB", assignedTo: "", website: "", summary: "", totalDealValue: 0,
      lastActivity: "เพิ่งเพิ่ม", subType: "SME", tags: [],
    },
  );
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Company, v: any) => setF((p) => ({ ...p, [k]: v }));
  // current client type (fallback to legacy `type` for old records)
  const clientType = f.clientType ?? (f.type as string) ?? "Direct Client";
  const isAgency = clientType === "Agency";

  const submit = () => {
    if (!f.name?.trim()) return toast.error("กรุณากรอกชื่อบริษัท");
    // keep legacy `type` in sync (Direct Client vs Agency) so badges/filters/AI keep working
    const payload: Partial<Company> = {
      ...f,
      clientType: clientType as Company["clientType"],
      type: isAgency ? "Agency" : "Direct Client",
      agencyType: isAgency ? f.agencyType : undefined,
    };
    const done = () => { onSaved(); onOpenChange(false); };
    run(
      () => initial
        ? updateCompany({ data: { id: initial.id, patch: payload } })
        : createCompany({ data: { company: payload } }),
      done, setSaving,
    );
  };

  return (
    <Shell open={open} onOpenChange={onOpenChange} title={initial ? "แก้ไขบริษัท" : "เพิ่มบริษัทใหม่"} onSubmit={submit} saving={saving}>
      <TextField label="ชื่อบริษัท" required value={f.name ?? ""} onChange={(v) => set("name", v)} className="sm:col-span-2" />

      {/* --- Classification --- */}
      <SelectField label="Client Type" value={clientType} onChange={(v) => set("clientType", v)} options={[...CLIENT_TYPES]} />
      <GroupedCombobox label="Industry" value={f.industry ?? ""} onChange={(v) => set("industry", v)} groups={INDUSTRY_GROUPS} placeholder="เลือกอุตสาหกรรม…" searchPlaceholder="ค้นหาอุตสาหกรรม…" />
      {isAgency && (
        <SelectField label="Agency Type" value={f.agencyType ?? ""} onChange={(v) => set("agencyType", v)} options={AGENCY_TYPES} className="sm:col-span-2" />
      )}

      <SelectField label="จังหวัด" value={f.province ?? ""} onChange={(v) => set("province", v)} options={PROVINCE_OPTIONS} />
      <SelectField label="สถานะ" value={f.status ?? ""} onChange={(v) => set("status", v)} options={ACCOUNT_STATUSES} />
      <SelectField label="Tier" value={f.tier ?? ""} onChange={(v) => set("tier", v)} options={LEAD_TIERS} />
      <SelectField label="AI Class" value={f.aiClass ?? ""} onChange={(v) => set("aiClass", v)} options={AI_CLASSES} />
      <NumberField label="Lead Score" value={f.leadScore ?? 0} onChange={(v) => set("leadScore", v)} />
      {isAgency && <NumberField label="Partner Potential Score" value={f.partnerPotentialScore ?? 0} onChange={(v) => set("partnerPotentialScore", v)} />}
      <SelectField label="ขนาดบริษัท" value={f.size ?? ""} onChange={(v) => set("size", v)} options={COMPANY_SIZES} />
      <NumberField label="จำนวนสาขา" value={f.numberOfBranches ?? 0} onChange={(v) => set("numberOfBranches", v)} />
      <SelectField label="งบประมาณ/ปี" value={f.annualBudget ?? ""} onChange={(v) => set("annualBudget", v)} options={ANNUAL_BUDGETS} />
      <SelectField label="งบการตลาดต่อปี (ประเมิน)" value={f.estimatedAnnualMarketingBudget ?? ""} onChange={(v) => set("estimatedAnnualMarketingBudget", v)} options={ANNUAL_BUDGETS} />
      <SelectField label="แหล่งที่มา" value={f.source ?? ""} onChange={(v) => set("source", v)} options={LEAD_SOURCES} />
      <SelectField label="ผู้ดูแล" value={f.assignedTo ?? ""} onChange={(v) => set("assignedTo", v)} options={TEAM_OPTIONS} />

      {/* --- Contact & Web --- */}
      <TextField label="เบอร์กลาง (02 / HQ)" value={f.phone ?? ""} onChange={(v) => set("phone", v)} />
      <TextField label="เว็บไซต์" value={f.website ?? ""} onChange={(v) => set("website", v)} />
      <TextField label="Facebook URL" value={f.facebookUrl ?? ""} onChange={(v) => set("facebookUrl", v)} />
      <TextField label="Instagram URL" value={f.instagramUrl ?? ""} onChange={(v) => set("instagramUrl", v)} />
      <TextField label="LinkedIn URL" value={f.linkedinUrl ?? ""} onChange={(v) => set("linkedinUrl", v)} />
      <TextField label="TikTok URL" value={f.tiktokUrl ?? ""} onChange={(v) => set("tiktokUrl", v)} />

      <TextareaField label="สรุป/Notes" value={f.summary ?? ""} onChange={(v) => set("summary", v)} className="sm:col-span-2" />
    </Shell>
  );
}

/* ===================== Contact ===================== */
export function ContactDialog({
  open, onOpenChange, onSaved, initial, companies, defaultCompanyId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  initial?: Contact | null;
  companies: Company[];
  defaultCompanyId?: string;
}) {
  if (!open) return null;
  return (
    <ContactForm key={initial?.id ?? "new"} open={open} onOpenChange={onOpenChange} onSaved={onSaved} initial={initial} companies={companies} defaultCompanyId={defaultCompanyId} />
  );
}

function ContactForm({ open, onOpenChange, onSaved, initial, companies, defaultCompanyId }: any) {
  const [f, setF] = useState<Partial<Contact>>(
    initial ?? {
      name: "", companyId: defaultCompanyId ?? "", jobTitle: "", roleType: "Decision Maker",
      phone: "", lineId: "", email: "", preferred: "LINE", status: "Active",
      assignedTo: "", lastContacted: "เพิ่งเพิ่ม",
    },
  );
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Contact, v: any) => setF((p) => ({ ...p, [k]: v }));

  const submit = () => {
    if (!f.name?.trim()) return toast.error("กรุณากรอกชื่อผู้ติดต่อ");
    if (!f.companyId) return toast.error("กรุณาเลือกบริษัท");
    const done = () => { onSaved(); onOpenChange(false); };
    run(
      () => initial
        ? updateContact({ data: { id: initial.id, patch: f } })
        : createContact({ data: { contact: f } }),
      done, setSaving,
    );
  };

  return (
    <Shell open={open} onOpenChange={onOpenChange} title={initial ? "แก้ไขผู้ติดต่อ" : "เพิ่มผู้ติดต่อใหม่"} onSubmit={submit} saving={saving}>
      <TextField label="ชื่อ" required value={f.name ?? ""} onChange={(v) => set("name", v)} />
      <Combobox label="บริษัท" required value={f.companyId ?? ""} onChange={(v) => set("companyId", v)} options={companyOpts(companies)} placeholder="เลือกบริษัทที่มีอยู่…" searchPlaceholder="ค้นหาบริษัท…" />
      <TextField label="ตำแหน่ง" value={f.jobTitle ?? ""} onChange={(v) => set("jobTitle", v)} />
      <SelectField label="บทบาท" value={f.roleType ?? ""} onChange={(v) => set("roleType", v)} options={CONTACT_ROLES} />
      <TextField label="โทรศัพท์" value={f.phone ?? ""} onChange={(v) => set("phone", v)} />
      <TextField label="LINE ID" value={f.lineId ?? ""} onChange={(v) => set("lineId", v)} />
      <TextField label="อีเมล" value={f.email ?? ""} onChange={(v) => set("email", v)} />
      <SelectField label="ช่องทางที่ชอบ" value={f.preferred ?? ""} onChange={(v) => set("preferred", v)} options={CONTACT_PREFERRED} />
      <SelectField label="สถานะ" value={f.status ?? ""} onChange={(v) => set("status", v)} options={CONTACT_STATUSES} />
      <SelectField label="ผู้ดูแล" value={f.assignedTo ?? ""} onChange={(v) => set("assignedTo", v)} options={TEAM_OPTIONS} />
    </Shell>
  );
}

/* ===================== Deal ===================== */
export function DealDialog({
  open, onOpenChange, onSaved, initial, companies, contacts, defaultCompanyId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  initial?: Deal | null;
  companies: Company[];
  contacts: Contact[];
  defaultCompanyId?: string;
}) {
  if (!open) return null;
  return (
    <DealForm key={initial?.id ?? "new"} open={open} onOpenChange={onOpenChange} onSaved={onSaved} initial={initial} companies={companies} contacts={contacts} defaultCompanyId={defaultCompanyId} />
  );
}

function DealForm({ open, onOpenChange, onSaved, initial, companies, contacts, defaultCompanyId }: any) {
  const [f, setF] = useState<Partial<Deal>>(
    initial ?? {
      name: "", companyId: defaultCompanyId ?? "", contactId: "", clientType: "Direct Client",
      stage: "Lead", value: 0, tier: "Bronze", aiClass: "Cold", priority: "Medium",
      campaignType: "Brand Awareness", duration: "1 Month", probability: 20,
      expectedClose: "", nextFollowUp: "", notes: "", screens: [],
    },
  );
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Deal, v: any) => setF((p) => ({ ...p, [k]: v }));

  const contactOpts: Option[] = (contacts as Contact[])
    .filter((c) => !f.companyId || c.companyId === f.companyId)
    .map((c) => ({ value: c.id, label: c.name }));

  const submit = () => {
    if (!f.name?.trim()) return toast.error("กรุณากรอกชื่อดีล");
    if (!f.companyId) return toast.error("กรุณาเลือกบริษัท");
    const done = () => { onSaved(); onOpenChange(false); };
    run(
      () => initial
        ? updateDeal({ data: { id: initial.id, patch: f } })
        : createDeal({ data: { deal: f } }),
      done, setSaving,
    );
  };

  return (
    <Shell open={open} onOpenChange={onOpenChange} title={initial ? "แก้ไขดีล" : "สร้างดีลใหม่"} onSubmit={submit} saving={saving}>
      <TextField label="ชื่อดีล" required value={f.name ?? ""} onChange={(v) => set("name", v)} className="sm:col-span-2" />
      <Combobox label="บริษัท" required value={f.companyId ?? ""} onChange={(v) => { set("companyId", v); set("contactId", ""); }} options={companyOpts(companies)} placeholder="เลือกบริษัท…" searchPlaceholder="ค้นหาบริษัท…" />
      <Combobox label="ผู้ติดต่อ" value={f.contactId ?? ""} onChange={(v) => set("contactId", v)} options={contactOpts} placeholder="เลือกผู้ติดต่อ…" searchPlaceholder="ค้นหาผู้ติดต่อ…" />
      <SelectField label="ประเภทลูกค้า" value={f.clientType ?? ""} onChange={(v) => set("clientType", v)} options={ACCOUNT_TYPES} />
      <SelectField label="Stage" value={f.stage ?? ""} onChange={(v) => set("stage", v)} options={STAGE_OPTIONS} />
      <NumberField label="มูลค่า (THB)" value={f.value ?? 0} onChange={(v) => set("value", v)} />
      <NumberField label="Probability (%)" value={f.probability ?? 0} onChange={(v) => set("probability", v)} />
      <SelectField label="Tier" value={f.tier ?? ""} onChange={(v) => set("tier", v)} options={LEAD_TIERS} />
      <SelectField label="Priority" value={f.priority ?? ""} onChange={(v) => set("priority", v)} options={PRIORITIES} />
      <SelectField label="ประเภทแคมเปญ" value={f.campaignType ?? ""} onChange={(v) => set("campaignType", v)} options={CAMPAIGN_TYPES} />
      <SelectField label="ระยะเวลา" value={f.duration ?? ""} onChange={(v) => set("duration", v)} options={DURATIONS} />
      <SelectField label="Lead Source" value={f.leadSource ?? ""} onChange={(v) => set("leadSource", v)} options={DEAL_LEAD_SOURCES} />
      <SelectField label="Payment Method" value={f.paymentMethod ?? ""} onChange={(v) => set("paymentMethod", v)} options={PAYMENT_METHODS} />
      <SelectField label="Payment Status" value={f.paymentStatus ?? ""} onChange={(v) => set("paymentStatus", v)} options={PAYMENT_STATUSES} />
      <SelectField label="Revenue Type" value={f.revenueType ?? ""} onChange={(v) => set("revenueType", v)} options={REVENUE_TYPES} />
      <SelectField label="Campaign Status" value={f.campaignStatus ?? ""} onChange={(v) => set("campaignStatus", v)} options={DEAL_CAMPAIGN_STATUSES} />
      <SelectField label="Creative Status" value={f.creativeStatus ?? ""} onChange={(v) => set("creativeStatus", v)} options={CREATIVE_STATUSES} />
      <SelectField label="Contract Type" value={f.contractType ?? ""} onChange={(v) => set("contractType", v)} options={CONTRACT_TYPES} />
      <SelectField label="Lost Reason" value={f.lostReason ?? ""} onChange={(v) => set("lostReason", v)} options={LOST_REASONS} />
      <TextField label="คาดว่าปิด (YYYY-MM-DD)" type="date" value={f.expectedClose ?? ""} onChange={(v) => set("expectedClose", v)} />
      <TextField label="ติดตามครั้งถัดไป" type="date" value={f.nextFollowUp ?? ""} onChange={(v) => set("nextFollowUp", v)} />
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-medium text-muted-foreground">Screen Inventory (ป้าย)</label>
        <MultiSelect label="เลือกป้าย" options={SCREEN_INVENTORY} selected={f.screens ?? []} onChange={(v) => set("screens", v)} />
      </div>
      <TextareaField label="Notes" value={f.notes ?? ""} onChange={(v) => set("notes", v)} className="sm:col-span-2" />
    </Shell>
  );
}

/* ===================== Activity ===================== */
export function ActivityDialog({
  open, onOpenChange, onSaved, initial, companies, contacts, deals, defaultCompanyId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  initial?: Activity | null;
  companies: Company[];
  contacts: Contact[];
  deals: Deal[];
  defaultCompanyId?: string;
}) {
  if (!open) return null;
  return (
    <ActivityForm key={initial?.id ?? "new"} open={open} onOpenChange={onOpenChange} onSaved={onSaved} initial={initial} companies={companies} contacts={contacts} deals={deals} defaultCompanyId={defaultCompanyId} />
  );
}

function ActivityForm({ open, onOpenChange, onSaved, initial, companies, contacts, deals, defaultCompanyId }: any) {
  const [f, setF] = useState<Partial<Activity>>(
    initial ?? {
      type: "Call", title: "", status: "Planned", date: "",
      companyId: defaultCompanyId ?? "", contactId: "", dealId: "",
      assignedTo: "", summary: "", nextAction: "",
    },
  );
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Activity, v: any) => setF((p) => ({ ...p, [k]: v }));

  const contactOpts: Option[] = (contacts as Contact[])
    .filter((c) => !f.companyId || c.companyId === f.companyId)
    .map((c) => ({ value: c.id, label: c.name }));
  const dealOpts: Option[] = (deals as Deal[])
    .filter((d) => !f.companyId || d.companyId === f.companyId)
    .map((d) => ({ value: d.id, label: d.name }));

  const submit = () => {
    if (!f.title?.trim()) return toast.error("กรุณากรอกหัวข้อกิจกรรม");
    const done = () => { onSaved(); onOpenChange(false); };
    run(
      () => initial
        ? updateActivity({ data: { id: initial.id, patch: f } })
        : createActivity({ data: { activity: f } }),
      done, setSaving,
    );
  };

  return (
    <Shell open={open} onOpenChange={onOpenChange} title={initial ? "แก้ไขกิจกรรม" : "บันทึกกิจกรรม"} onSubmit={submit} saving={saving}>
      <TextField label="หัวข้อ" required value={f.title ?? ""} onChange={(v) => set("title", v)} className="sm:col-span-2" />
      <SelectField label="ประเภท" value={f.type ?? ""} onChange={(v) => set("type", v)} options={ACTIVITY_TYPES} />
      <SelectField label="สถานะ" value={f.status ?? ""} onChange={(v) => set("status", v)} options={ACTIVITY_STATUSES} />
      <TextField label="วันเวลา" type="datetime-local" value={f.date ?? ""} onChange={(v) => set("date", v)} />
      <SelectField label="ผู้ดูแล" value={f.assignedTo ?? ""} onChange={(v) => set("assignedTo", v)} options={TEAM_OPTIONS} />
      <Combobox label="บริษัท" value={f.companyId ?? ""} onChange={(v) => { set("companyId", v); set("contactId", ""); set("dealId", ""); }} options={companyOpts(companies)} placeholder="เลือกบริษัท…" searchPlaceholder="ค้นหาบริษัท…" />
      <Combobox label="ผู้ติดต่อ" value={f.contactId ?? ""} onChange={(v) => set("contactId", v)} options={contactOpts} placeholder="เลือกผู้ติดต่อ…" searchPlaceholder="ค้นหา…" />
      <Combobox label="ดีลที่เกี่ยวข้อง" value={f.dealId ?? ""} onChange={(v) => set("dealId", v)} options={dealOpts} placeholder="เลือกดีล…" searchPlaceholder="ค้นหาดีล…" className="sm:col-span-2" />
      <TextareaField label="สรุป" value={f.summary ?? ""} onChange={(v) => set("summary", v)} className="sm:col-span-2" />
      <TextareaField label="Next Action" value={f.nextAction ?? ""} onChange={(v) => set("nextAction", v)} rows={2} className="sm:col-span-2" />
    </Shell>
  );
}

/* ===================== Screen (Billboard) ===================== */
export function ScreenDialog({
  open, onOpenChange, onSaved, initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  initial?: Screen | null;
}) {
  if (!open) return null;
  return <ScreenForm key={initial?.id ?? "new"} open={open} onOpenChange={onOpenChange} onSaved={onSaved} initial={initial} />;
}

function ScreenForm({ open, onOpenChange, onSaved, initial }: any) {
  const [f, setF] = useState<Partial<Screen>>(
    initial ?? {
      name: "", code: "", province: "", area: "", areaType: "CBD", size: "10x5 m", resolution: "1920x1080",
      availability: "Available", rate15s: 0, rateDaily: 0, rateMonthly: 0, dailyImpressions: 0,
      ratePerSecond: 0.25, address: "", lat: undefined, lng: undefined,
      audience: [], hours: "06:00 - 22:00",
    },
  );
  const [audienceText, setAudienceText] = useState((initial?.audience ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Screen, v: any) => setF((p) => ({ ...p, [k]: v }));

  const submit = () => {
    if (!f.name?.trim()) return toast.error("กรุณากรอกชื่อจอ");
    const payload = { ...f, audience: audienceText.split(",").map((s) => s.trim()).filter(Boolean) };
    const done = () => { onSaved(); onOpenChange(false); };
    run(
      () => initial
        ? updateScreen({ data: { id: initial.id, patch: payload } })
        : createScreen({ data: { screen: payload } }),
      done, setSaving,
    );
  };

  return (
    <Shell open={open} onOpenChange={onOpenChange} title={initial ? "แก้ไขจอ LED" : "เพิ่มจอ LED ใหม่"} onSubmit={submit} saving={saving}>
      <TextField label="ชื่อจอ" required value={f.name ?? ""} onChange={(v) => set("name", v)} />
      <TextField label="รหัสป้าย (Analytics)" value={f.code ?? ""} onChange={(v) => set("code", v)} />
      <SelectField label="จังหวัด" value={f.province ?? ""} onChange={(v) => set("province", v)} options={PROVINCE_OPTIONS} />
      <SelectField label="ประเภทพื้นที่" value={f.areaType ?? ""} onChange={(v) => set("areaType", v)} options={SCREEN_AREA_TYPES} />
      <TextField label="พื้นที่/ย่าน" value={f.area ?? ""} onChange={(v) => set("area", v)} />
      <SelectField label="สถานะ" value={f.availability ?? ""} onChange={(v) => set("availability", v)} options={SCREEN_AVAILABILITY} />
      <TextField label="ขนาด (เช่น 10x5 m)" value={f.size ?? ""} onChange={(v) => set("size", v)} />
      <TextField label="ความละเอียด (เช่น 1920x1080)" value={f.resolution ?? ""} onChange={(v) => set("resolution", v)} />
      <NumberField label="เรท/วินาที (บาท)" value={f.ratePerSecond ?? 0.25} onChange={(v) => set("ratePerSecond", v)} />
      <NumberField label="Impressions/วัน" value={f.dailyImpressions ?? 0} onChange={(v) => set("dailyImpressions", v)} />
      <TextField label="เวลาเปิด" value={f.hours ?? ""} onChange={(v) => set("hours", v)} />
      <NumberField label="ละติจูด (lat)" value={f.lat ?? 0} onChange={(v) => set("lat", v)} />
      <NumberField label="ลองจิจูด (lng)" value={f.lng ?? 0} onChange={(v) => set("lng", v)} />
      <TextareaField label="ที่อยู่" value={f.address ?? ""} onChange={(v) => set("address", v)} className="sm:col-span-2" />
      <TextField label="กลุ่มผู้ชม (คั่นด้วย ,)" value={audienceText} onChange={setAudienceText} className="sm:col-span-2" />
    </Shell>
  );
}

/* ===================== Campaign (Brand Activation) ===================== */
export function CampaignDialog({
  open, onOpenChange, onSaved, initial, companies, screens = [], influencers = [],
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  initial?: Campaign | null;
  companies: Company[];
  screens?: Screen[];
  influencers?: Influencer[];
}) {
  if (!open) return null;
  return <CampaignForm key={initial?.id ?? "new"} open={open} onOpenChange={onOpenChange} onSaved={onSaved} initial={initial} companies={companies} screens={screens} influencers={influencers} />;
}

function CampaignForm({ open, onOpenChange, onSaved, initial, companies, screens, influencers }: any) {
  const [f, setF] = useState<Partial<Campaign>>(
    initial ?? {
      name: "", companyId: "", campaignType: "CLIENT_ACTIVATION", status: "Planning", objective: "Brand Awareness", start: "", end: "",
      budget: 0, owner: "", notes: "", screenIds: [], influencerIds: [],
    },
  );
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Campaign, v: any) => setF((p) => ({ ...p, [k]: v }));

  const screenOpts: Option[] = (screens as Screen[]).map((s) => ({ value: s.id, label: s.name }));
  const infOpts: Option[] = (influencers as Influencer[]).map((i) => ({ value: i.id, label: i.name }));

  const submit = () => {
    if (!f.name?.trim()) return toast.error("กรุณากรอกชื่อแคมเปญ");
    // build execution plans from selected screens/influencers (preserve existing workflow status)
    const screensPlan = buildScreensPlan(f.screenIds ?? [], screens, f.start ?? "", f.end ?? "", f.screensPlan ?? []);
    const influencersPlan = buildInfluencersPlan(f.influencerIds ?? [], influencers, f.influencersPlan ?? []);
    const tasks = initial ? (f.tasks ?? []) : generateDefaultTasks(f.start ?? "", f.end ?? "", f.owner ?? "");
    const payload = { ...f, screensPlan, influencersPlan, tasks };
    const done = () => { onSaved(); onOpenChange(false); };
    run(
      () => initial
        ? updateCampaign({ data: { id: initial.id, patch: payload } })
        : createCampaign({ data: { campaign: payload } }),
      done, setSaving,
    );
  };

  return (
    <Shell open={open} onOpenChange={onOpenChange} title={initial ? "แก้ไข Activation" : "สร้าง Brand Activation"} onSubmit={submit} saving={saving}>
      <TextField label="Campaign Name" required value={f.name ?? ""} onChange={(v) => set("name", v)} className="sm:col-span-2" />
      <SelectField label="Campaign Type" value={f.campaignType ?? "CLIENT_ACTIVATION"} onChange={(v) => set("campaignType", v)} options={[...ACTIVATION_TYPES]} className="sm:col-span-2" />
      <Combobox label={f.campaignType === "INTERNAL_MARKETING" ? "Client (Tathep)" : "Client (แบรนด์ลูกค้า)"} value={f.companyId ?? ""} onChange={(v) => set("companyId", v)} options={companyOpts(companies)} placeholder="เลือกบริษัท…" searchPlaceholder="ค้นหาบริษัท…" />
      <SelectField label="Objective" value={f.objective ?? ""} onChange={(v) => set("objective", v)} options={ACTIVATION_OBJECTIVES} />
      <SelectField label="Status" value={(ACTIVATION_STATUS as readonly string[]).includes(f.status ?? "") ? (f.status as string) : "Planning"} onChange={(v) => set("status", v)} options={ACTIVATION_STATUS} />
      <SelectField label="Owner" value={f.owner ?? ""} onChange={(v) => set("owner", v)} options={TEAM_OPTIONS} />
      <TextField label="Start Date" type="date" value={f.start ?? ""} onChange={(v) => set("start", v)} />
      <TextField label="End Date" type="date" value={f.end ?? ""} onChange={(v) => set("end", v)} />
      <NumberField label="Budget (THB)" value={f.budget ?? 0} onChange={(v) => set("budget", v)} className="sm:col-span-2" />
      <div className="sm:col-span-2"><label className="mb-1 block text-xs font-medium text-muted-foreground">Screens (ป้าย)</label><MultiSelect label="เลือกป้าย" options={screenOpts} selected={f.screenIds ?? []} onChange={(v) => set("screenIds", v)} /></div>
      <div className="sm:col-span-2"><label className="mb-1 block text-xs font-medium text-muted-foreground">Influencers</label><MultiSelect label="เลือก influencer" options={infOpts} selected={f.influencerIds ?? []} onChange={(v) => set("influencerIds", v)} /></div>
      <TextareaField label="Notes" value={f.notes ?? ""} onChange={(v) => set("notes", v)} className="sm:col-span-2" />
      {!initial && <p className="sm:col-span-2 text-xs text-muted-foreground">ระบบจะสร้าง task เริ่มต้น 13 ขั้น + booking plan ของป้าย/influencer ให้อัตโนมัติ</p>}
    </Shell>
  );
}

/* ===================== Influencer ===================== */
export function InfluencerDialog({
  open, onOpenChange, onSaved, initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  initial?: Influencer | null;
}) {
  if (!open) return null;
  return <InfluencerForm key={initial?.id ?? "new"} open={open} onOpenChange={onOpenChange} onSaved={onSaved} initial={initial} />;
}

function InfluencerForm({ open, onOpenChange, onSaved, initial }: any) {
  const [f, setF] = useState<Partial<Influencer>>(
    initial ?? {
      name: "", platform: "TikTok", followers: 0, category: "Marketing", province: "",
      rateCard: "", avgViews: 0, engagementRate: 0, contentStatus: "Idle", brandsWorkedWith: [],
    },
  );
  const [brandsText, setBrandsText] = useState((initial?.brandsWorkedWith ?? []).join(", "));
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Influencer, v: any) => setF((p) => ({ ...p, [k]: v }));

  const submit = () => {
    if (!f.name?.trim()) return toast.error("กรุณากรอกชื่อ influencer");
    const payload = { ...f, brandsWorkedWith: brandsText.split(",").map((s) => s.trim()).filter(Boolean) };
    const done = () => { onSaved(); onOpenChange(false); };
    run(
      () => initial
        ? updateInfluencer({ data: { id: initial.id, patch: payload } })
        : createInfluencer({ data: { influencer: payload } }),
      done, setSaving,
    );
  };

  return (
    <Shell open={open} onOpenChange={onOpenChange} title={initial ? "แก้ไข Influencer" : "เพิ่ม Influencer"} onSubmit={submit} saving={saving}>
      <TextField label="ชื่อ" required value={f.name ?? ""} onChange={(v) => set("name", v)} />
      <SelectField label="แพลตฟอร์ม" value={f.platform ?? ""} onChange={(v) => set("platform", v)} options={INF_PLATFORMS} />
      <SelectField label="หมวดหมู่" value={f.category ?? ""} onChange={(v) => set("category", v)} options={INF_CATEGORIES} />
      <SelectField label="จังหวัด" value={f.province ?? ""} onChange={(v) => set("province", v)} options={PROVINCE_OPTIONS} />
      <NumberField label="Followers" value={f.followers ?? 0} onChange={(v) => set("followers", v)} />
      <NumberField label="Avg Views" value={f.avgViews ?? 0} onChange={(v) => set("avgViews", v)} />
      <NumberField label="Engagement Rate (%)" value={f.engagementRate ?? 0} onChange={(v) => set("engagementRate", v)} />
      <SelectField label="Content Status" value={f.contentStatus ?? ""} onChange={(v) => set("contentStatus", v)} options={INF_CONTENT_STATUS} />
      <TextField label="Rate Card" value={f.rateCard ?? ""} onChange={(v) => set("rateCard", v)} className="sm:col-span-2" />
      <TextField label="แบรนด์ที่เคยร่วมงาน (คั่นด้วย ,)" value={brandsText} onChange={setBrandsText} className="sm:col-span-2" />
    </Shell>
  );
}

/* ===================== Lead ===================== */
export function LeadDialog({
  open, onOpenChange, onSaved, initial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
  initial?: Lead | null;
}) {
  if (!open) return null;
  return <LeadForm key={initial?.id ?? "new"} open={open} onOpenChange={onOpenChange} onSaved={onSaved} initial={initial} />;
}

function LeadForm({ open, onOpenChange, onSaved, initial }: any) {
  const [f, setF] = useState<Partial<Lead>>(
    initial ?? { companyName: "", source: "Manual", status: "New", leadScore: 50 },
  );
  const [saving, setSaving] = useState(false);
  const set = (k: keyof Lead, v: any) => setF((p) => ({ ...p, [k]: v }));

  const submit = () => {
    if (!f.companyName?.trim()) return toast.error("กรุณากรอกชื่อบริษัท");
    const done = () => { onSaved(); onOpenChange(false); };
    run(
      () => initial
        ? updateLead({ data: { id: initial.id, patch: f } })
        : createLead({ data: { lead: f } }),
      done, setSaving,
    );
  };

  return (
    <Shell open={open} onOpenChange={onOpenChange} title={initial ? "แก้ไข Lead" : "เพิ่ม Lead ใหม่"} onSubmit={submit} saving={saving}>
      <TextField label="ชื่อบริษัท" required value={f.companyName ?? ""} onChange={(v) => set("companyName", v)} className="sm:col-span-2" />
      <TextField label="ชื่อผู้ติดต่อ" value={f.contactName ?? ""} onChange={(v) => set("contactName", v)} />
      <TextField label="ตำแหน่ง" value={f.jobTitle ?? ""} onChange={(v) => set("jobTitle", v)} />
      <TextField label="เบอร์โทร" value={f.phone ?? ""} onChange={(v) => set("phone", v)} />
      <TextField label="อีเมล" value={f.email ?? ""} onChange={(v) => set("email", v)} />
      <TextField label="LINE ID" value={f.lineId ?? ""} onChange={(v) => set("lineId", v)} />
      <TextField label="เว็บไซต์" value={f.website ?? ""} onChange={(v) => set("website", v)} />
      <SelectField label="จังหวัด" value={f.province ?? ""} onChange={(v) => set("province", v)} options={PROVINCE_OPTIONS} />
      <GroupedCombobox label="Industry" value={f.industry ?? ""} onChange={(v) => set("industry", v)} groups={INDUSTRY_GROUPS} placeholder="เลือก industry…" searchPlaceholder="ค้นหา…" />
      <SelectField label="Client Type" value={f.clientType ?? ""} onChange={(v) => { set("clientType", v as any); if (v !== "Agency") set("agencyType", undefined); }} options={CLIENT_TYPES.map((c) => c.value)} />
      {f.clientType === "Agency" && (
        <SelectField label="Agency Type" value={f.agencyType ?? ""} onChange={(v) => set("agencyType", v)} options={AGENCY_TYPES} />
      )}
      <SelectField label="Source" value={f.source ?? "Manual"} onChange={(v) => set("source", v)} options={LEAD_SOURCES} />
      <SelectField label="Status" value={f.status ?? "New"} onChange={(v) => set("status", v as any)} options={LEAD_STATUSES} />
      <NumberField label="Lead Score (0–100)" value={f.leadScore ?? 0} onChange={(v) => set("leadScore", Math.min(100, Math.max(0, v)))} />
      <SelectField label="AI Class" value={f.aiClass ?? ""} onChange={(v) => set("aiClass", v as any)} options={AI_CLASSES} />
      <SelectField label="งบประมาณ (ประมาณ)" value={f.estimatedBudget ?? ""} onChange={(v) => set("estimatedBudget", v)} options={ANNUAL_BUDGETS} className="sm:col-span-2" />
      <TextareaField label="Notes" value={f.notes ?? ""} onChange={(v) => set("notes", v)} className="sm:col-span-2" />
    </Shell>
  );
}

/* ===================== Convert Lead ===================== */
export function ConvertLeadDialog({
  lead, open, onOpenChange, onConverted,
}: {
  lead: Lead;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConverted: (companyId: string) => void;
}) {
  const [createOpp, setCreateOpp] = useState(false);
  const [dealName, setDealName] = useState(`${lead.companyName} — โอกาสใหม่`);
  const [dealValue, setDealValue] = useState(0);
  const [converting, setConverting] = useState(false);

  const doConvert = async () => {
    setConverting(true);
    try {
      const res = await serverConvertLead({
        data: {
          id: lead.id,
          createOpportunity: createOpp,
          dealName: createOpp ? dealName : undefined,
          dealValue: createOpp ? dealValue : undefined,
        },
      });
      toast.success(`แปลง "${lead.companyName}" เป็น Account สำเร็จ`);
      onConverted(res.companyId);
    } catch (e: any) {
      toast.error(`Convert ไม่สำเร็จ: ${e?.message ?? "error"}`);
    } finally {
      setConverting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convert Lead → Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* What will be created */}
          <div className="rounded-lg border border-fresco/20 bg-fresco/5 p-3 text-sm space-y-1.5">
            <p className="font-semibold text-fresco">จะสร้างให้อัตโนมัติ:</p>
            <p className="text-foreground">
              <span>Account — <strong>{lead.companyName}</strong></span>
            </p>
            {lead.contactName && (
              <p className="text-foreground">
                <span>Contact — <strong>{lead.contactName}</strong>{lead.jobTitle ? ` (${lead.jobTitle})` : ""}</span>
              </p>
            )}
          </div>

          {/* Create opportunity toggle */}
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={createOpp}
              onChange={(e) => setCreateOpp(e.target.checked)}
              className="h-4 w-4 accent-fresco"
            />
            <div>
              <p className="text-sm font-medium">สร้าง Opportunity ด้วย</p>
              <p className="text-xs text-muted-foreground">ระบบจะสร้าง deal ใน Pipeline ที่ stage Qualified</p>
            </div>
          </label>

          {createOpp && (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Deal Name</label>
                <input
                  value={dealName}
                  onChange={(e) => setDealName(e.target.value)}
                  className="h-9 w-full rounded-lg border border-input px-3 text-sm focus:border-fresco focus:outline-none focus:ring-2 focus:ring-lake/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">มูลค่า (THB)</label>
                <input
                  type="number"
                  value={dealValue}
                  onChange={(e) => setDealValue(Number(e.target.value))}
                  className="h-9 w-full rounded-lg border border-input px-3 text-sm focus:border-fresco focus:outline-none focus:ring-2 focus:ring-lake/30"
                  min={0}
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>ยกเลิก</Button>
          <Button className="bg-fresco hover:bg-fresco/90" onClick={doConvert} disabled={converting}>
            {converting ? "กำลัง Convert…" : "Convert →"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
