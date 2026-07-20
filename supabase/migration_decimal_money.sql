-- Allow decimals (satang) in money fields — deal value can be e.g. 5045.05.
-- Run once in the Supabase SQL Editor.
alter table public.deals
  alter column value type numeric using value::numeric;

alter table public.companies
  alter column total_deal_value type numeric using total_deal_value::numeric;
