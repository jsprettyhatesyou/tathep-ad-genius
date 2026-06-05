-- Tathep CRM — Supabase schema
-- Run this once in: Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- Tables use text PKs (existing seed ids like "c1" keep working; new rows get a uuid).
-- RLS is enabled with NO policies, so only the service_role key (used server-side
-- via createServerFn) can read/write. The public anon key cannot touch these tables.

-- ---------- companies ----------
create table if not exists public.companies (
  id               text primary key default gen_random_uuid()::text,
  name             text not null,
  type             text,
  sub_type         text,
  industry         text,
  province         text,
  status           text,
  tier             text,
  lead_score       integer default 0,
  ai_class         text,
  annual_budget    text,
  total_deal_value bigint default 0,
  assigned_to      text,
  last_activity    text,
  website          text,
  size             text,
  source           text,
  tags             text[] default '{}',
  summary          text,
  created_at       timestamptz not null default now()
);

-- ---------- contacts ----------
create table if not exists public.contacts (
  id             text primary key default gen_random_uuid()::text,
  name           text not null,
  company_id     text references public.companies(id) on delete set null,
  job_title      text,
  role_type      text,
  phone          text,
  line_id        text,
  email          text,
  preferred      text,
  status         text,
  last_contacted text,
  assigned_to    text,
  created_at     timestamptz not null default now()
);

-- ---------- screens (billboard inventory) ----------
create table if not exists public.screens (
  id                text primary key default gen_random_uuid()::text,
  name              text not null,
  province          text,
  area              text,
  area_type         text,
  size              text,
  resolution        text,
  availability      text,
  rate_15s          integer default 0,
  rate_daily        integer default 0,
  rate_monthly      integer default 0,
  daily_impressions integer default 0,
  audience          text[] default '{}',
  hours             text,
  created_at        timestamptz not null default now()
);

-- ---------- deals ----------
create table if not exists public.deals (
  id              text primary key default gen_random_uuid()::text,
  name            text not null,
  company_id      text references public.companies(id) on delete cascade,
  contact_id      text references public.contacts(id) on delete set null,
  client_type     text,
  stage           text,
  value           bigint default 0,
  tier            text,
  ai_class        text,
  priority        text,
  campaign_type   text,
  duration        text,
  screens         text[] default '{}',
  expected_close  text,
  probability     integer default 0,
  next_follow_up  text,
  notes           text,
  created_at      timestamptz not null default now()
);

-- ---------- activities ----------
create table if not exists public.activities (
  id          text primary key default gen_random_uuid()::text,
  type        text,
  title       text not null,
  date        text,
  status      text,
  deal_id     text references public.deals(id) on delete set null,
  contact_id  text references public.contacts(id) on delete set null,
  company_id  text references public.companies(id) on delete set null,
  summary     text,
  next_action text,
  duration    text,
  assigned_to text,
  created_at  timestamptz not null default now()
);

-- ---------- helpful indexes ----------
create index if not exists idx_contacts_company   on public.contacts(company_id);
create index if not exists idx_deals_company      on public.deals(company_id);
create index if not exists idx_deals_stage        on public.deals(stage);
create index if not exists idx_activities_deal    on public.activities(deal_id);
create index if not exists idx_activities_company on public.activities(company_id);

-- ---------- lock down: RLS on, no policies (service_role bypasses) ----------
alter table public.companies  enable row level security;
alter table public.contacts   enable row level security;
alter table public.screens    enable row level security;
alter table public.deals      enable row level security;
alter table public.activities enable row level security;
