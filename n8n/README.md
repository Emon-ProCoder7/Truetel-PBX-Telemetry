# n8n — GHL Outcome Sync

`ghl-outcome-sync.json` is an importable n8n workflow, separate from the
existing CDR-ingestion workflow (`CDR-truetel`) — it doesn't touch that one.

**What it does:** every hour, pulls every GHL contact under the 48 valid
`mon-yy-rep` tags (Felix, Alvi, Jack, Farhan — 12 months × 4 reps), reads their
opportunity stage(s), buckets each into a result-focused status (new /
working / appointment booked / proposal sent / won / lost), and upserts one
row per contact-opportunity pair into Supabase's `ghl_outcomes` table. That
table backs the dashboard's "Sales results — effort + outcome" panel.

**Before importing:** the GHL key and Supabase service-role key in this file
are placeholders (redacted before committing — never check real keys into
git). After importing into n8n, paste your real values into:
- the `GHL_KEY` constant in the "Fetch + Bucket GHL Outcomes" Code node
- the `apikey` / `Authorization` headers in the "Upsert GHL Outcomes to
  Supabase" HTTP Request node

Better than pasting plaintext: move both into n8n credentials (Header Auth
for the Supabase call; an HTTP Request credential or an environment variable
read via `$env` for the GHL token) so they don't sit in the exported JSON.

**Stage taxonomy:** the `STAGE_BUCKET` map inside the Code node was built
from the exact pipeline stages observed live on tagged contacts, not the
full generic stage list. If a contact ends up on a stage not in that map, it
lands in `unmapped` rather than being dropped — check for those periodically
(`select * from ghl_outcomes where stage_bucket = 'unmapped'`) and extend the
map when a new stage shows up.

**Grain:** month/year, not daily — GHL's per-opportunity stage-change
timestamp was checked live and found to be dominated by bulk administrative
touches, not real day-by-day activity. See migration `0004_ghl_outcomes.sql`
for the full note.

**"DM name collected":** a separate, flat tag per rep — `dm name
collected-felix`, `dm name collected-alvi` (add `dm name collected-jack` in
GHL whenever Jack starts using it; the code already loops all three reps and
just gets an empty result back for a rep with no such tag yet). Unlike the
`mon-yy-rep` tags this one carries no month, so it's fetched once per rep and
stamped as a `dm_collected` boolean onto whatever row(s) that contact already
gets from the mon-yy-rep loop — it only counts for contacts already in the
tracked funnel, not a new entry point into it. See migration
`0007_dm_collected.sql`.
