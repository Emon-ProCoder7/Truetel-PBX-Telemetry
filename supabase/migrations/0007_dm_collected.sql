-- "DM name collected" tracking: a flat, month-agnostic GHL tag per rep
-- ("dm name collected-felix", "dm name collected-alvi", ...) marking that the
-- rep captured the decision-maker's name for a contact. Unlike the funnel
-- buckets above, this tag carries no month component, so it's stored as a
-- boolean riding on whatever ghl_outcomes row(s) that contact+rep already has
-- from the mon-yy-rep tag sync — it's a milestone on a contact already in the
-- tracked funnel, not a new entry point into it.

alter table public.ghl_outcomes add column if not exists dm_collected boolean not null default false;

create or replace function public.rep_outcome_summary(p_start date, p_end date)
returns table (
  rep text,
  tagged_contacts bigint,
  dm_collected_count bigint,
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
    count(*) filter (where dm_collected) as dm_collected_count,
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
