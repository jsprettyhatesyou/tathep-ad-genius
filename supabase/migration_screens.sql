-- Add real-billboard fields to screens — run once in Supabase SQL Editor.
alter table public.screens
  add column if not exists code            text,
  add column if not exists address         text,
  add column if not exists lat             double precision,
  add column if not exists lng             double precision,
  add column if not exists rate_per_second numeric default 0.25;
