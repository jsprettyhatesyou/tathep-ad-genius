-- Tathep CRM — Quotation / Invoice documents
-- Run once: Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- One table holds both ใบเสนอราคา (quotation) and ใบแจ้งหนี้ (invoice),
-- discriminated by `type`. Line items + computed money totals live here so the
-- printed document is reproducible exactly as issued.

create table if not exists public.deal_documents (
  id              text primary key default gen_random_uuid()::text,
  deal_id         text references public.deals(id) on delete cascade,
  company_id      text references public.companies(id) on delete set null,
  contact_id      text references public.contacts(id) on delete set null,
  type            text not null,                 -- 'quotation' | 'invoice'
  doc_number      text not null,                 -- QT-2026-0001 / INV-2026-0001
  status          text default 'Draft',
  issue_date      text,                          -- YYYY-MM-DD
  due_date        text,                          -- valid-until / due date
  line_items      jsonb default '[]'::jsonb,
  subtotal        bigint default 0,
  discount        bigint default 0,
  vat_rate        numeric default 7,
  vat_amount      bigint default 0,
  total           bigint default 0,
  currency        text default 'THB',
  notes           text,
  terms           text,
  recipient_email text,
  sent_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index if not exists idx_documents_deal    on public.deal_documents(deal_id);
create index if not exists idx_documents_company on public.deal_documents(company_id);
create index if not exists idx_documents_type     on public.deal_documents(type);

-- lock down: RLS on, no policies (service_role used server-side bypasses)
alter table public.deal_documents enable row level security;
