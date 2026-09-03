# How your GHL stage shows up on the dashboard

Quick reference for cold callers and BDMs. Whatever pipeline a lead sits in,
here's what counts as what.

| Dashboard shows | Counts these stage names (any pipeline) |
|---|---|
| **Appointment Booked** | *Appointment Booked*, *Confirmed Appointment*, *Requested Appointment*, *Meeting Scheduled*, *Face-to-face Meeting In Progress*, *Online Meeting In Progress*, *Qualified Appointment Booked $200+* |
| **Proposal Sent** | *Proposal Sent*, *Proposal Follow-Up*, *Negotiation*, *48 Hours Follow Email* |
| **Won** | *Closed Won*, *Project Sold*, *Project in Progress* |
| **Lost** | *Closed Lost*, *Deal Lost*, *Not Qualified*, *Not Interested*, *Invalid Number/Destination*, *Dead Data*, *Failed Times > 3* |

Anything else (*New Lead*, *No Answer*, *Call Back Requested*, *On Hold*,
*Pending Prepare Proposal*, etc.) just means **still in progress** — no
action needed, it'll move into one of the four above as you work it.

## Three things to watch for

1. **A stage that just says "Closed"** (no Won or Lost) shows up as
   *Unclear* — a few older pipelines only have a bare "Closed" stage.
   Rename it to *Closed Won* or *Closed Lost* in GHL and it'll count
   correctly from then on.
2. **A lead tagged to two reps at once** (e.g. both `aug-26-alvi` and
   `aug-26-felix`) counts under both — that's not a bug, it's showing you
   exactly what the tags say. If that wasn't intentional, remove the extra
   tag.
3. **A brand-new stage name** we haven't seen before shows as *Unmapped*
   until it's added to the list — flag it so it gets added.

*(Technical note for whoever maintains the sync: the full stage-id → bucket
map lives in `n8n/ghl-outcome-sync.json`, reasoned across all 28 pipelines
in the account. This file is the plain-English summary of that map.)*
