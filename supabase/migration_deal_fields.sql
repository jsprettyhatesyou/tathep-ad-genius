-- Extended opportunity/deal fields + new opportunity-stage vocabulary.
-- Run once in the Supabase SQL Editor.

alter table public.deals
  add column if not exists lead_source        text,
  add column if not exists payment_method     text,
  add column if not exists payment_status     text,
  add column if not exists revenue_type       text,
  add column if not exists campaign_status    text,
  add column if not exists creative_status    text,
  add column if not exists lost_reason        text,
  add column if not exists contract_type      text;

-- Migrate existing stage values to the new opportunity-stage vocabulary.
update public.deals set stage = 'Lead'      where stage = 'New Lead';
update public.deals set stage = 'Qualified' where stage in ('Qualifying', 'Needs Analysis');
