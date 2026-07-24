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

- **R36:** A player needs a Kubo daemon and nothing else — no web server, public IP, VPS, relay operated by us, or account.
- **R37:** Each player's daemon performs its own NAT traversal and reaches the network through public relays and the DHT, so no player needs to be reachable from outside.
- **R38:** The app is added to IPFS as a directory and opened via the IPNS-key subdomain gateway form, `http://<key>.ipns.localhost:<gateway-port>/`, whose origin stays constant across content edits because an IPNS key is a stable pointer that does not change when its content does.
- **R39:** The content-CID subdomain form (`<cid>.ipfs.localhost`) is deliberately not used for the shared link, because its origin embeds the CID and would fall out of the API allowlist on every edit; the immutable `/ipfs/<cid>/` path form is retained only for pinning or naming an exact build.
- **R40:** Because a gateway origin includes its port (8080 for a default Kubo install), the allowlist lists the IPNS-key origin at that, so the configuration line fits the default install's port.
- **R41:** The IPNS name is the shared link and survives edits, always resolving to the current build, while a raw `/ipfs/<cid>/` link names one specific version.
- **R42:** A publish command adds the site directory, reports the resulting CID and both gateway URLs, and republishes the IPNS name to point at it.
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
**Source:** specs/chat.md

- **R50:** (inferred) When the daemon is unreachable at startup, the failure message includes this page's own origin — read from the browser, so correct for the player's actual gateway and port — and a JSON allowlist snippet adding it to `API.HTTPHeaders.Access-Control-Allow-Origin`, with a control to copy the origin.
- **R51:** (inferred) The startup failure message includes the `Pubsub` enabled JSON snippet and directs the player to apply both edits in the daemon's settings editor (IPFS Desktop's Settings screen or the WebUI, which stays reachable because its own origin is allowlisted) and restart.
- **R52:** (inferred) The startup failure screen leads with the one-time fix as a single drag-and-click; the full ordered step list (single actions, honest count) and the by-hand alternative both sit behind a disclosure, surfacing only when the quick path fails so neither competes with it.
- **R53:** (inferred) Leaving the page to carry out a step marks that step as the current one, so a player interrupted partway through the procedure can see where they stopped when they return to the tab.
- **R54:** (inferred) While the failure screen is shown the app keeps probing the daemon by itself and proceeds as soon as it answers, because the fix is applied in another window and the moment it takes effect is not a moment the player is watching this page.
