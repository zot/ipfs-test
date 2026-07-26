# Requirements

## Feature: chat
**Source:** specs/chat.md

- **R1:** The app opens on a join form taking a nickname and a room name; both are required before joining.
- **R2:** Joining subscribes to the room's pubsub topic and switches the page to the conversation view.
- **R3:** The nickname is an unverified display label; the publishing node's peer ID is shown alongside it as the message's actual identity.
- **R4:** A person can leave a room and join another without reloading the page; leaving unsubscribes from the old topic.
- **R5:** The last-used nickname and room are remembered across page reloads.
- **R6:** Submitting a message publishes it to the room's topic and clears the input immediately.
- **R7:** A sent message is not added to the transcript locally; it appears only when the app's own subscription delivers it back.
- **R8:** If publishing fails, the message text is restored to the input and an error is shown.
- **R9:** Messages render oldest at top and newest at bottom, scrolled to the newest, each showing nickname, shortened peer ID, text, and local timestamp.
- **R10:** Messages published by this node are visually distinguished from messages published by other nodes.
- **R11:** A message delivered more than once is displayed only once.
- **R12:** A payload that is not a well-formed message of this app is ignored without disturbing the transcript.
- **R13:** Message text is rendered as text and never as markup.
- **R14:** The conversation view shows the number of other nodes subscribed to the room and this node's own peer ID.
- **R15:** The UI states that the presence count counts nodes, not people.
- **R16:** The page shows whether it is connected to the local daemon and whether the room subscription is live.
- **R17:** If the daemon is unreachable at load, the app says so plainly and offers to retry.
- **R18:** If a live subscription drops, the app reports it and resubscribes automatically, backing off between attempts.
- **R19:** The app is a static page using vanilla JavaScript ES modules with no build step, package manager, or framework, served over HTTP rather than opened from the filesystem.

## Feature: kubo-rpc
**Source:** specs/kubo-rpc.md

- **R20:** The browser performs no IPFS or libp2p networking itself; every network effect is produced by asking the local Kubo daemon over HTTP.
- **R21:** The app targets Kubo's RPC API at `http://127.0.0.1:5001`, verified against Kubo 0.42.0.
- **R22:** The daemon must have pubsub enabled; without it the pubsub endpoints error and the app cannot work.
- **R23:** Every RPC call is a POST, including read-only calls; arguments are query parameters named `arg`, repeated for multiple arguments.
- **R24:** Pubsub topic names are sent multibase-encoded as base64url without padding, carrying the `u` prefix.
- **R25:** A received message's payload, sequence number, and topic list are multibase strings that must be decoded; the publisher's peer ID arrives as a plain unencoded string.
- **R26:** `/api/v0/id` supplies this node's peer ID and confirms the daemon is reachable.
- **R27:** `/api/v0/pubsub/sub` returns a never-ending stream of newline-delimited JSON that is read incrementally as it arrives; closing the request unsubscribes.
- **R28:** `/api/v0/pubsub/pub` sends the message payload as a multipart form upload rather than as a raw body.
- **R29:** `/api/v0/pubsub/peers` supplies the peer IDs of other nodes the daemon sees subscribed to the topic.
- **R30:** A node's own published messages are delivered back to its own subscription, so two browser tabs on one daemon can converse.
- **R31:** The serving origin must be listed in the daemon's `API.HTTPHeaders.Access-Control-Allow-Origin` with `POST` and `OPTIONS` allowed, because Kubo answers an unrecognized origin — including the `null` origin of a `file://` page — with `403 Forbidden`; the daemon reads these at startup and must be restarted after a change.
- **R32:** Configuring the origin must not remove entries already present in the allowlist; IPFS Desktop's own window is an Electron application needing no entry, but the same web UI opened as an ordinary browser page is a normal origin that loses daemon access if its entry is dropped.
- **R33:** (inferred) The published payload is a JSON envelope carrying the sender's nickname, the message text, a timestamp, and an identifier used to discard duplicate deliveries.
- **R34:** A received payload is untrusted input: it may not be JSON, may lack expected fields, and may hold values of any type, so every field is validated before use.
- **R35:** (inferred) All Kubo-specific knowledge — base URL, POST convention, multibase, multipart publish body, streaming subscription — is confined to one component behind a narrow boundary of identify, subscribe, unsubscribe, publish, and list peers, so a browser libp2p transport could replace it without disturbing chat logic, presence, or rendering.
- **R55:** (inferred) A configuration path that can read the current allowlist before writing it merges rather than replaces, and adds only what is required: in particular it does not introduce the remote `https://webui.ipfs.io` origin to a daemon that lacks it, because that grants a public website access to a local API and buys a player who never had it nothing.

