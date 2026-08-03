# TrueTel — PBX Telemetry

Internal call-analytics dashboard for TrueTel's sales team. Reads call records
posted by the Vodia/Vonex → n8n webhook workflow into Supabase, and shows
daily/weekly/monthly call volume, connected rate, and per-rep performance.

**No login gate.** This app has no authentication — anyone with the URL sees
rep names, phone numbers, and call performance. That was a deliberate
short-term call to ship fast; add a gate (Vercel Deployment Protection or a
Supabase Auth login) before sharing the URL beyond people who should have it.

## Stack

- Next.js 16 (App Router), React 19
- Supabase (Postgres) — read via a server-only service-role client, never exposed to the browser
- No client-side Supabase usage at all — every number on the page is computed server-side

## Local setup

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in your Supabase project's URL + service role key (Project Settings → API)
3. Run the SQL in `supabase/migrations/` (in order) via the Supabase SQL Editor — these create the `calls` table and the aggregation functions this app queries
4. `npm run dev`

## Environment variables

| Variable | Where it's used | Notes |
|---|---|---|
| `SUPABASE_URL` | `lib/supabase/admin.ts` | Server-only, no `NEXT_PUBLIC_` prefix — never sent to the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/admin.ts` | Bypasses RLS. Server-only. Set in Vercel Project Settings → Environment Variables too |

## Deploying to Vercel

1. Import this repo in Vercel
2. Add both environment variables above (Production + Preview)
3. Deploy — no other config needed, it's a standard Next.js app

## Data pipeline

n8n's 3CX/PBX webhook workflow posts call events to `POST /rest/v1/calls` on
Supabase directly (using the service role key as a header, upserting on
`call_id`). This app only reads — it never writes to `calls`.

**Known caveat:** `call_date` is currently derived from the call's UTC
timestamp in the n8n Code node, not Melbourne local time. Calls late at night
(roughly 11pm–2am AEDT) can land on the wrong day in daily/weekly rollups.
Fix in the n8n Code node by computing the date in Melbourne time instead:

```js
const callDate = new Date(startTs * 1000).toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' });
```
