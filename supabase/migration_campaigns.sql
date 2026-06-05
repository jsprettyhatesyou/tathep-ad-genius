-- Campaigns table — run once in Supabase SQL Editor (after schema.sql).
create table if not exists public.campaigns (
  id           text primary key default gen_random_uuid()::text,
  name         text not null,
  company_id   text references public.companies(id) on delete set null,
  status       text default 'Draft',
  start_date   text,
  end_date     text,
  budget       bigint default 0,
  impressions  bigint default 0,
  cpm          integer default 0,
  satisfaction text default '—',
  renewal      integer default 0,
  created_at   timestamptz not null default now()
);

create index if not exists idx_campaigns_company on public.campaigns(company_id);
alter table public.campaigns enable row level security;

-- Seed initial campaigns. Companies are resolved by NAME (resilient to id changes);
-- if a company no longer exists the campaign is still created with company_id = null.
-- Safe to re-run: clears the cm% seed rows first.
delete from public.campaigns where id like 'cm%';
insert into public.campaigns (id, name, company_id, status, start_date, end_date, budget, impressions, cpm, satisfaction, renewal) values
  ('cm1', 'Dermaglow Glow-Up Summer',      (select id from public.companies where name = 'คลินิกผิวพรรณ Dermaglow' limit 1), 'Active',    '2026-05-15', '2026-08-15', 920000, 4250000, 216, '😍', 92),
  ('cm2', 'TT Mart Mega Sale',             (select id from public.companies where name = 'อิเล็กทรอนิกส์ TT Mart' limit 1),   'Active',    '2026-06-10', '2026-06-24', 195000, 1180000, 165, '😊', 78),
  ('cm3', 'Pure Property Phase 1',         (select id from public.companies where name = 'Pure Property Phuket' limit 1),     'Completed', '2026-03-01', '2026-04-30', 540000, 3120000, 173, '😍', 88),
  ('cm4', 'Bangkok Bites — TastyTH Pilot', (select id from public.companies where name = 'Bangkok Bites Agency' limit 1),     'Draft',     '2026-07-01', '2026-07-31', 950000, 0,       0,   '—',  0),
  ('cm5', 'Wellness Spa Tourist Drive',    (select id from public.companies where name = 'Thai Wellness Spa Group' limit 1),  'Paused',    '2026-05-01', '2026-07-31', 295000, 1450000, 203, '😊', 65);
