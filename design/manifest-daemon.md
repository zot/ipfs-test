# Manifest: Daemon Configuration
**Requirements:** R21, R22, R31, R32

The app is not self-contained. It requires a Kubo daemon on localhost,
configured in two specific ways, and neither default is correct out of the
box. This manifest is the contract between the app and that daemon; `SETUP.md`
is its human-facing form.

## Required daemon state

- **RPC API reachable** at `http://127.0.0.1:5001`. Verified against Kubo
  0.42.0.
- **Pubsub enabled** — `Pubsub.Enabled: true`. Kubo Desktop ships this on;
  a bare `ipfs daemon` may not. Without it the pubsub endpoints error.
- **Serving origin allowlisted** in `API.HTTPHeaders.Access-Control-Allow-Origin`,
  with `POST` and `OPTIONS` in `API.HTTPHeaders.Access-Control-Allow-Methods`.

## Why the origin matters more than usual

Kubo does not merely omit CORS headers for an origin it does not recognize —
it answers `403 Forbidden`. That covers the `null` origin a `file://` page
sends, which is why the app must be served over HTTP even though it is a
static page with no server-side logic. `python3 -m http.server 3000` is
sufficient; the origin is then `http://localhost:3000`.

The daemon reads these headers once at startup, so a config change has no
effect until the daemon restarts.

## Preserving existing origins

The allowlist is a replacement, not an append, so a rewrite that omits an entry
takes it away — a failure that surfaces later, somewhere unrelated, and is hard
to attribute back to this app. Any documented command therefore writes the full
list including the pre-existing entries.

What that protects is narrower than it looks. IPFS Desktop's own window is an
Electron application, not a browser origin, and needs no entry at all — it is
unaffected either way. The loss lands on the same web UI opened as an ordinary
browser page, which *is* a normal origin and stops being able to reach the
daemon. That is the failure worth preventing; Desktop's own UI is not.

A tool that reads the allowlist before writing it is not bound by this, and
should not behave as if it were: it merges, so it removes nothing, and can
therefore add only what is required. It should not introduce
`https://webui.ipfs.io` to a daemon that lacks it (R55) — a public site with
access to a local API is a real expansion of exposure, and a blind paste
carries that entry only because it cannot tell whether taking it away would be
a removal.

## Verifying

Reachability, pubsub, and the origin allowlist are three separate failures
with three different symptoms, so `SETUP.md` gives a check for each rather
than one aggregate "is it working" test.
