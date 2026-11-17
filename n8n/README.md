# n8n — GHL Outcome Sync

`ghl-outcome-sync.json` is an importable reference copy of the "Fetch +
Bucket GHL Outcomes" / "Upsert GHL Outcomes to Supabase" node pair. Correction
to an earlier assumption here: these nodes are **not** a separate workflow in
practice — live, they sit inside the *same* n8n workflow as the CDR
ingestion chain (Webhook2 → If4 → ... → Code in JavaScript5/6/7, etc.),
just on their own `Every Hour` trigger branch, unconnected to the webhook
branch. Workflow name live: "GHL Outcome Sync- pbx" (id `D2w2SlTg9hc4sOnb`,
instance `https://bizj1n3d.rcld.app` — see `vodia-instances.json`'s sibling
`n8n-instances.json` entry, aliased "Truetel n8n"). Confirmed directly via
the n8n Public API on 2026-10-24; this file is kept as a readable reference
copy of just those two nodes, not the full workflow.

**What it does:** every hour, pulls every GHL contact under the 72 valid
`mon-yy-rep` tags (Felix, Alvi, Jack, Farhan, Mark, Saif — 12 months × 6 reps), reads their
opportunity stage(s), buckets each into a result-focused status (new /
working / appointment booked / proposal sent / won / lost), and upserts one
row per contact-opportunity pair into Supabase's `ghl_outcomes` table. That
table backs the dashboard's "Sales results — effort + outcome" panel.

**Saif is tag-only, no extension, no GHL login.** He books meetings for
Truetel but never makes calls through the PBX, so he has no entry in the CDR
workflow's `AGENT_MAP` and no row ever appears for him in the `calls` table
or the Call Log — only in `ghl_outcomes`/Sales results. He also has no GHL
user account of his own; someone else tags his leads on his behalf with the
exact same `mon-yy-saif` / `dm name collected-saif` tags used for every other
rep (created directly in GHL's tag list on 2026-11-17 for all 12 months of
2026, via `POST /locations/{locationId}/tags`, so they show up in the tag
autocomplete immediately — tags don't need to be pre-created in GHL, but
doing so makes them easy to find for whoever is tagging on Saif's behalf).

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
collected-felix`, `dm name collected-alvi`, `dm name collected-saif` (add
`dm name collected-jack` in GHL whenever Jack starts using it; the code
already loops every rep in `REPS` and just gets an empty result back for a
rep with no such tag yet). Unlike the
`mon-yy-rep` tags this one carries no month, so it's fetched once per rep and
stamped as a `dm_collected` boolean onto whatever row(s) that contact already
gets from the mon-yy-rep loop — it only counts for contacts already in the
tracked funnel, not a new entry point into it. See migration
`0007_dm_collected.sql`.
