-- Add `rep` to outcome_monthly_trend's output so the dashboard can filter the
-- monthly cohort chart to a single rep client-side (fetch once, switch
-- instantly) instead of needing a network round-trip per rep selection.
-- Return columns changed, so drop + recreate rather than replace.

drop function if exists public.outcome_monthly_trend(text);

create function public.outcome_monthly_trend(p_rep text default null)
returns table (
  tag_month date,
  rep text,
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
  select tag_month, rep, stage_bucket, count(*) as contacts
  from current_state
  group by tag_month, rep, stage_bucket
  order by tag_month, rep;
$$;

revoke all on function public.outcome_monthly_trend(text) from public, anon, authenticated;
