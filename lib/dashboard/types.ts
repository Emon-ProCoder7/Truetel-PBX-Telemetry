export type DashboardPeriod = "today" | "week" | "month";

export type CallKpis = {
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  connectedCalls: number;
  missedCalls: number;
  totalTalkSeconds: number;
  avgTalkSeconds: number;
  activeReps: number;
};

export type RepStats = {
  agentName: string;
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  connectedCalls: number;
  missedCalls: number;
  totalTalkSeconds: number;
  avgTalkSeconds: number;
  connectedRate: number;
};

export type VolumePoint = {
  callDate: string;
  totalCalls: number;
  connectedCalls: number;
};

export type RecentCall = {
  callId: string;
  callTimestamp: string;
  agentName: string | null;
  callDirection: "Inbound" | "Outbound" | null;
  phoneNumber: string | null;
  callStatus: string | null;
  totalDuration: string | null;
  talkTime: string | null;
};

export type DashboardOverview = {
  period: DashboardPeriod;
  range: { start: string; end: string };
  priorRange: { start: string; end: string };
  kpis: CallKpis;
  priorKpis: CallKpis;
  reps: RepStats[];
  timeseries: VolumePoint[];
  recent: RecentCall[];
  generatedAt: string;
};
