-- Campaign types + performance tracking — run once in Supabase SQL Editor.
alter table public.campaigns
  add column if not exists campaign_type  text default 'CLIENT_ACTIVATION',
  add column if not exists performance    jsonb default '{}'::jsonb,
  add column if not exists influencer_perf jsonb default '[]'::jsonb,
  add column if not exists ads            jsonb default '[]'::jsonb;
