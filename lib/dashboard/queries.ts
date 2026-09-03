import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentRangeFor, priorRangeFor, trailingRange, type DateRange } from "./date-range";
import { forecastCalls } from "./forecast";
import type {
  CallDetail,
  CallKpis,
  DashboardOverview,
  DashboardPeriod,
  OutcomeBucket,
  PeriodAggregate,
  RecentCall,
  RepAnalytics,
  RepOutcomeSummary,
  RepStats,
  SalesResults,
  VolumePoint,
} from "./types";

const REP_CALLS_LIMIT = 1000;

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));

const EMPTY_KPIS: CallKpis = {
  totalCalls: 0,
  inboundCalls: 0,
  outboundCalls: 0,
  connectedCalls: 0,
  missedCalls: 0,
  totalTalkSeconds: 0,
  avgTalkSeconds: 0,
  activeReps: 0,
};

function mapKpis(row: Record<string, unknown> | undefined): CallKpis {
  if (!row) return EMPTY_KPIS;
  return {
    totalCalls: num(row.total_calls),
    inboundCalls: num(row.inbound_calls),
    outboundCalls: num(row.outbound_calls),
    connectedCalls: num(row.connected_calls),
    missedCalls: num(row.missed_calls),
    totalTalkSeconds: num(row.total_talk_seconds),
    avgTalkSeconds: num(row.avg_talk_seconds),
    activeReps: num(row.active_reps),
  };
}

function mapRep(row: Record<string, unknown>): RepStats {
  const totalCalls = num(row.total_calls);
  const connectedCalls = num(row.connected_calls);
  return {
    agentName: String(row.agent_name ?? "Unassigned"),
    totalCalls,
    inboundCalls: num(row.inbound_calls),
    outboundCalls: num(row.outbound_calls),
    connectedCalls,
    missedCalls: num(row.missed_calls),
    totalTalkSeconds: num(row.total_talk_seconds),
    avgTalkSeconds: num(row.avg_talk_seconds),
    connectedRate: totalCalls > 0 ? connectedCalls / totalCalls : 0,
  };
}

function mapVolumePoint(row: Record<string, unknown>): VolumePoint {
  return {
    callDate: String(row.call_date),
    totalCalls: num(row.total_calls),
    connectedCalls: num(row.connected_calls),
    talkSeconds: num(row.talk_seconds),
  };
}

function mapRecentCall(row: Record<string, unknown>): RecentCall {
  return {
    callId: String(row.call_id),
    callTimestamp: String(row.call_timestamp),
    agentName: (row.agent_name as string) ?? null,
    callDirection: (row.call_direction as "Inbound" | "Outbound") ?? null,
    phoneNumber: (row.phone_number as string) ?? null,
    callStatus: (row.call_status as string) ?? null,
    totalDuration: (row.total_duration as string) ?? null,
    talkTime: (row.talk_time as string) ?? null,
  };
}

function mapCallDetail(row: Record<string, unknown>): CallDetail {
  return {
    callId: String(row.call_id),
    callTimestamp: String(row.call_timestamp),
    callDirection: (row.call_direction as "Inbound" | "Outbound") ?? null,
    phoneNumber: (row.phone_number as string) ?? null,
    callStatus: (row.call_status as string) ?? null,
    totalDuration: (row.total_duration as string) ?? null,
    talkTime: (row.talk_time as string) ?? null,
    ringTime: (row.ring_time as string) ?? null,
    recordingFile: (row.recording_file as string) || null,
  };
}

export async function getRepCallDetails(
  agentName: string,
  start: string,
  end: string
): Promise<{ calls: CallDetail[]; truncated: boolean }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("calls")
    .select(
      "call_id, call_timestamp, call_direction, phone_number, call_status, total_duration, talk_time, ring_time, recording_file"
    )
    .eq("agent_name", agentName)
    .gte("call_date", start)
    .lte("call_date", end)
    .order("call_timestamp", { ascending: false })
    .limit(REP_CALLS_LIMIT + 1);

  if (error) throw new Error(`Rep call detail query failed: ${error.message}`);

  const rows = data ?? [];
  const truncated = rows.length > REP_CALLS_LIMIT;
  return {
    calls: rows.slice(0, REP_CALLS_LIMIT).map(mapCallDetail),
    truncated,
  };
}