## Feature: publishing
**Source:** specs/publishing.md
_The IPFS-delivery requirements R38–R42 are **retired** (superseded by the
delivery feature R56–R63; see T1–T5). R36, R37, and R43 survive — they describe
what a player must have, the daemon's own NAT traversal, and the dev-server +
origin-agnostic property, all unchanged by the pivot. See specs/publishing.md
(reduced to just those) and delivery.md._

- **R36:** A player needs a Kubo daemon and nothing else — no web server, public IP, VPS, relay operated by us, or account.
- **R37:** Each player's daemon performs its own NAT traversal and reaches the network through public relays and the DHT, so no player needs to be reachable from outside.
- **~~R38:~~** (Retired T1 — see R56) The app is added to IPFS as a directory and opened via the IPNS-key subdomain gateway form, `http://<key>.ipns.localhost:<gateway-port>/`, whose origin stays constant across content edits because an IPNS key is a stable pointer that does not change when its content does.
- **~~R39:~~** (Retired T2 — no replacement) The content-CID subdomain form (`<cid>.ipfs.localhost`) is deliberately not used for the shared link, because its origin embeds the CID and would fall out of the API allowlist on every edit; the immutable `/ipfs/<cid>/` path form is retained only for pinning or naming an exact build.
- **~~R40:~~** (Retired T3 — see R57) Because a gateway origin includes its port (8080 for a default Kubo install), the allowlist lists the IPNS-key origin at that, so the configuration line fits the default install's port.
- **~~R41:~~** (Retired T4 — see R60) The IPNS name is the shared link and survives edits, always resolving to the current build, while a raw `/ipfs/<cid>/` link names one specific version.
- **~~R42:~~** (Retired T5 — no replacement) A publish command adds the site directory, reports the resulting CID and both gateway URLs, and republishes the IPNS name to point at it.
- **R43:** During development the same files are served from a static server at `http://localhost:3000`, also allowlisted; the app holds no knowledge of how it was delivered.

## Feature: measurement
**Source:** specs/chat.md

- **R44:** (inferred) Each sender stamps a monotonic per-sender counter in every message it publishes.
- **R45:** (inferred) Each receiver tracks the last counter seen per sender and renders a visible marker when the sequence skips, so message loss is observed rather than guessed at.
- **R46:** (inferred) The app reports observed delivery statistics for the session — messages received, gaps detected, and delivery latency derived from the sender's timestamp — because the purpose of the spike is to measure whether gossipsub is reliable enough at human pace.
- **R47:** (inferred) Publishing reports success whether or not any peer received the message, so the app does not treat a successful publish as evidence of delivery.
- **R48:** (inferred) The app can publish an automatic numbered heartbeat at a chosen interval, so a loss rate can be measured without anyone typing; a received message delivered more than once, out of order, or lost is distinguished in the reported statistics.
- **R49:** (inferred) The app measures and reports the time from subscribing to the first peer appearing on the topic, because messages published before the gossipsub mesh forms reach nobody, and that warm-up delay is the most direct test of pubsub reliability.

## Feature: config-help
**Source:** specs/onboarding.md
_Absorbed by onboarding (formerly sourced from chat.md). R50–R54 are the by-hand
CORS fallback, the honest step list, the step-marking for resume, and the
background re-probe of the onboarding readiness gate._

