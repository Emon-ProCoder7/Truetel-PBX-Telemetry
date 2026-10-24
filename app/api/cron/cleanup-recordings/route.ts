import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const RETENTION_DAYS = Number(process.env.RECORDING_RETENTION_DAYS ?? 90);
const BUCKET = "call-recordings";

function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (!match) return null;
  return { bucket: match[1], path: decodeURIComponent(match[2]) };
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error: selectError } = await supabase
    .from("calls")
    .select("id, recording_url")
    .lt("call_timestamp", cutoff)
    .not("recording_url", "is", null);

  if (selectError) {
    return Response.json({ error: `Select failed: ${selectError.message}` }, { status: 500 });
  }

  let deleted = 0;
  let errors = 0;
  const checked = rows?.length ?? 0;

  for (const row of rows ?? []) {
    const url = row.recording_url as string;
    const parsed = parseStorageUrl(url);
    if (!parsed) {
      errors++;
      continue;
    }

    const { error: removeError } = await supabase.storage.from(parsed.bucket).remove([parsed.path]);
    if (removeError) {
      errors++;
      continue;
    }

    const { error: updateError } = await supabase
      .from("calls")
      .update({ recording_url: null })
      .eq("id", row.id);

    if (updateError) {
      errors++;
      continue;
    }

    deleted++;
  }

  return Response.json({
    bucket: BUCKET,
    retentionDays: RETENTION_DAYS,
    cutoff,
    checked,
    deleted,
    errors,
  });
}
