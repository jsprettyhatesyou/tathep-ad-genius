import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getSupabaseAdmin } from "../supabase.server";
import {
  rowToLead,
  leadToRow,
  rowToCompany,
  rowToContact,
  rowToScreen,
  rowToDeal,
  rowToActivity,
  companyToRow,
  contactToRow,
  dealToRow,
  activityToRow,
  screenToRow,
} from "../db-mappers";

/* ============================ READS ============================ */

export const listCompanies = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await getSupabaseAdmin()
    .from("companies")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToCompany);
});

export const listContacts = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await getSupabaseAdmin()
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToContact);
});

export const listScreens = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await getSupabaseAdmin()
    .from("screens")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToScreen);
});

export const listDeals = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await getSupabaseAdmin()
    .from("deals")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToDeal);
});

export const listActivities = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await getSupabaseAdmin()
    .from("activities")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToActivity);
});

/* ============================ WRITES ============================ */

// Pipeline drag-drop: move a deal to a new stage.
export const updateDealStage = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().min(1),
      stage: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await getSupabaseAdmin()
      .from("deals")
      .update({ stage: data.stage })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToDeal(row);
  });

// Generic deal update (used by deal detail editing later).
export const updateDeal = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ id: z.string().min(1), patch: z.record(z.string(), z.any()) }),
  )
  .handler(async ({ data }) => {
    const { data: row, error } = await getSupabaseAdmin()
      .from("deals")
      .update(dealToRow(data.patch as any))
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToDeal(row);
  });

// Bulk-create companies (used by Import Leads & Lead Finder "Add to CRM").
const importCompanySchema = z.object({
  name: z.string().min(1),
  province: z.string().optional(),
  industry: z.string().optional(),
  tier: z.string().optional(),
  aiClass: z.string().optional(),
  summary: z.string().optional(),
  website: z.string().optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
  type: z.string().optional(),
  clientType: z.string().optional(),
  agencyType: z.string().optional(),
  partnerPotentialScore: z.number().optional(),
  estimatedAnnualMarketingBudget: z.string().optional(),
  leadScore: z.number().optional(),
});

export const createCompanies = createServerFn({ method: "POST" })
  .inputValidator(z.object({ companies: z.array(importCompanySchema).min(1) }))
  .handler(async ({ data }) => {
    const rows = data.companies.map((c) =>
      companyToRow({
        name: c.name,
        province: c.province,
        industry: c.industry,
        tier: (c.tier as any) ?? "Bronze",
        aiClass: (c.aiClass as any) ?? "Cold",
        summary: c.summary ?? "",
        website: c.website,
        type: "Direct Client",
        subType: "SME",
        status: "Prospect",
        leadScore: 50,
        annualBudget: "—",
        totalDealValue: 0,
        assignedTo: "—",
        lastActivity: "เพิ่งนำเข้า",
        size: "—",
        source: c.source ?? "Bulk Import",
        tags: [],
      }),
    );
    const { data: inserted, error } = await getSupabaseAdmin()
      .from("companies")
      .insert(rows)
      .select("*");
    if (error) throw new Error(error.message);
    return (inserted ?? []).map(rowToCompany);
  });

// Rich lead import: creates companies (deduped by name, reusing existing) and
// contacts linked to them. Used by /leads/import column-mapping flow.
const leadSchema = z.object({
  companyName: z.string().optional(),
  industry: z.string().optional(),
  companyType: z.string().optional(),
  province: z.string().optional(),
  website: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  lineId: z.string().optional(),
  jobTitle: z.string().optional(),
  role: z.string().optional(),
  tier: z.string().optional(),
  aiClass: z.string().optional(),
  summary: z.string().optional(),
});

const JUNK_COMPANY = new Set(["", "-", ".", "_", "n/a", "na", "none", "null"]);
const isRealCompany = (s?: string) => {
  const t = (s ?? "").trim();
  return t.length > 0 && !JUNK_COMPANY.has(t.toLowerCase());
};

