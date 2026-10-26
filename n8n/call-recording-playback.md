# Call recording playback

**Status: live and verified with real audio.** The version of this file from
2026-10-24 documented a version of this fix that turned out to be broken in
two separate ways — both caught and fixed on 2026-10-26 after the user
reported recordings weren't actually playable. Keeping that history here
since both bugs are non-obvious and worth knowing about if this ever needs
touching again.

## Bug 1: wrong Vodia endpoint (fixed 2026-10-26, ~01:00 UTC)

The original fix fetched `https://175.158.106.137/${recordingFile}` (the raw
path from the CDR webhook's `recordings[0].file`) with Basic Auth. This
returned **HTTP 200 with `Content-Type: audio/wav`** — but the actual body
was Vodia's own login page (`<title>Telephony Server Login</title>`), not
audio. Every "recording" uploaded between 2026-10-24 and 2026-10-26 was
really that same ~28KB HTML page, silently passing every check that only
looked at status code / declared content-type.

**Real endpoint**, confirmed against this PBX (`server: PBX/68.0.45`) and
matching Vodia's documented REST pattern:

```
https://175.158.106.137/rest/domain/<domain>/recs?id=<recording id>
```

`<domain>` is the CDR webhook's top-level `domain` field (e.g.
`hosteddemo.ftcpbx.com.au`). `<id>` is `recordings[0].id` (a number, e.g.
`700926`) — **not** `recordings[0].file`. Basic Auth works fine against this
endpoint specifically (the raw path falls through to the login page instead
of erroring, which is what made bug 1 so easy to miss).

## Bug 2: binary gets corrupted crossing the Code-node sandbox boundary

Even after fixing the URL, uploading via `this.helpers.httpRequest({ body:
aNodeBuffer, ... })` **from inside a Code node** silently corrupted the
upload: Supabase Storage received the literal text
`{"type":"Buffer","data":[...]}` (what `JSON.stringify()` produces for a
Buffer) instead of the raw bytes. `Buffer.isBuffer()` on the fetched data
returned `false` inside the Code node (it's `Buffer`-like but not a real
same-realm `Buffer`), which is the tell: Code nodes run in a sandboxed
task-runner process, and `this.helpers.httpRequest` calls have to cross an
RPC boundary back to the main n8n process — a raw Buffer doesn't survive
that boundary intact. The *fetch* from Vodia was never the problem here
(confirmed real RIFF/WAVE bytes available inside the Code node); it was
specifically passing one back out as an httpRequest `body`.

**Fix:** base64-encode the audio and set it as `$binary.data` on the
returned item, then let a **native HTTP Request node** (runs in the main
process, not sandboxed) do the actual upload with Body Content Type = "n8n
Binary File". Confirmed this round-trips correctly (836,524 bytes in,
836,524 bytes out, valid RIFF/WAVE header) where the Code-node-only approach
produced a 2.7MB text blob of garbled JSON for the same file.

### A second trap inside that fix: don't chain the upload node into the row-save

