-- Lets the dashboard drill into a funnel stage (or a Monthly Cohorts legend
-- item) and show the actual GHL contacts behind that count, not just a
-- number. Same dedup as rep_outcome_summary (one row per contact+rep, at
-- their most-resolved stage) -- this just returns the rows instead of
-- aggregating them, filtered to whichever underlying stage_bucket(s) the
-- clicked label maps to ("Still working" = new + working, "Unclear" =
-- closed_unclear + unmapped, everything else is a 1:1 mapping).

alter table public.ghl_outcomes add column if not exists contact_name text;

create or replace function public.outcome_contacts(
  p_start date,
  p_end date,
  p_buckets text[],
  p_rep text default null
)
returns table (
  contact_id text,
  contact_name text,
  phone text,
  rep text,
  tag text,
  tag_month date,
  stage_bucket text,
  opportunity_status text,
  dm_collected boolean,
  synced_at timestamptz
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
      and (p_rep is null or rep = p_rep)
  ),
  current_state as (
    select distinct on (contact_id, rep) *
    from ranked
    order by contact_id, rep, bucket_rank desc, synced_at desc
  )
  select
    contact_id, contact_name, phone, rep, tag, tag_month, stage_bucket,
    opportunity_status, dm_collected, synced_at
  from current_state
  where stage_bucket = any(p_buckets)
  order by rep, synced_at desc;
$$;

revoke all on function public.outcome_contacts(date, date, text[], text) from public, anon, authenticated;