async function insertChunked(db: any, table: string, rows: any[], chunk = 100) {
  let n = 0;
  const out: any[] = [];
  for (let i = 0; i < rows.length; i += chunk) {
    const { data, error } = await db.from(table).insert(rows.slice(i, i + chunk)).select("id,name");
    if (error) throw new Error(`${table}: ${error.message}`);
    n += data?.length ?? 0;
    out.push(...(data ?? []));
  }
  return { count: n, rows: out };
}

export const importLeads = createServerFn({ method: "POST" })
  .inputValidator(z.object({ leads: z.array(leadSchema).min(1) }))
  .handler(async ({ data }) => {
    const db = getSupabaseAdmin();

    // 1) unique real company names + first-seen attributes
    const info = new Map<string, any>();
    for (const l of data.leads) {
      const nm = (l.companyName ?? "").trim();
      if (isRealCompany(nm) && !info.has(nm)) info.set(nm, l);
    }

    // 2) reuse existing companies — fetch all once, match in JS (avoids giant/escaped .in())
    const nameToId = new Map<string, string>();
    {
      const { data: existing, error } = await db.from("companies").select("id,name");
      if (error) throw new Error(`load companies: ${error.message}`);
      (existing ?? []).forEach((c: any) => { if (c.name) nameToId.set(c.name, c.id); });
    }

    // 3) create the missing companies (chunked)
    const toCreate = [...info.keys()]
      .filter((n) => !nameToId.has(n))
      .map((n) => {
        const l = info.get(n);
        const ctype = (l.companyType ?? "").trim();
        const isAgency = /agency|media|creative|digital/i.test(ctype);
        return companyToRow({
          name: n,
          industry: l.industry,
          province: l.province,
          website: l.website,
          tier: "Bronze",
          aiClass: "Cold",
          summary: "",
          type: isAgency ? "Agency" : "Direct Client",
          subType: ctype || "SME",
          status: "Prospect",
          leadScore: 50,
          annualBudget: "—",
          totalDealValue: 0,
          assignedTo: "—",
          lastActivity: "เพิ่งนำเข้า",
          size: "—",
          source: "Bulk Import",
          tags: [],
        });
      });
    let companiesCreated = 0;
    if (toCreate.length) {
      const res = await insertChunked(db, "companies", toCreate);
      res.rows.forEach((c: any) => { if (c.name) nameToId.set(c.name, c.id); });
      companiesCreated = res.count;
    }

    // 4) create contacts (rows with a person name), chunked
    const contactRows = data.leads
      .map((l) => {
        const fullName = [l.firstName, l.lastName].map((s) => (s ?? "").trim()).filter(Boolean).join(" ").trim();
        if (!fullName) return null;
        const nm = (l.companyName ?? "").trim();
        const cid = isRealCompany(nm) ? nameToId.get(nm) : undefined;
        return contactToRow({
          name: fullName,
          companyId: cid,
          jobTitle: l.jobTitle,
          roleType: (l.role as any) || "User",
          phone: l.phone,
          lineId: l.lineId,
          email: l.email,
          preferred: l.email ? "Email" : "Phone",
          status: "Active",
          assignedTo: "—",
          lastContacted: "เพิ่งนำเข้า",
        });
      })
      .filter(Boolean) as any[];

    let contactsCreated = 0;
    if (contactRows.length) {
      contactsCreated = (await insertChunked(db, "contacts", contactRows)).count;
    }

    return { companies: nameToId.size, companiesCreated, contactsCreated };
  });

// Single company create (New Company form).
export const createCompany = createServerFn({ method: "POST" })
  .inputValidator(z.object({ company: z.record(z.string(), z.any()) }))
  .handler(async ({ data }) => {
    const { data: row, error } = await getSupabaseAdmin()
      .from("companies")
      .insert(companyToRow(data.company as any))
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToCompany(row);
  });

// Log an activity.
export const createActivity = createServerFn({ method: "POST" })
  .inputValidator(z.object({ activity: z.record(z.string(), z.any()) }))
  .handler(async ({ data }) => {
    const { data: row, error } = await getSupabaseAdmin()
      .from("activities")
      .insert(activityToRow(data.activity as any))
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToActivity(row);
  });

