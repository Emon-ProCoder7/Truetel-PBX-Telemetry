# Call recording playback

**Status: live.** Applied directly to the production workflow on 2026-10-24
via the n8n Public API (instance `https://bizj1n3d.rcld.app`, workflow
"GHL Outcome Sync- pbx", id `D2w2SlTg9hc4sOnb` — see the "Truetel n8n" entry
in `n8n-instances.json`), not just handed over as a spec. Verified end-to-end
with a synthetic test call through the live production webhook: fetched a
real recording from Vodia, uploaded it to Supabase Storage, got back a
working public URL (`HTTP 200`, `Content-Type: audio/wav`, 28,550 bytes),
then deleted the synthetic `calls` row so it doesn't pollute real data.

## What it does

Vodia's CDR webhook gives `recordingFile` — a relative path on the PBX, e.g.
`recordings/hosteddemo.ftcpbx.com.au/20261023/162439-o-...wav`. That was
never anything the browser could play directly. Now, in the three
"Code in JavaScript5/6/7" nodes (the duplicated CDR-handling branches), right
before each node's final `return`, this runs:

```js
// --- Fetch the recording from Vodia and upload it to Supabase Storage so
// the dashboard can play it. Never blocks the row from saving -- on any
// failure here, recordingUrl just stays empty and the call saves as before.
const recordingFile = (body.recordings && body.recordings[0]?.file) || "";
let recordingUrl = "";
if (recordingFile) {
  try {
    const audioBuffer = await this.helpers.httpRequest({
      method: 'GET',
      url: `https://175.158.106.137/${recordingFile}`,
      auth: { username: 'admin', password: '<see vodia-instances.json>' },
      encoding: 'arraybuffer',
      skipSslCertificateValidation: true,
    });

    await this.helpers.httpRequest({
      method: 'POST',
      url: `https://fhorqpdipuippilnuelp.supabase.co/storage/v1/object/call-recordings/${recordingFile}`,
      headers: {
        Authorization: 'Bearer <see Supabase service-role key>',
        'Content-Type': 'audio/wav',
        'x-upsert': 'true',
      },
      body: audioBuffer,
    });

    recordingUrl = `https://fhorqpdipuippilnuelp.supabase.co/storage/v1/object/public/call-recordings/${recordingFile}`;
  } catch (err) {
    recordingUrl = "";
  }
}
```

Note `recordingUrl` defaults to `""`, not `null` — the HTTP Request nodes'
JSON body wraps it in quotes (`"recording_url": "{{ $json.recordingUrl }}"`),
so a JS `null` would render as the literal string `"null"`, which is truthy
in JS and would make the dashboard try to play a non-existent file. Empty
string stays falsy and the frontend's `if (call.recordingUrl)` check skips
rendering a player correctly.

Each of the three "HTTP Request19/20/21" nodes (the ones that upsert into
`calls`) got one added line in their JSON body, alongside `recording_file`:

```json
"recording_url": "{{ $json.recordingUrl }}"
```

## Why `this.helpers.httpRequest` works here

n8n's own docs say the Code node can't make HTTP requests directly — that's
describing n8n Cloud's sandboxing. This self-hosted instance (task-runner
architecture) already proved it works via the GHL Outcome Sync node's
existing calls to the GHL API. Option names (`encoding: 'arraybuffer'`,
`auth: { username, password }`, `skipSslCertificateValidation: true`) were
verified against n8n's official `httpRequest` helper schema via Context7
before applying, not guessed.

## One pre-existing quirk found along the way (not caused by this change)

Extension 112 (Felix) routes through a *different* branch than the other
extensions — it hits "Code in JavaScript4" → GHL duplicate-contact search →
auto-creates a contact/opportunity if none exists, before reaching the
call-logging step. Every other extension (113, 110, 109, 111, 114, ...)
goes straight to "Code in JavaScript5" → the `calls` upsert, no GHL contact
touch at all. Found this while picking a safe extension for the test call
(confirmed via the execution log of a failed first attempt with ext 112,
which tried to create a GHL contact from a fake test phone number and GHL's
API correctly rejected it as an invalid number — no bad data was created).
Worth knowing if "why did a new GHL contact just get created" ever comes up
for a Felix call specifically.

## Credentials

Both the Vodia admin login and the Supabase service-role key used here are
the same ones already saved in `C:\Users\Emon\.agents\credentials\` and
already present elsewhere in this same n8n workflow — nothing new was
hardcoded beyond what was already there.
