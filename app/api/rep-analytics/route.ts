import type { NextRequest } from "next/server";
import { getRepAnalytics } from "@/lib/dashboard/queries";

export async function GET(request: NextRequest) {
  const agent = request.nextUrl.searchParams.get("agent");

  if (!agent) {
    return Response.json({ error: "agent is required" }, { status: 400 });
  }

  try {
    const data = await getRepAnalytics(agent);
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 }
    );
  }
}
