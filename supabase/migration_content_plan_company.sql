-- Tathep CRM — link generated Content Plans to their auto-created Account
-- Run once: Supabase Dashboard → SQL Editor → New query → paste → Run

alter table public.content_plans
  add column if not exists company_id text references public.companies(id) on delete set null;

create index if not exists idx_content_plans_company on public.content_plans(company_id);
