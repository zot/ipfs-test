# Kubo Delegation

The browser performs no IPFS or libp2p networking. It has no DHT, no peer
connections, no swarm, no transport. Everything the app does on the network
it does by asking a Kubo daemon running on the same machine, over HTTP.

This is a deliberate division: Kubo is a full node with real connectivity;
the browser is a view onto it.

## The daemon

Kubo's RPC API at `http://127.0.0.1:5001`, verified against Kubo 0.42.0.

Pubsub must be enabled on the daemon (`Pubsub.Enabled: true`, gossipsub
router). Without it the pubsub endpoints error and the app cannot work.

## Calling convention

Every RPC call is a **POST**, including calls that only read. A GET is
rejected. Arguments are query parameters named `arg`, repeated for multiple
arguments.

## Multibase encoding

Pubsub topic names are not passed as plain text. They must be **multibase
encoded**, and the daemon rejects anything else — a plain topic string
produces `URL arg must be multibase encoded`.

The app uses base64url without padding, whose multibase prefix is the letter
`u`. So the topic `test-room` is sent as `udGVzdC1yb29t`.

The same encoding appears on the way back: a received message's payload,
sequence number, and topic list are all multibase strings the app must
decode. The publisher's peer ID is *not* encoded — it arrives as a plain
peer ID string.

## Endpoints used

- **`/api/v0/id`** — the local node's identity. Used to learn this node's
  peer ID, which is how the app recognizes its own messages coming back, and
  to confirm the daemon is reachable at all.

- **`/api/v0/pubsub/sub?arg=<topic>`** — subscribe. The response never ends:
  it is a stream of newline-delimited JSON objects, one per message, each
  carrying the publisher, the payload, a sequence number, and the topics. The
  app reads it incrementally as it arrives rather than waiting for a response
  that will never complete. Closing the request unsubscribes.

- **`/api/v0/pubsub/pub?arg=<topic>`** — publish. The message payload is the
  body, sent as a multipart form upload rather than as raw bytes. Returns
  empty on success.

- **`/api/v0/pubsub/peers?arg=<topic>`** — the peer IDs of other nodes the
  daemon currently sees subscribed to the topic. Used for the presence count.

## Self-delivery

A node's own published messages are delivered back to its own subscription.
This is what lets the app render only what it receives, and what lets two
browser tabs on a single daemon hold a conversation with no second machine
involved.

## Browser access and CORS

Kubo does not merely omit CORS headers for an unrecognized origin — it
refuses the request with `403 Forbidden`. This applies to the `null` origin a
`file://` page sends, which is why the app must be served over HTTP.

The origin the app is served from must be listed in the daemon's
`API.HTTPHeaders.Access-Control-Allow-Origin`, with `POST` and `OPTIONS`
allowed in `API.HTTPHeaders.Access-Control-Allow-Methods`. The daemon reads
these at startup, so changing them requires a restart.

The origins this app needs are the local gateway it is served from and, during
development, a plain static server; see publishing.md for both. Configuring
them must not remove entries already in the allowlist, because the allowlist is
replaced wholesale rather than appended to, so a rewrite that omits an entry
takes it away and the loss surfaces later, somewhere unrelated.

What that protects is narrower than it first appears, and worth stating
exactly. IPFS Desktop's own window is an Electron application, not a browser
origin, so it needs no entry and is not what breaks. The same web UI can also
be opened as an ordinary browser page, and *that* page is a normal origin which
loses access to the daemon if its entry is dropped — which is the loss actually
being guarded against.

A tool that reads the current allowlist before writing it can be more precise
than a blind paste. It should merge rather than replace, and add only what is
genuinely required. In particular it should not introduce
`https://webui.ipfs.io` to a daemon that did not already have it: that entry
grants a public website access to a local API, and a player who never had it
gains nothing by acquiring it here.

## A replaceable transport

Delegating to the daemon over HTTP is one way to reach the network, and not
the only one. A libp2p node running in the browser could join the same
gossipsub topics directly over WebTransport or WebRTC, needing no daemon on
the player's machine and no API allowlist at all — at the cost of a build step
and some always-reachable node to meet at.

That trade is not being made now, but it is close enough to matter. So
everything Kubo-specific — the base URL, the POST convention, multibase, the
multipart publish body, the streaming subscription — is confined to a single
component behind a narrow boundary: identify yourself, subscribe, unsubscribe,
publish, list peers. Nothing above that boundary knows Kubo exists.

## Message format

The payload the app publishes is its own concern, not Kubo's — the daemon
carries opaque bytes. The app uses a small JSON envelope carrying the
sender's chosen nickname, the message text, a timestamp, and an identifier
used to discard duplicate deliveries.

Because a topic is public and anything may publish to it, a received payload
is untrusted input. It may not be JSON, may not have the expected fields, and
its values may be of any type. Every field is validated before use.
