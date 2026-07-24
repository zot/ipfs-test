# KuboClient
**Requirements:** R20, R21, R23, R25, R26, R27, R28, R29, R47, R35

The only thing in the app that knows Kubo's RPC API exists. Owns the base
URL, the POST-only calling convention, the `arg` query parameter form, the
multipart publish body, and the multibase boundary.

Everything above this card deals in plain topic names and plain message text.
This card is where those become `u`-prefixed query arguments and multipart
uploads, and where the daemon's encoded replies become plain values again.

The subscription method is the unusual one: its HTTP response never
completes, so it cannot be awaited as a whole. It is consumed as a stream,
splitting on newlines and yielding each JSON object as it arrives. A partial
line at the end of a chunk is held until the rest of it arrives — a message
split across chunk boundaries must not be dropped or corrupted.

## Knows
- baseUrl: the daemon's RPC root, `http://127.0.0.1:5001`

## Does
- id: fetches this node's peer ID, and doubles as the daemon reachability check
- publish: sends message text to a topic as a multipart form upload
- subscribe: opens the streaming subscription and invokes a callback per
  decoded message; runs until its abort signal fires or the stream ends
- peers: fetches the peer IDs of other nodes subscribed to a topic
- rpc: the shared POST helper — builds the URL with repeated `arg` params,
  raises daemon errors as exceptions rather than returning them

## Collaborators
- Multibase: to encode topics outbound and decode payloads inbound

## Sequences
- seq-join.md
- seq-message.md
- seq-reconnect.md