The natural wiring — Code node → Upload node → existing Supabase `calls`
upsert node — breaks the row save. A native HTTP Request node's *successful*
output **replaces** the item's `json` with the API's own response body
(Supabase Storage returns `{"Key": "...", "Id": "..."}`), not a merge with
the input. Chained that way, every field the `calls` upsert needs (callId,
callTimestamp, agentName, ...) gets wiped out — the row either fails to
insert or inserts as all-empty-strings (which itself throws, since
`call_date` is a `date` column and `""` isn't a valid date).

**Fix:** don't chain them. The Code node computes `recordingUrl`
*deterministically* (it's just a predictable path under the bucket, known
before the upload even runs) and includes it directly in the row-save
payload. The Code node's single output **fans out to two independent
targets**: the Upload node (fire-and-forget binary upload, side effect only,
nothing downstream reads its result) and the existing `calls` upsert node
(reads straight from the Code node, never from the Upload node). If the
upload genuinely fails, `recordingUrl` was already computed and the row
saves fine; only in the rare case of "fetch succeeded but upload specifically
failed" would the stored URL point at a file that isn't actually there — a
narrow edge case, not a systemic one, and worth revisiting later if it ever
turns out to matter in practice.

## Current code (as of 2026-10-26)

In the three "Code in JavaScript5/6/7" nodes, right before each node's
existing `return { json: {...} }`:

```js
const recordingFile = (body.recordings && body.recordings[0]?.file) || "";
const recordingId = body.recordings && body.recordings[0]?.id;
let recordingUrl = "";
let uploadUrl = "";
let recordingBinary = undefined;
if (recordingFile && recordingId && body.domain) {
  try {
    const vodiaRes = await this.helpers.httpRequest({
      method: 'GET',
      url: `https://175.158.106.137/rest/domain/${body.domain}/recs?id=${recordingId}`,
      auth: { username: 'admin', password: '<see vodia-instances.json>' },
      encoding: 'arraybuffer',
      skipSslCertificateValidation: true,
      returnFullResponse: true,
    });
    const audioBuffer = Buffer.from(vodiaRes.body);
    const contentType = vodiaRes.headers['content-type'] || 'audio/wav';
    uploadUrl = `https://fhorqpdipuippilnuelp.supabase.co/storage/v1/object/call-recordings/${recordingFile}`;
    recordingUrl = `https://fhorqpdipuippilnuelp.supabase.co/storage/v1/object/public/call-recordings/${recordingFile}`;
    recordingBinary = {
      data: { data: audioBuffer.toString('base64'), mimeType: contentType, fileName: 'recording.wav' },
    };
  } catch (err) {
    recordingUrl = ""; uploadUrl = ""; recordingBinary = undefined;
  }
}
```

...and the returned object gains `uploadUrl`/`recordingUrl` fields plus a
sibling `binary: recordingBinary` key alongside `json`.

Three new native **"Upload Recording A/B/C"** HTTP Request nodes (one per
branch) sit beside (not between) the Code and `calls`-upsert nodes:
- Method POST, URL `={{ $json.uploadUrl }}`
- Headers: `Authorization: Bearer <Supabase service-role key>`, `x-upsert: true`
- Body Content Type: **n8n Binary File**, Input Data Field Name: `data`
- `onError` doesn't matter much given nothing reads this node's output, but
  it's set to `continueErrorOutput` so a failed upload never stops the
  execution.

Each "HTTP Request19/20/21" node's JSON body has `"recording_url": "{{
$json.recordingUrl }}"`, reading straight from the Code node's output as
before — it has no dependency on the Upload node succeeding or even having
run yet by the time it executes (both are fed from the same source in
parallel).

## Verification performed on 2026-10-26

All via a disposable throwaway n8n workflow (created, tested, and deleted
via the Public API — never left behind) plus synthetic test calls through
the live production webhook with real recording IDs pulled from actual
recent executions, each test row deleted from `calls` afterward:

- Confirmed the broken state first (downloaded an actual "recording",
  found the HTML login page inside it).
- Isolated and confirmed the correct Vodia URL pattern directly (real
  `server: PBX/68.0.45` header, valid WAV header, real content-length).
- Isolated and confirmed the Code-node Buffer corruption specifically
  (`Buffer.isBuffer()` false inside the sandbox, garbled output on upload).
- Isolated and confirmed the native-node binary upload works correctly
  (byte-for-byte match between fetched and re-downloaded file).
- Caught a self-introduced bug (forgot to add `uploadUrl` to the returned
  `json`) via a failed live test, not assumed-fixed.
- Caught the chained-node data-loss bug via a second failed live test
  (all-empty-string row, Postgres correctly rejected it rather than saving
  garbage) before settling on the fan-out design.
- Final end-to-end test on production: real row saved with correct fields,
  downloaded file confirmed byte-identical valid WAV audio.
- Cleaned up: 14 historical rows (created before the fix, all pointing at
  fake HTML "recordings") had their bad Storage objects deleted and
  `recording_url` nulled back to the honest "not uploaded" state rather than
  left pointing at deleted/fake files.

Not independently re-tested: the Felix-specific code path (extension 112
routes through a different branch — GHL contact/opportunity auto-creation —
before reaching Code in JavaScript7). A synthetic test on this path was
intentionally not run, since a realistic-looking test phone number risks
actually creating a fake contact in the live GHL CRM. Verified instead by
code inspection: Code in JavaScript6 and 7 pull `body` from
`$('If2').first().json.body` — the same original webhook payload Code in
JavaScript5 uses — so `domain` and `recordings[0].id` are available
identically. Will self-confirm on the next real Felix call.

## Retention / cleanup

`/api/cron/cleanup-recordings` (Vercel Cron, daily 16:00 UTC, confirmed
registered via `vercel crons ls`) deletes Storage objects and nulls
`recording_url` for calls older than `RECORDING_RETENTION_DAYS` (90,
default). At current volume (~60 recordings/day, ~800KB average) that's
roughly 4-5GB at steady state — trivial for Supabase Storage, no reason to
shorten it. Manually invoked and confirmed working (`checked: 0, deleted: 0`
— correct, since the earliest call in the system is from 2026-07-31 and
`recording_url` is a feature that's only existed since this fix, so nothing
is old enough yet to actually need cleaning up).

## Credentials

Both the Vodia admin login and the Supabase service-role key used here are
the same ones already saved in `C:\Users\Emon\.agents\credentials\` and
already present elsewhere in this same n8n workflow — nothing new was
hardcoded beyond what was already there.