function sumRange(daily: VolumePoint[], range: DateRange): PeriodAggregate {
  let calls = 0;
  let connected = 0;
  let talkSeconds = 0;
  for (const point of daily) {
    if (point.callDate >= range.start && point.callDate <= range.end) {
      calls += point.totalCalls;
      connected += point.connectedCalls;
      talkSeconds += point.talkSeconds;
    }
  }
  return { calls, connected, connectedRate: calls > 0 ? connected / calls : 0, talkSeconds };
}

function pctDelta(current: number, prior: number): number | null {
  if (prior === 0) return current === 0 ? 0 : null;
  return (current - prior) / prior;
}

function buildInsights(params: {
  agentName: string;
  today: PeriodAggregate;
  yesterday: PeriodAggregate;
  thisWeek: PeriodAggregate;
  lastWeek: PeriodAggregate;
  teamConnectedRateThisWeek: number;
  teamAvgCallsPerRepPerDay: number;
  bestDay: { callDate: string; calls: number } | null;
  trendDirection: "up" | "down" | "flat";
}): string[] {
  const { today, yesterday, thisWeek, lastWeek, teamConnectedRateThisWeek, bestDay, trendDirection } =
    params;
  const insights: string[] = [];

  const todayDelta = today.calls - yesterday.calls;
  if (yesterday.calls > 0 || today.calls > 0) {
    if (todayDelta > 0) insights.push(`${todayDelta} more call${todayDelta === 1 ? "" : "s"} today than yesterday.`);
    else if (todayDelta < 0)
      insights.push(`${Math.abs(todayDelta)} fewer call${Math.abs(todayDelta) === 1 ? "" : "s"} today than yesterday.`);
    else insights.push("Same call count as yesterday so far.");
  }

  const weekPct = pctDelta(thisWeek.calls, lastWeek.calls);
  if (weekPct !== null && lastWeek.calls > 0) {
    const pct = Math.round(Math.abs(weekPct) * 100);
    insights.push(
      weekPct >= 0
        ? `Tracking ${pct}% ahead of last week's pace.`
        : `Tracking ${pct}% behind last week's pace.`
    );
  }

  const rateGap = thisWeek.connectedRate - teamConnectedRateThisWeek;
  if (thisWeek.calls >= 5) {
    if (rateGap >= 0.05) {
      insights.push(
        `Connected rate is ${Math.round(rateGap * 100)}pts above the team average this week — strong outreach quality.`
      );
    } else if (rateGap <= -0.05) {
      insights.push(
        `Connected rate is ${Math.round(Math.abs(rateGap) * 100)}pts below the team average this week — may be worth a coaching check-in.`
      );
    }
  }

  if (bestDay && bestDay.calls > 0) {
    const d = new Date(`${bestDay.callDate}T00:00:00`);
    const label = new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short" }).format(d);
    insights.push(`Best day in the last 30: ${bestDay.calls} calls on ${label}.`);
  }

  if (trendDirection === "up") insights.push("14-day call volume is trending up.");
  else if (trendDirection === "down") insights.push("14-day call volume is trending down.");

  return insights;
}

