-- Leads (pre-qualification) + convert flow. Run once in the Supabase SQL Editor.
create table if not exists public.leads (
  id                   text primary key default gen_random_uuid()::text,
  company_name         text not null,
  contact_name         text,
  job_title            text,
  phone                text,
  email                text,
  line_id              text,
  website              text,
  province             text,
  industry             text,
  client_type          text,
  agency_type          text,
  source               text default 'Manual',
  status               text default 'New',
  assigned_to          text,
  lead_score           integer default 0,
  ai_class             text,
  estimated_budget     text,
  notes                text,
  converted_company_id text references public.companies(id) on delete set null,
  created_at           timestamptz not null default now()
);
alter table public.leads enable row level security;
