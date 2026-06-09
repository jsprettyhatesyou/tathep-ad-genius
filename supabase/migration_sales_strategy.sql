-- Persist the AI-generated sales strategy per account so it survives reloads
-- (no need to regenerate to see it again). Run once in the Supabase SQL Editor.
alter table public.companies
  add column if not exists sales_strategy text;
