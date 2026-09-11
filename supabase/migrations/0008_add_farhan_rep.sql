-- Add Farhan (extension 114) as a fourth tracked sales rep, alongside
-- felix/alvi/jack. His GHL pipeline ("Cold Caller - Farhan") is already
-- covered by the STAGE_BUCKET map in n8n/ghl-outcome-sync.json — this
-- migration just widens the rep column's allowed values so his
-- farhan-tagged rows aren't rejected by the check constraint.
--
-- Dex (extension 109) is being added for call-effort tracking only (the
-- `calls` table has no rep enum, so nothing to migrate there) — he is NOT
-- added here, since GHL outcome/tag tracking wasn't requested for him.

alter table public.ghl_outcomes drop constraint if exists ghl_outcomes_rep_check;
alter table public.ghl_outcomes add constraint ghl_outcomes_rep_check
  check (rep in ('felix', 'alvi', 'jack', 'farhan'));
