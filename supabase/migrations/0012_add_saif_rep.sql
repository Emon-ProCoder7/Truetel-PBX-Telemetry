-- Add Saif as a sixth tracked rep in ghl_outcomes, alongside
-- felix/alvi/jack/farhan/mark. Saif is tag-only: he books meetings but
-- makes no calls through the PBX, has no extension in the CDR workflow's
-- AGENT_MAP, and has no GHL user account of his own — someone else tags
-- his leads on his behalf with the same mon-yy-saif / dm name
-- collected-saif tags used for every other rep (created in GHL on
-- 2026-11-17). Nothing in the `calls` table or AGENT_MAP needs to change
-- for him, same as Dex's call-effort-only, non-GHL-tracked onboarding in
-- migration 0008 — just the reverse case (GHL-tracked, no calls).

alter table public.ghl_outcomes drop constraint if exists ghl_outcomes_rep_check;
alter table public.ghl_outcomes add constraint ghl_outcomes_rep_check
  check (rep in ('felix', 'alvi', 'jack', 'farhan', 'mark', 'saif'));
