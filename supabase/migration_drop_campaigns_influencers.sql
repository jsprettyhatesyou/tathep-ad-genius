-- Removes the Brand Activations (campaigns) and Influencers features entirely.
-- Confirmed: no other table has a FK into campaigns/influencers, and
-- campaigns.company_id (the only FK campaigns holds) is the only relationship,
-- pointing OUT to companies — dropping these two tables is safe in isolation.
--
-- ⚠️ WARNING: this permanently deletes all campaign/influencer data — irreversible.
-- Back up first (e.g. Supabase Dashboard → Database → Backups, or export the
-- tables to CSV) if you want to keep a copy.
--
-- Run once: Supabase Dashboard → SQL Editor → New query → paste → Run

drop table if exists public.campaigns;
drop table if exists public.influencers;