- **R50:** (inferred) When the daemon is unreachable at startup, the failure message includes this page's own origin — read from the browser, so correct for the player's actual gateway and port — and a JSON allowlist snippet adding it to `API.HTTPHeaders.Access-Control-Allow-Origin`, with a control to copy the origin.
- **R51:** (inferred) The startup failure message includes the `Pubsub` enabled JSON snippet and directs the player to apply both edits in the daemon's settings editor (IPFS Desktop's Settings screen or the WebUI, which stays reachable because its own origin is allowlisted) and restart.
- **R52:** (inferred) The startup failure screen leads with the one-time fix as the drag-and-click bookmarklet; the full ordered step list (single actions, honest count) and the by-hand alternative both sit behind a disclosure, surfacing only when the quick path fails so neither competes with it.
- **R53:** (inferred) Leaving the page to carry out a step marks that step as the current one, so a player interrupted partway through the procedure can see where they stopped when they return to the tab.
- **R54:** (inferred) While the failure screen is shown the app keeps probing the daemon by itself and proceeds as soon as it answers, because the fix is applied in another window and the moment it takes effect is not a moment the player is watching this page.

## Feature: delivery
**Source:** specs/delivery.md

- **R56:** The app is a static web page served from a stable public HTTPS origin (GitHub Pages); it is not delivered by IPFS, and Kubo is required only as the pubsub transport.
- **R57:** The page's origin does not change as the app is edited, so the daemon's CORS allowlist and the browser's local-network permission — both keyed to that origin — are authorized once and persist across builds.
- **R58:** The app reads its own `location.origin` and runs unchanged from whatever origin serves it (GitHub Pages or a local dev server).
- **R59:** A session is a room whose name is the capability; room names are random with ~128-bit entropy so they cannot be guessed or wandered into.
- **R60:** Starting a session mints the room and rewrites the page's own address bar to `?room=<label>-<random>`, so the visible URL is itself the invite — no separate invite artifact is constructed.
- **R61:** Opening the page with no room marks the visitor a host; opening with `?room=<random>` marks them a guest bound for that room.
- **R62:** A guest whose daemon is not ready is guided through onboarding and then placed in the requested room, the room name retained across the whole detour.
- **R63:** The GitHub-hosted console runs alongside the existing locally-served app for A/B comparison; both drive the same local daemon and share the same rooms and (unchanged) chat behaviour.

## Feature: onboarding
**Source:** specs/onboarding.md

