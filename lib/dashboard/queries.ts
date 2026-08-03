import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentRangeFor, priorRangeFor, trailingRange } from "./date-range";
import type {
  CallKpis,
  DashboardOverview,
  DashboardPeriod,
  RecentCall,
  RepStats,
  VolumePoint,
} from "./types";

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
