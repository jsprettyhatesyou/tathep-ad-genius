-- Brand Activations + Influencers — run once in Supabase SQL Editor.

-- ---------- influencers ----------
create table if not exists public.influencers (
  id                 text primary key default gen_random_uuid()::text,
  name               text not null,
  platform           text,            -- TikTok / Facebook / Instagram / YouTube
  followers          bigint default 0,
  category           text,            -- Marketing / Food / Travel / Beauty ...
  province           text,
  rate_card          text,            -- e.g. "30,000 บาท/คลิป"
  avg_views          bigint default 0,
  engagement_rate    numeric default 0,  -- percent
  content_status     text default 'Idle', -- Idle / Briefed / In Progress / Published
  brands_worked_with text[] default '{}',
  avatar             text,
  created_at         timestamptz not null default now()
);
alter table public.influencers enable row level security;

-- ---------- extend campaigns into activations ----------
alter table public.campaigns
  add column if not exists objective         text,
  add column if not exists screen_ids        text[] default '{}',
  add column if not exists influencer_ids    text[] default '{}',
  add column if not exists content_pieces    integer default 0,
  add column if not exists billboard_reach   bigint default 0,
  add column if not exists influencer_views  bigint default 0,
  add column if not exists social_engagement bigint default 0,
  add column if not exists store_visits      integer default 0,
  add column if not exists qr_scans          integer default 0,
  add column if not exists revenue           bigint default 0,
  add column if not exists ai_insight        text,
  add column if not exists renewal_reasons   text[] default '{}';
