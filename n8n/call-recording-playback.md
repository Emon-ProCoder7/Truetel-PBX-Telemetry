# Call recording playback — what to add to the CDR ingestion workflow

This isn't mirrored in this repo (same as the rest of `CDR-truetel` — see the
main `n8n/README.md`). This file is the paste-ready spec for the one piece
that lives only in your live n8n: fetching each call's recording from Vodia
and uploading it to Supabase Storage so the dashboard can actually play it.

## What it does

Vodia's CDR webhook already gives you `recordingFile` — a relative path on
the PBX, e.g. `recordings/hosteddemo.ftcpbx.com.au/20261023/162439-o-...wav`.
That's never been anything the browser can play directly (it's a path on the
PBX, not a public URL). This step fetches the actual audio bytes from Vodia
and re-uploads them to a public Supabase Storage bucket (`call-recordings`,
already created), then stamps the resulting public URL onto the row as
`recording_url` — the field the dashboard's `<audio>` player actually reads.

If the fetch/upload fails for any reason (Vodia down, network hiccup), the
call row still gets saved as before, just without playback for that one call
— this never blocks the existing sync.

## Where to add it

In **all three** "Code in JavaScript5/6/7" nodes (the CDR ingestion
workflow's duplicated branches), add this block right before the final
`return { json: { ... } };` statement — using the same `rawExt`/`agentName`/
etc. variables already computed earlier in each node:

```js
// --- Fetch the recording from Vodia and upload it to Supabase Storage so
// the dashboard can play it. Never blocks the row from saving -- on any
// failure here, recordingUrl just stays null and the call saves as before.
let recordingUrl = null;
const recordingFile = (body.recordings && body.recordings[0]?.file) || "";

if (recordingFile) {
  try {
    const audioBuffer = await this.helpers.httpRequest({
      method: 'GET',
      url: `https://175.158.106.137/${recordingFile}`,
      auth: { username: 'PASTE_VODIA_ADMIN_USERNAME_HERE', password: 'PASTE_VODIA_ADMIN_PASSWORD_HERE' },
      encoding: 'arraybuffer',
      skipSslCertificateValidation: true,
    });

    await this.helpers.httpRequest({
      method: 'POST',
      url: `https://fhorqpdipuippilnuelp.supabase.co/storage/v1/object/call-recordings/${recordingFile}`,
      headers: {
        Authorization: 'Bearer PASTE_SUPABASE_SERVICE_ROLE_KEY_HERE',
        'Content-Type': 'audio/wav',
        'x-upsert': 'true',
      },
      body: audioBuffer,
    });

    recordingUrl = `https://fhorqpdipuippilnuelp.supabase.co/storage/v1/object/public/call-recordings/${recordingFile}`;
  } catch (err) {
    recordingUrl = null;
  }
}
```

Then add `recordingUrl` to that node's returned JSON object (alongside the
existing `recordingFile` field already there).

## And in the matching HTTP Request node

In each of the three "HTTP Request19/20/21" nodes (the ones that upsert into
`calls`), add one field to the JSON body, alongside the existing
`"recording_file"` line:

```json
"recording_url": "{{ $json.recordingUrl }}"
```

## Why `this.helpers.httpRequest` works here

n8n's own docs say the Code node can't make HTTP requests directly — but
that's describing n8n Cloud's sandboxing. This instance (self-hosted,
2.34.4, using the task-runner architecture) already proves it works: the
"Fetch + Bucket GHL Outcomes" node in the GHL Outcome Sync workflow has been
making real `this.helpers.httpRequest` calls to the GHL API successfully
this whole project. Verified against n8n's official `httpRequest` helper
schema (via Context7) before handing this over — `encoding: 'arraybuffer'`,
`auth: { username, password }`, and `skipSslCertificateValidation: true` are
all real, documented option names, not guessed.

## Credentials used here

The real Vodia admin login is saved to the local credentials registry
(`C:\Users\Emon\.agents\credentials\vodia-instances.json`, never committed to
git) for reuse — it's the shared admin login for `https://175.158.106.137`,
the Vodia host behind both `hosteddemo.ftcpbx.com.au` (these reps) and the
separate Lumiere PBX rollout. Pull the real username/password from there
when pasting this into the live Code nodes — never from this file.

As with the GHL key and Supabase key already sitting in these Code nodes,
the better long-term practice is moving these into n8n credentials rather
than plaintext in the node — noted here for when that cleanup happens, not
blocking this from working today.
