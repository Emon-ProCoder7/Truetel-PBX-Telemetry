-- Sales outcome layer, sourced from GHL (tags + BDM/cold-caller pipeline stages).
-- Synced by a separate, new n8n workflow — does not touch the CDR ingestion
-- workflow or the `calls` table.
--
-- Grain note: GHL's per-opportunity `lastStageChangeAt` was checked live and
-- found to be contaminated by bulk administrative sweeps (many contacts across
-- unrelated tag-months all touched on the same handful of days), not real
-- day-by-day sales activity. So this table intentionally does NOT claim daily
-- accuracy for outcomes — it tracks current stage per contact, attributed to
-- the month on their `mon-yy-rep` tag. Effort (calls) stays fully day-accurate
-- via the existing `calls` table; outcomes are month/year-accurate.

create table if not exists public.ghl_outcomes (
  id uuid primary key default gen_random_uuid(),
  contact_id text not null,
  opportunity_id text not null,
  phone text,
  rep text not null check (rep in ('felix', 'alvi', 'jack')),
  tag text not null,
  tag_month date not null, -- first-of-month, parsed from the mon-yy-rep tag
  pipeline_name text,
  stage_name text,
  stage_id text,
  stage_bucket text not null check (
    stage_bucket in ('new', 'working', 'appointment_booked', 'proposal_sent', 'won', 'lost', 'closed_unclear', 'unmapped')
  ),
  opportunity_status text,
  synced_at timestamptz not null default now(),
  unique (contact_id, opportunity_id)
);

create index if not exists ghl_outcomes_rep_month_idx on public.ghl_outcomes (rep, tag_month);
create index if not exists ghl_outcomes_contact_idx on public.ghl_outcomes (contact_id);
create index if not exists ghl_outcomes_phone_idx on public.ghl_outcomes (phone);

-- RLS on, no policies: anon/authenticated see nothing, same posture as `calls`.
-- n8n and the dashboard both use the service_role key, which bypasses RLS.
alter table public.ghl_outcomes enable row level security;

-- Per-rep summary for a tag_month range. One row per contact (their most
-- recently stage-changed opportunity), so a contact with opportunities in
-- both a cold-caller pipeline and a BDM pipeline is counted once, at their
-- current state.
create or replace function public.rep_outcome_summary(p_start date, p_end date)
returns table (
  rep text,
  tagged_contacts bigint,
  new_count bigint,
  working_count bigint,
  appointment_booked_count bigint,
  proposal_sent_count bigint,
  won_count bigint,
  lost_count bigint,
  unclear_count bigint
)
language sql
stable
as $$
  with ranked as (
    select
      *,
      case stage_bucket
        when 'won' then 7
        when 'lost' then 6
        when 'closed_unclear' then 5
        when 'proposal_sent' then 4
        when 'appointment_booked' then 3
        when 'working' then 2
        when 'new' then 1
        else 0
      end as bucket_rank
    from public.ghl_outcomes
    where tag_month between date_trunc('month', p_start)::date and date_trunc('month', p_end)::date
  ),
  current_state as (
    select distinct on (contact_id) *
    from ranked
    order by contact_id, bucket_rank desc, synced_at desc
  )
  select
    rep,
    count(*) as tagged_contacts,
    count(*) filter (where stage_bucket = 'new') as new_count,
    count(*) filter (where stage_bucket = 'working') as working_count,
    count(*) filter (where stage_bucket = 'appointment_booked') as appointment_booked_count,
    count(*) filter (where stage_bucket = 'proposal_sent') as proposal_sent_count,
    count(*) filter (where stage_bucket = 'won') as won_count,
    count(*) filter (where stage_bucket = 'lost') as lost_count,
    count(*) filter (where stage_bucket in ('closed_unclear', 'unmapped')) as unclear_count
  from current_state
  group by rep
  order by rep;
$$;

revoke all on function public.rep_outcome_summary(date, date) from public, anon, authenticated;

-- Monthly trend per bucket, optionally filtered to one rep. Powers the funnel
-- history chart.
create or replace function public.outcome_monthly_trend(p_rep text default null)
returns table (
  tag_month date,
  stage_bucket text,
  contacts bigint
)
language sql
stable
as $$
  with ranked as (
    select
      *,
      case stage_bucket
        when 'won' then 7
        when 'lost' then 6
        when 'closed_unclear' then 5
        when 'proposal_sent' then 4
        when 'appointment_booked' then 3
        when 'working' then 2
        when 'new' then 1
        else 0
      end as bucket_rank
    from public.ghl_outcomes
    where p_rep is null or rep = p_rep
  ),
  current_state as (
    select distinct on (contact_id) *
    from ranked
    order by contact_id, bucket_rank desc, synced_at desc
  )
  select tag_month, stage_bucket, count(*) as contacts
  from current_state
  group by tag_month, stage_bucket
  order by tag_month;
$$;

revoke all on function public.outcome_monthly_trend(text) from public, anon, authenticated;
