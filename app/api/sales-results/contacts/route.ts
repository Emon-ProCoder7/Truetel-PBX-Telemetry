import type { NextRequest } from "next/server";
import { getOutcomeContacts } from "@/lib/dashboard/queries";

export async function GET(request: NextRequest) {
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  const bucketsParam = request.nextUrl.searchParams.get("buckets");
  const rep = request.nextUrl.searchParams.get("rep");

  if (!start || !end || !bucketsParam) {
    return Response.json({ error: "start, end, and buckets are required" }, { status: 400 });
  }

  const buckets = bucketsParam.split(",").filter(Boolean);
  if (buckets.length === 0) {
    return Response.json({ error: "buckets must be a non-empty comma-separated list" }, { status: 400 });
  }

  try {
    const contacts = await getOutcomeContacts(start, end, buckets, rep && rep !== "all" ? rep : null);
    return Response.json({ contacts });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 }
    );
  }
}
