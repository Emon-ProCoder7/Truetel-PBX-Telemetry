-- Add Mark (extension 111, previously the "New Rep (111)" placeholder) as a
-- fifth tracked sales rep, alongside felix/alvi/jack/farhan. Full GHL
-- outcome tracking, same as Farhan's onboarding in migration 0008.

alter table public.ghl_outcomes drop constraint if exists ghl_outcomes_rep_check;
alter table public.ghl_outcomes add constraint ghl_outcomes_rep_check
  check (rep in ('felix', 'alvi', 'jack', 'farhan', 'mark'));