export async function getRepAnalytics(agentName: string): Promise<RepAnalytics> {
  const supabase = createAdminClient();

  const today = currentRangeFor("today");
  const yesterday = priorRangeFor(today);
  const thisWeek = currentRangeFor("week");
  const lastWeek = priorRangeFor(thisWeek);
  const thisMonth = currentRangeFor("month");
  const lastMonth = priorRangeFor(thisMonth);
  const window70 = trailingRange(70);

  const [repSeriesRes, teamSeriesRes, teamWeekKpisRes] = await Promise.all([
    supabase.rpc("call_volume_timeseries", {
      p_start: window70.start,
      p_end: window70.end,
      p_agent_name: agentName,
    }),
    supabase.rpc("call_volume_timeseries", { p_start: window70.start, p_end: window70.end }),
    supabase.rpc("call_kpis", { p_start: thisWeek.start, p_end: thisWeek.end }),
  ]);

  for (const [label, res] of [
    ["rep daily series", repSeriesRes],
    ["team daily series", teamSeriesRes],
    ["team week kpis", teamWeekKpisRes],
  ] as const) {
    if (res.error) throw new Error(`Rep analytics query failed (${label}): ${res.error.message}`);
  }

  const daily = ((repSeriesRes.data as Record<string, unknown>[] | null) ?? []).map(mapVolumePoint);
  const teamDaily = ((teamSeriesRes.data as Record<string, unknown>[] | null) ?? []).map(mapVolumePoint);
  const teamWeekKpis = mapKpis((teamWeekKpisRes.data as Record<string, unknown>[] | null)?.[0]);

  const todayAgg = sumRange(daily, today);
  const yesterdayAgg = sumRange(daily, yesterday);
  const thisWeekAgg = sumRange(daily, thisWeek);
  const lastWeekAgg = sumRange(daily, lastWeek);
  const thisMonthAgg = sumRange(daily, thisMonth);
  const lastMonthAgg = sumRange(daily, lastMonth);

  const last7 = daily.slice(-7);
  const sevenDayAvgCalls = last7.length > 0 ? last7.reduce((s, d) => s + d.totalCalls, 0) / last7.length : 0;

  const teamWeekTotal = sumRange(teamDaily, thisWeek);
  const daysElapsedThisWeek = Math.max(
    1,
    Math.round(
      (new Date(`${thisWeek.end}T00:00:00Z`).getTime() - new Date(`${thisWeek.start}T00:00:00Z`).getTime()) /
        86_400_000
    ) + 1
  );
  const teamAvgCallsPerRepPerDay =
    teamWeekKpis.activeReps > 0 ? teamWeekTotal.calls / teamWeekKpis.activeReps / daysElapsedThisWeek : 0;

  const last30 = daily.slice(-30);
  const bestDay = last30.reduce<{ callDate: string; calls: number } | null>((best, point) => {
    if (!best || point.totalCalls > best.calls) return { callDate: point.callDate, calls: point.totalCalls };
    return best;
  }, null);

  const { points: forecastNext7, direction: trendDirection } = forecastCalls(
    daily.map((d) => ({ callDate: d.callDate, totalCalls: d.totalCalls })),
    14,
    7
  );

  const insights = buildInsights({
    agentName,
    today: todayAgg,
    yesterday: yesterdayAgg,
    thisWeek: thisWeekAgg,
    lastWeek: lastWeekAgg,
    teamConnectedRateThisWeek: teamWeekTotal.connectedRate,
    teamAvgCallsPerRepPerDay,
    bestDay,
    trendDirection,
  });

  return {
    agentName,
    daily,
    today: todayAgg,
    yesterday: yesterdayAgg,
    thisWeek: thisWeekAgg,
    lastWeek: lastWeekAgg,
    thisMonth: thisMonthAgg,
    lastMonth: lastMonthAgg,
    sevenDayAvgCalls,
    teamAvgCallsPerRepPerDay,
    teamConnectedRateThisWeek: teamWeekTotal.connectedRate,
    forecastNext7,
    trendDirection,
    bestDay,
    insights,
  };
}

