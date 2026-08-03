import type { NextRequest } from "next/server";
import { getDashboardOverview } from "@/lib/dashboard/queries";
import type { DashboardPeriod } from "@/lib/dashboard/types";

const VALID_PERIODS: DashboardPeriod[] = ["today", "week", "month"];

export async function GET(request: NextRequest) {
  const periodParam = request.nextUrl.searchParams.get("period") ?? "today";

  if (!VALID_PERIODS.includes(periodParam as DashboardPeriod)) {
    return Response.json({ error: "invalid period" }, { status: 400 });
  }

  try {
    const data = await getDashboardOverview(periodParam as DashboardPeriod);
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 }
    );
  }
}
