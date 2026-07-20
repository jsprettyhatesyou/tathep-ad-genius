-- Tathep CRM — AI Content Recommendation (field marketing content planner)
-- Run once: Supabase Dashboard → SQL Editor → New query → paste → Run
--
-- area_content_analyses: one row per "วิเคราะห์พื้นที่" click — real nearby
-- businesses (scraped from Google Maps) + AI's area/business-type recommendations.
-- content_plans: one row per generated Content Plan for a chosen business type,
-- linked back to the analysis that grounded it.

create table if not exists public.area_content_analyses (
  id                            text primary key default gen_random_uuid()::text,
  screen_ids                    text[] not null default '{}',
  screen_names                  text[] not null default '{}',
  status                        text not null default 'ok',  -- 'ok' | 'no_businesses_found'
  businesses                    jsonb default '[]'::jsonb,   -- raw NearbyBusiness[] (real grounding data)
  area_priority                 jsonb default '[]'::jsonb,   -- [{screenId, screenName, priorityRank, reasoning}]
  business_type_recommendations jsonb default '[]'::jsonb,
  top_recommendation            text,
  top_recommendation_reasoning  text,
  created_at                    timestamptz not null default now()
);

create table if not exists public.content_plans (
  id                             text primary key default gen_random_uuid()::text,
  analysis_id                    text references public.area_content_analyses(id) on delete cascade,
  screen_id                      text references public.screens(id) on delete set null,
  business_type                  text not null,
  business_ref                   jsonb default '{}'::jsonb,  -- {name, address, category, mapsUrl, rating} snapshot
  content_objective              text,
  content_objective_reasoning    text,
  recommended_formats            jsonb default '[]'::jsonb,  -- [{format, reasoning}]
  recording_guide                jsonb default '{}'::jsonb,  -- {openingHook, shotList[], bRoll[], interviewQuestions[], closingScene}
  suggested_interview_questions  jsonb default '[]'::jsonb,
  suggested_hooks                jsonb default '[]'::jsonb,
  reasoning                      text,
  created_at                     timestamptz not null default now()
);

create index if not exists idx_area_analyses_created  on public.area_content_analyses(created_at desc);
create index if not exists idx_content_plans_analysis on public.content_plans(analysis_id);
create index if not exists idx_content_plans_screen    on public.content_plans(screen_id);

-- lock down: RLS on, no policies (service_role used server-side bypasses)
alter table public.area_content_analyses enable row level security;
alter table public.content_plans        enable row level security;
