import type { NextRequest } from "next/server";
import { getSalesResults } from "@/lib/dashboard/queries";
import { monthRange, yearRange } from "@/lib/dashboard/date-range";

export async function GET(request: NextRequest) {
  const view = request.nextUrl.searchParams.get("view") ?? "month";
  const anchor = request.nextUrl.searchParams.get("anchor") ?? undefined;

  if (view !== "month" && view !== "year") {
    return Response.json({ error: "view must be 'month' or 'year'" }, { status: 400 });
  }

  const range = view === "month" ? monthRange(anchor) : yearRange(anchor);

  try {
    const data = await getSalesResults(range.start, range.end, view);
    return Response.json(data);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "unknown error" },
      { status: 500 }
    );
  }
}