// Create a contact.
export const createContact = createServerFn({ method: "POST" })
  .inputValidator(z.object({ contact: z.record(z.string(), z.any()) }))
  .handler(async ({ data }) => {
    const { data: row, error } = await getSupabaseAdmin()
      .from("contacts")
      .insert(contactToRow(data.contact as any))
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToContact(row);
  });

/* ---------- companies: update / delete ---------- */
export const updateCompany = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1), patch: z.record(z.string(), z.any()) }))
  .handler(async ({ data }) => {
    const { data: row, error } = await getSupabaseAdmin()
      .from("companies")
      .update(companyToRow(data.patch as any))
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToCompany(row);
  });

export const deleteCompany = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { error } = await getSupabaseAdmin().from("companies").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

// Bulk delete accounts (list checkboxes). Cascades to related deals via FK.
export const deleteCompanies = createServerFn({ method: "POST" })
  .inputValidator(z.object({ ids: z.array(z.string().min(1)).min(1) }))
  .handler(async ({ data }) => {
    const { error } = await getSupabaseAdmin().from("companies").delete().in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ids: data.ids };
  });

/* ---------- contacts: update / delete ---------- */
export const updateContact = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1), patch: z.record(z.string(), z.any()) }))
  .handler(async ({ data }) => {
    const { data: row, error } = await getSupabaseAdmin()
      .from("contacts")
      .update(contactToRow(data.patch as any))
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToContact(row);
  });

export const deleteContact = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { error } = await getSupabaseAdmin().from("contacts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

// Bulk delete contacts (list checkboxes).
export const deleteContacts = createServerFn({ method: "POST" })
  .inputValidator(z.object({ ids: z.array(z.string().min(1)).min(1) }))
  .handler(async ({ data }) => {
    const { error } = await getSupabaseAdmin().from("contacts").delete().in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ids: data.ids };
  });

/* ---------- deals: create / delete ---------- */
export const createDeal = createServerFn({ method: "POST" })
  .inputValidator(z.object({ deal: z.record(z.string(), z.any()) }))
  .handler(async ({ data }) => {
    const { data: row, error } = await getSupabaseAdmin()
      .from("deals")
      .insert(dealToRow(data.deal as any))
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToDeal(row);
  });

export const deleteDeal = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { error } = await getSupabaseAdmin().from("deals").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

/* ---------- activities: update / delete ---------- */
export const updateActivity = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1), patch: z.record(z.string(), z.any()) }))
  .handler(async ({ data }) => {
    const { data: row, error } = await getSupabaseAdmin()
      .from("activities")
      .update(activityToRow(data.patch as any))
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToActivity(row);
  });

export const deleteActivity = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { error } = await getSupabaseAdmin().from("activities").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

/* ---------- screens: create / update / delete ---------- */
export const createScreen = createServerFn({ method: "POST" })
  .inputValidator(z.object({ screen: z.record(z.string(), z.any()) }))
  .handler(async ({ data }) => {
    const { data: row, error } = await getSupabaseAdmin()
      .from("screens")
      .insert(screenToRow(data.screen as any))
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToScreen(row);
  });

export const updateScreen = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1), patch: z.record(z.string(), z.any()) }))
  .handler(async ({ data }) => {
    const { data: row, error } = await getSupabaseAdmin()
      .from("screens")
      .update(screenToRow(data.patch as any))
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToScreen(row);
  });

export const deleteScreen = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { error } = await getSupabaseAdmin().from("screens").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

/* ============================ LEADS (pre-qualification + convert) ============================ */
export const listLeads = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await getSupabaseAdmin()
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToLead);
});

export const createLead = createServerFn({ method: "POST" })
  .inputValidator(z.object({ lead: z.record(z.string(), z.any()) }))
  .handler(async ({ data }) => {
    const { data: row, error } = await getSupabaseAdmin()
      .from("leads")
      .insert(leadToRow(data.lead as any))
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToLead(row);
  });

export const createLeads = createServerFn({ method: "POST" })
  .inputValidator(z.object({ leads: z.array(z.record(z.string(), z.any())).min(1) }))
  .handler(async ({ data }) => {
    const rows = (data.leads as any[]).map((l) => leadToRow(l));
    const { data: inserted, error } = await getSupabaseAdmin().from("leads").insert(rows).select("*");
    if (error) throw new Error(error.message);
    return (inserted ?? []).map(rowToLead);
  });

