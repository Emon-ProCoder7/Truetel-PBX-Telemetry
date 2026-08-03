-- Aggregation functions backing the ops call-analytics dashboard.
-- Called only from server-only code using the service_role key, so these
-- stay SECURITY INVOKER (the default) and are never granted to anon/authenticated.

create or replace function public.call_kpis(p_start date, p_end date)
returns table (
  total_calls bigint,
  inbound_calls bigint,
  outbound_calls bigint,
  connected_calls bigint,
  missed_calls bigint,
  total_talk_seconds bigint,
  avg_talk_seconds numeric,
  active_reps bigint
)
language sql
stable
as $$
  select
    count(*) as total_calls,
    count(*) filter (where call_direction = 'Inbound') as inbound_calls,
    count(*) filter (where call_direction = 'Outbound') as outbound_calls,
    count(*) filter (where call_status = 'Connected') as connected_calls,
    count(*) filter (where call_status is distinct from 'Connected') as missed_calls,
    coalesce(sum(talk_time_seconds), 0) as total_talk_seconds,
    coalesce(avg(talk_time_seconds) filter (where call_status = 'Connected'), 0) as avg_talk_seconds,
    count(distinct agent_name) filter (where agent_name is not null) as active_reps
  from public.calls
  where call_date between p_start and p_end;
$$;

revoke all on function public.call_kpis(date, date) from public, anon, authenticated;

create or replace function public.rep_call_stats(p_start date, p_end date)
returns table (
  agent_name text,
  total_calls bigint,
  inbound_calls bigint,
  outbound_calls bigint,
  connected_calls bigint,
  missed_calls bigint,
  total_talk_seconds bigint,
  avg_talk_seconds numeric
)
language sql
stable
as $$
  select
    coalesce(agent_name, 'Unassigned') as agent_name,
    count(*) as total_calls,
    count(*) filter (where call_direction = 'Inbound') as inbound_calls,
    count(*) filter (where call_direction = 'Outbound') as outbound_calls,
    count(*) filter (where call_status = 'Connected') as connected_calls,
    count(*) filter (where call_status is distinct from 'Connected') as missed_calls,
    coalesce(sum(talk_time_seconds), 0) as total_talk_seconds,
    coalesce(avg(talk_time_seconds) filter (where call_status = 'Connected'), 0) as avg_talk_seconds
  from public.calls
  where call_date between p_start and p_end
  group by coalesce(agent_name, 'Unassigned')
  order by total_calls desc;
$$;

revoke all on function public.rep_call_stats(date, date) from public, anon, authenticated;

create or replace function public.call_volume_timeseries(p_start date, p_end date, p_agent_name text default null)
returns table (
  call_date date,
  total_calls bigint,
  connected_calls bigint
)
language sql
stable
as $$
  select
    call_date,
    count(*) as total_calls,
    count(*) filter (where call_status = 'Connected') as connected_calls
  from public.calls
  where call_date between p_start and p_end
    and (p_agent_name is null or agent_name = p_agent_name)
  group by call_date
  order by call_date;
$$;

revoke all on function public.call_volume_timeseries(date, date, text) from public, anon, authenticated;
