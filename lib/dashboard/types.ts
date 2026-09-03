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
  talkSeconds: number;
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

export type CallDetail = {
  callId: string;
  callTimestamp: string;
  callDirection: "Inbound" | "Outbound" | null;
  phoneNumber: string | null;
  callStatus: string | null;
  totalDuration: string | null;
  talkTime: string | null;
  ringTime: string | null;
  recordingFile: string | null;
};

export type PeriodAggregate = {
  calls: number;
  connected: number;
  connectedRate: number;
  talkSeconds: number;
};

export type ForecastPoint = {
  callDate: string;
  projectedCalls: number;
};

export type RepAnalytics = {
  agentName: string;
  daily: VolumePoint[];
  today: PeriodAggregate;
  yesterday: PeriodAggregate;
  thisWeek: PeriodAggregate;
  lastWeek: PeriodAggregate;
  thisMonth: PeriodAggregate;
  lastMonth: PeriodAggregate;
  sevenDayAvgCalls: number;
  teamAvgCallsPerRepPerDay: number;
  teamConnectedRateThisWeek: number;
  forecastNext7: ForecastPoint[];
  trendDirection: "up" | "down" | "flat";
  bestDay: { callDate: string; calls: number } | null;
  insights: string[];
};

export type OutcomeBucket =
  | "new"
  | "working"
  | "appointment_booked"
  | "proposal_sent"
  | "won"
  | "lost"
  | "unclear";

export type RepOutcomeSummary = {
  rep: "felix" | "alvi" | "jack";
  taggedContacts: number;
  new: number;
  working: number;
  appointmentBooked: number;
  proposalSent: number;
  won: number;
  lost: number;
  unclear: number;
};

export type OutcomeTrendPoint = {
  tagMonth: string; // YYYY-MM-01
  bucket: OutcomeBucket;
  contacts: number;
};

export type SalesResults = {
  range: { start: string; end: string };
  view: "month" | "year";
  kpis: CallKpis;
  effort: RepStats[];
  outcomes: RepOutcomeSummary[];
  trend: OutcomeTrendPoint[];
  generatedAt: string;
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
