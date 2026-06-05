-- Brand Activations → execution workflow (planning/tasks/deliverables).
-- Run once in Supabase SQL Editor.
alter table public.campaigns
  add column if not exists owner            text,
  add column if not exists notes            text,
  add column if not exists screens_plan     jsonb default '[]'::jsonb,
  add column if not exists influencers_plan jsonb default '[]'::jsonb,
  add column if not exists deliverables     jsonb default '[]'::jsonb,
  add column if not exists tasks            jsonb default '[]'::jsonb;