export const updateLead = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1), patch: z.record(z.string(), z.any()) }))
  .handler(async ({ data }) => {
    const { data: row, error } = await getSupabaseAdmin()
      .from("leads")
      .update(leadToRow(data.patch as any))
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToLead(row);
  });

export const deleteLead = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const { error } = await getSupabaseAdmin().from("leads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { id: data.id };
  });

// Bulk delete leads (list checkboxes).
export const deleteLeads = createServerFn({ method: "POST" })
  .inputValidator(z.object({ ids: z.array(z.string().min(1)).min(1) }))
  .handler(async ({ data }) => {
    const { error } = await getSupabaseAdmin().from("leads").delete().in("id", data.ids);
    if (error) throw new Error(error.message);
    return { ids: data.ids };
  });

// Convert a qualified lead -> Account (company) + Contact (optional) + Opportunity (deal, optional).
export const convertLead = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().min(1),
      createOpportunity: z.boolean().optional(),
      dealName: z.string().optional(),
      dealValue: z.number().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const db = getSupabaseAdmin();
    const { data: leadRow, error: lerr } = await db.from("leads").select("*").eq("id", data.id).single();
    if (lerr || !leadRow) throw new Error(lerr?.message ?? "ไม่พบ lead นี้");
    const lead = rowToLead(leadRow);
    if (lead.convertedCompanyId) throw new Error("lead นี้ถูก convert ไปแล้ว");

    const isAgency = lead.clientType === "Agency";
    // 1) Account
    const { data: coRow, error: cerr } = await db
      .from("companies")
      .insert(
        companyToRow({
          name: lead.companyName,
          clientType: lead.clientType ?? "Direct Client",
          type: isAgency ? "Agency" : "Direct Client",
          agencyType: isAgency ? lead.agencyType : undefined,
          industry: lead.industry,
          province: lead.province,
          website: lead.website,
          phone: lead.phone,
          status: "Prospect",
          tier: lead.aiClass === "Hot" ? "Gold" : "Silver",
          leadScore: lead.leadScore,
          aiClass: lead.aiClass ?? "Warm",
          annualBudget: lead.estimatedBudget,
          assignedTo: lead.assignedTo,
          source: lead.source,
          summary: lead.notes,
          lastActivity: "เพิ่งแปลงจาก Lead",
        }),
      )
      .select("*")
      .single();
    if (cerr || !coRow) throw new Error(cerr?.message ?? "สร้าง Account ไม่สำเร็จ");
    const company = rowToCompany(coRow);

    // 2) Contact (if the lead has a person)
    let contactId: string | undefined;
    if (lead.contactName?.trim()) {
      const { data: ctRow } = await db
        .from("contacts")
        .insert(
          contactToRow({
            name: lead.contactName,
            companyId: company.id,
            jobTitle: lead.jobTitle,
            roleType: "Decision Maker",
            phone: lead.phone,
            lineId: lead.lineId,
            email: lead.email,
            preferred: lead.lineId ? "LINE" : lead.phone ? "Phone" : "Email",
            status: "Active",
            lastContacted: "เพิ่งแปลงจาก Lead",
            assignedTo: lead.assignedTo,
          }),
        )
        .select("*")
        .single();
      contactId = ctRow?.id;
    }

    // 3) Opportunity (optional)
    let dealId: string | undefined;
    if (data.createOpportunity) {
      const { data: dRow } = await db
        .from("deals")
        .insert(
          dealToRow({
            name: data.dealName?.trim() || `${lead.companyName} — โอกาสใหม่`,
            companyId: company.id,
            contactId: contactId,
            clientType: isAgency ? "Agency" : "Direct Client",
            stage: "Qualified",
            value: data.dealValue ?? 0,
            tier: company.tier,
            aiClass: company.aiClass,
            priority: "Medium",
            probability: 25,
          }),
        )
        .select("*")
        .single();
      dealId = dRow?.id;
    }

    // 4) Mark lead converted
    await db.from("leads").update({ status: "Converted", converted_company_id: company.id }).eq("id", lead.id);

    return { companyId: company.id, contactId, dealId };
  });
