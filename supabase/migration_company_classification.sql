-- Richer company classification (Client Type / Agency Type / partner & marketing fields).
-- Run once in the Supabase SQL Editor.
alter table public.companies
  add column if not exists phone                             text,
  add column if not exists client_type                       text default 'Direct Client',
  add column if not exists agency_type                       text,
  add column if not exists partner_potential_score           integer,
  add column if not exists estimated_annual_marketing_budget text,
  add column if not exists number_of_branches                integer,
  add column if not exists facebook_url                      text,
  add column if not exists instagram_url                     text,
  add column if not exists linkedin_url                      text,
  add column if not exists tiktok_url                        text;

-- Backfill client_type from the legacy `type` column for existing rows.
update public.companies set client_type = type where client_type is null and type is not null;
