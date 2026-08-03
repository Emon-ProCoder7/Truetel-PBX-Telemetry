-- TrueTel ops dashboard — call records ingested from the n8n 3CX webhook workflow.
-- Columns mirror the fields returned by the "Code in JavaScript5" node.

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  call_id text unique not null,
  call_timestamp timestamptz not null,
  call_date date not null,
  extension text,
  agent_name text,
  call_direction text check (call_direction in ('Inbound', 'Outbound')),
  phone_number text,
  call_status text,
  total_duration text,
  talk_time text,
  ring_time text,
  total_duration_seconds integer not null default 0,
  talk_time_seconds integer not null default 0,
  recording_file text,
  department_group text,
  created_at timestamptz not null default now()
);

create index if not exists calls_call_timestamp_idx on public.calls (call_timestamp desc);
create index if not exists calls_agent_name_idx on public.calls (agent_name);
create index if not exists calls_call_status_idx on public.calls (call_status);
create index if not exists calls_call_direction_idx on public.calls (call_direction);

-- RLS on, no policies added: anon and authenticated get zero rows by default.
-- n8n writes with the service_role key (bypasses RLS). The dashboard reads with
-- the service_role key too, from server-only code — never from the browser.
alter table public.calls enable row level security;
