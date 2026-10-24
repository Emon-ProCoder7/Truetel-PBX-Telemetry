-- The playable audio URL, filled in once n8n fetches the recording from
-- Vodia and uploads it to Supabase Storage (public "call-recordings"
-- bucket). `recording_file` stays as-is (the raw Vodia path, kept for
-- reference/debugging); `recording_url` is the new field the dashboard
-- actually plays. Null until n8n's upload step runs for that call, and
-- nulled back out by the retention cleanup job once the underlying Storage
-- object is deleted.

alter table public.calls add column if not exists recording_url text;