export async function getDashboardOverview(period: DashboardPeriod): Promise<DashboardOverview> {
  const supabase = createAdminClient();
  const range = currentRangeFor(period);
  const priorRange = priorRangeFor(range);
  const trend = trailingRange(period === "month" ? 30 : 14);

  const [kpisRes, priorKpisRes, repsRes, timeseriesRes, recentRes] = await Promise.all([
    supabase.rpc("call_kpis", { p_start: range.start, p_end: range.end }),
    supabase.rpc("call_kpis", { p_start: priorRange.start, p_end: priorRange.end }),
    supabase.rpc("rep_call_stats", { p_start: range.start, p_end: range.end }),
    supabase.rpc("call_volume_timeseries", { p_start: trend.start, p_end: trend.end }),
    supabase
      .from("calls")
      .select(
        "call_id, call_timestamp, agent_name, call_direction, phone_number, call_status, total_duration, talk_time"
      )
      .order("call_timestamp", { ascending: false })
      .limit(15),
  ]);

  for (const [label, res] of [
    ["call_kpis", kpisRes],
    ["prior call_kpis", priorKpisRes],
    ["rep_call_stats", repsRes],
    ["call_volume_timeseries", timeseriesRes],
    ["recent calls", recentRes],
  ] as const) {
    if (res.error) throw new Error(`Dashboard query failed (${label}): ${res.error.message}`);
  }

  return {
    period,
    range,
    priorRange,
    kpis: mapKpis((kpisRes.data as Record<string, unknown>[] | null)?.[0]),
    priorKpis: mapKpis((priorKpisRes.data as Record<string, unknown>[] | null)?.[0]),
    reps: ((repsRes.data as Record<string, unknown>[] | null) ?? []).map(mapRep),
    timeseries: ((timeseriesRes.data as Record<string, unknown>[] | null) ?? []).map(
      mapVolumePoint
    ),
    recent: ((recentRes.data as Record<string, unknown>[] | null) ?? []).map(mapRecentCall),
    generatedAt: new Date().toISOString(),
  };
}

function mapRepOutcome(row: Record<string, unknown>): RepOutcomeSummary {
  return {
    rep: row.rep as RepOutcomeSummary["rep"],
    taggedContacts: num(row.tagged_contacts),
    new: num(row.new_count),
    working: num(row.working_count),
    appointmentBooked: num(row.appointment_booked_count),
    proposalSent: num(row.proposal_sent_count),
    won: num(row.won_count),
    lost: num(row.lost_count),
    unclear: num(row.unclear_count),
  };
}

const BUCKET_ALIAS: Record<string, OutcomeBucket> = {
  new: "new",
  working: "working",
  appointment_booked: "appointment_booked",
  proposal_sent: "proposal_sent",
  won: "won",
  lost: "lost",
  closed_unclear: "unclear",
  unmapped: "unclear",
};

/**
 * Sales outcomes, sourced from GHL tags + BDM/cold-caller pipeline stages
 * (synced into `ghl_outcomes` by a separate n8n workflow). Only felix, alvi,
 * and jack carry this tracking today — Samprit and Emon/Toby aren't sales
 * reps and are intentionally excluded here (they still show in the raw call
 * effort table above).
 *
 * Grain: month/year, not daily — see the migration's header comment for why
 * (GHL's stage-change timestamps are contaminated by bulk admin sweeps, not
 * real day-by-day signal). Each contact counts once, at their furthest/most
 * resolved stage across any opportunity they carry.
 */
export async function getSalesResults(
  p_start: string,
  p_end: string,
  view: "month" | "year"
): Promise<SalesResults> {
  const supabase = createAdminClient();

  const [kpisRes, effortRes, outcomesRes, trendRes] = await Promise.all([
    supabase.rpc("call_kpis", { p_start, p_end }),
    supabase.rpc("rep_call_stats", { p_start, p_end }),
    supabase.rpc("rep_outcome_summary", { p_start, p_end }),
    supabase.rpc("outcome_monthly_trend", {}),
  ]);

  for (const [label, res] of [
    ["call_kpis", kpisRes],
    ["rep_call_stats", effortRes],
    ["rep_outcome_summary", outcomesRes],
    ["outcome_monthly_trend", trendRes],
  ] as const) {
    if (res.error) throw new Error(`Sales results query failed (${label}): ${res.error.message}`);
  }

  const trend = ((trendRes.data as Record<string, unknown>[] | null) ?? []).map((row) => ({
    tagMonth: String(row.tag_month),
    rep: row.rep as RepOutcomeSummary["rep"],
    bucket: BUCKET_ALIAS[String(row.stage_bucket)] ?? "unclear",
    contacts: num(row.contacts),
  }));

  return {
    range: { start: p_start, end: p_end },
    view,
    kpis: mapKpis((kpisRes.data as Record<string, unknown>[] | null)?.[0]),
    effort: ((effortRes.data as Record<string, unknown>[] | null) ?? []).map(mapRep),
    outcomes: ((outcomesRes.data as Record<string, unknown>[] | null) ?? []).map(mapRepOutcome),
    trend,
    generatedAt: new Date().toISOString(),
  };
}
