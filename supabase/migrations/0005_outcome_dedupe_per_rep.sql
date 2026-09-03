-- Fix: the dedup in rep_outcome_summary/outcome_monthly_trend collapsed a
-- contact's rows down to ONE globally (distinct on contact_id), which is
-- correct for "this contact has two opportunities under the same rep, count
-- once" but wrong for a contact tagged to two different reps at once (found
-- live: one contact carries both aug-26-alvi and aug-26-felix). That case
-- was silently attributing the whole contact to whichever rep's row won an
-- arbitrary tiebreak, undercounting the other rep by one.
--
-- Dedup now happens per (contact_id, rep) instead of per contact_id alone —
-- a genuinely dual-tagged contact counts once under each rep it's tagged to,
-- honestly reflecting the ambiguity in the source data rather than hiding it.

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
    select distinct on (contact_id, rep) *
    from ranked
    order by contact_id, rep, bucket_rank desc, synced_at desc
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
    select distinct on (contact_id, rep) *
    from ranked
    order by contact_id, rep, bucket_rank desc, synced_at desc
  )
  select tag_month, stage_bucket, count(*) as contacts
  from current_state
  group by tag_month, stage_bucket
  order by tag_month;
$$;

revoke all on function public.outcome_monthly_trend(text) from public, anon, authenticated;
