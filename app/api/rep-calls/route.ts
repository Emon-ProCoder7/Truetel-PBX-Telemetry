import type { NextRequest } from "next/server";
import { getRepCallDetails } from "@/lib/dashboard/queries";

export async function GET(request: NextRequest) {
  const agent = request.nextUrl.searchParams.get("agent");
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");

  if (!agent || !start || !end) {
    return Response.json({ error: "agent, start, and end are required" }, { status: 400 });
  }

  try {
    const result = await getRepCallDetails(agent, start, end);
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 }
    );
  }
}