- **R64:** Before joining a room the app confirms readiness and, when any condition is unmet, presents the onboarding flow to host and guest alike, resuming into the room once ready.
- **R65:** Readiness requires all four of: IPFS installed and running, pubsub enabled, the page's origin in the daemon's CORS allowlist, and the browser's local-network permission granted for that origin.
- **R66:** The connection attempt is a deliberate action taken after the page has loaded (a "connect" control), never an automatic fetch on page load.
- **R67:** Because a plain fetch failure is opaque (identical error for down, CORS, or permission), attribution pairs the ordinary CORS fetch with a `no-cors` probe, yielding ready / CORS-problem / needs-attention.
- **R68:** On Chrome the needs-attention case is refined by querying the local-network permission state (granted / prompt / denied), separating a permission block from a stopped daemon deterministically.
- **R69:** On Firefox the permission query is nominal (always "prompt"), so permission-denied and daemon-down are indistinguishable; onboarding relies on Firefox's own first-contact prompt (which fires only against a live daemon) and otherwise guides both fixes, biased by localStorage.
- **R70:** localStorage records the player's prior progress as expectation and fast-path only; the daemon's response is the arbiter, and a failed probe re-diagnoses from the daemon rather than trusting the store.
- **R71:** The two grants — the daemon-side CORS allowlist and the browser-side local-network permission — are presented as distinct steps and never conflated.
- **R72:** The CORS grant is installed by a bookmarklet the player runs on the daemon's own console page (never the app page, which hits the very allowlist wall being fixed), merging the origin into the allowlist per R55. (anchors gap A3)
- **R73:** The browser permission is granted via a loud, primed control whose label warns, before the prompt appears, that the browser is asking to reach the player's own IPFS node rather than to send notifications; the prompt appears only on contact with a live daemon.
- **R74:** Permission recovery depends on state: when un-decided the control summons the prompt; when denied the app guides the player to the browser's site-settings toggle because the browser will not re-ask; on Chrome the app watches the permission and advances the moment it changes.
- **R75:** Onboarding is a checkpointed sequence — install, enable pubsub, install the CORS grant, grant the browser permission, then the room — resumable per step, ordered so install-and-run precede the permission step (whose prompt needs a live daemon), and verifying a step against the daemon where its result can be checked rather than only attested. The CORS-grant step's presentation is R50–R54.
- **R76:** The app monitors daemon health and, on a dropped connection or a failed probe despite localStorage indicating configured, re-diagnoses from the daemon; a browser upgrade or copied profile characteristically loses only the browser permission while the daemon config survives.
- **R77:** (inferred) The bookmarklet is the only route the app offers to the daemon's console; no other control opens it, so the CORS step cannot be walked past by a player who has not installed the bookmarklet and would arrive there with nothing to click.
- **R78:** (inferred) The bookmarklet reports through a panel drawn into whatever page it is running on, never a modal dialog, because a modal standing between the player's click and the tab that click is meant to open can outlast the click's authority to open one.
- **R79:** (inferred) The instruction that the bookmarklet must be clicked again, on the page about to appear, is carried by the acknowledgement control itself rather than in prose beside it, because a player aiming at a button does not read the text around it; the control is disabled for a few seconds against a visible countdown, so the pause reads as deliberate rather than broken; and the console opens only on that acknowledgement, because once it is open the app has no channel to the player at all — measured, and not for want of trying: a separate window cannot raise itself, so it is buried by the tab it opens.
- **R80:** (inferred) The panel remains on the app page after the console opens, carrying that standing instruction, so a player who backs out to the tab they came from finds it rather than an unchanged screen.
- **R81:** (inferred) The console opens as an ordinary browser tab and never a pop-up window, because a pop-up window has no bookmarks bar and the second bookmarklet click would be impossible there; a tab the browser blocks is detected and the panel offers the console's address to open by hand instead of failing silently.
- **R82:** (inferred) Reading the daemon's configuration back confirms only that the write landed, never that the restarted daemon is serving under it — Kubo's config API reads stored configuration, and the CORS headers it governs are applied at daemon start — so the bookmarklet reports the write and asks for the restart but never declares the procedure succeeded, and no branch of it treats a successful read-back as evidence of a restart. Success is declared only by the app's own cross-origin probe (R54), the one check that exercises what is being fixed.
- **R83:** (inferred) The flow spends each human gesture on at most one window, because one gesture buys exactly one — a second `window.open` in the same gesture returns null whichever order they run in — and no window opens anything on another's behalf, because the pop-up blocker judges by the target window rather than the caller.
- **R84:** (inferred) The console page does not close itself on its own evidence: reachability answers as soon as the HTTP API listens, which precedes readiness. Having saved the configuration and observed the daemon return, it reports to the page that opened it and waits for that page's own probe to succeed before closing; with no opener, or no answer, it says so and leaves the tab open.
- **R85:** (inferred) When the app reaches ready it removes the crank handle's panel from its own page, because the panel is left standing by design (R80) and the bookmarklet that drew it is no longer running to retract it.
- **R86:** (inferred) A page that reuses a component wholesale supplies every element that component wires on construction, even for regions it never shows, so a code path reached only in a later state cannot fail on a missing node.
- **R87:** (inferred) Each instruction is anchored to the thing it refers to rather than gathered into prose above it: the drag instruction leads the bookmarklet, and the instruction to click it afterwards sits beside the bookmarklet pointing back at it. Reading order then matches the order of the player's hands — drag it, then click it — for the same reason the panel's instruction lives inside its button (R79).
- **R88:** A host may give the room a human-readable label, which becomes a prefix on the minted name (`<label>-<random>`); the random part is unchanged and carries all the entropy, so a label neither weakens the capability nor is ever trusted as part of it.
- **R89:** (inferred) The label field arrives pre-filled with a generated adjective-noun pair, so a host who types nothing still ends up with a room they can tell apart from another at a glance — which is the whole reason for the label, several bare hex names being indistinguishable in a chat history.
- **R90:** (inferred) The room is minted as soon as a host is ready, so the address bar is a working invite immediately; a rename is offered beside the room field, opening it for editing, and is committed when the field loses focus — leaving the field is what reaching for the URL requires, so the URL a host copies always reflects what they typed.
- **R92:** (inferred) A rename mints a fresh random half rather than keeping the existing one, because a holder of the previous link would otherwise retain every part of the capability except a label drawn from a published word list.
- **R91:** (inferred) A label is reduced to a name safe for a URL and a topic — lowercased, diacritics folded, runs of anything else collapsed to single hyphens, trimmed and length-capped — and an empty or entirely unusable label yields a bare random name rather than a malformed one.
