# Test Design: ConfigHelp
**Source:** crc-ConfigHelp.md

## Test: includes this page origin plus the webui default
**Purpose:** R50 — the snippet allowlists the app and keeps the one origin that
does not depend on the player's setup.
**Input:** an ipns-subdomain origin.
**Expected:** array contains that origin and `https://webui.ipfs.io`.
**Refs:** crc-ConfigHelp.md

## Test: derives every origin from the port this player actually uses
**Purpose:** R32, R40 — the web UI is served by the same gateway as the app, so
its origin always carries the app's own port. Nothing is guessed and nothing
falls back to a likely port: a fixed port is what cost a friend their web UI,
because the allowlist is replaced wholesale and naming the wrong port removes
the right one. The ports exercised are arbitrary on purpose — no port is
special, so the test must not imply one is.
**Input:** origins on two unrelated gateway ports.
**Expected:** for each, the app origin and the web UI origin both carry that
port, and there is exactly one web UI origin — no invented ports.
**Refs:** crc-ConfigHelp.md

## Test: does not duplicate a default origin
**Purpose:** guard against a doubled entry if origin equals a default.
**Input:** `https://webui.ipfs.io`.
**Expected:** it appears once.
**Refs:** crc-ConfigHelp.md

## Test: tolerates a missing origin
**Purpose:** with no origin there is no port to derive from, so no loopback
entry can be invented.
**Input:** `''`.
**Expected:** only `https://webui.ipfs.io`.
**Refs:** crc-ConfigHelp.md

## Test: the crank handle does not grant a remote site access to a local daemon
**Purpose:** R55 — the crank handle reads the allowlist and merges into it, so
it removes nothing and need name only what is required. Adding
`https://webui.ipfs.io` to a daemon that granted it to nobody expands the
player's exposure and buys them nothing.
**Input:** an origin on gateway port 8080.
**Expected:** no `https://` entry at all; every added origin is loopback
`http://`; the app's own origin and the local web UI origin are both present.
**Refs:** crc-ConfigHelp.md

## Test: the by-hand paste still carries the defaults it might otherwise remove
**Purpose:** R32 — the opposite case. A blind wholesale replace cannot know
what it is overwriting, so omitting a default is what *removes* it.
**Input:** an origin on gateway port 8080.
**Expected:** `https://webui.ipfs.io` is present.
**Refs:** crc-ConfigHelp.md

## Test: HTTPHeaders snippet parses as JSON with the origin present
**Purpose:** R50 — the snippet must be pasteable straight into a JSON editor.
**Input:** an origin; wrap the snippet in braces and JSON.parse it.
**Expected:** a valid object whose allowlist contains the origin.
**Refs:** crc-ConfigHelp.md

## Test: snippet carries the allowed methods, not just the origin
**Purpose:** R31 — an observed player state is an empty `API.HTTPHeaders`, where
the origin alone is not enough: Kubo still refuses the preflight, and the
resulting failure is indistinguishable from the one being fixed.
**Input:** an origin; parse the snippet as above.
**Expected:** `Access-Control-Allow-Methods` is exactly `["POST","OPTIONS"]`.
**Refs:** crc-ConfigHelp.md

## Test: pubsub snippet parses with Enabled true
**Purpose:** R51 — the pubsub block is valid and enables pubsub.
**Input:** pubsubSnippet(), wrapped and parsed.
**Expected:** Enabled true, Router gossipsub.
**Refs:** crc-ConfigHelp.md
