-- Extend call_volume_timeseries with daily talk-time so the per-rep analytics
-- view can compare talk time week-over-week, not just call counts. Return
-- columns changed, so the function must be dropped and recreated.

drop function if exists public.call_volume_timeseries(date, date, text);

create function public.call_volume_timeseries(p_start date, p_end date, p_agent_name text default null)
returns table (
  call_date date,
  total_calls bigint,
  connected_calls bigint,
  talk_seconds bigint
)
language sql
stable
as $$
  select
    call_date,
    count(*) as total_calls,
    count(*) filter (where call_status = 'Connected') as connected_calls,
    coalesce(sum(talk_time_seconds), 0) as talk_seconds
  from public.calls
  where call_date between p_start and p_end
    and (p_agent_name is null or agent_name = p_agent_name)
  group by call_date
  order by call_date;
$$;

revoke all on function public.call_volume_timeseries(date, date, text) from public, anon, authenticated;
