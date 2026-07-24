# Room
**Requirements:** R2, R4, R6, R7, R8, R10, R11, R14, R18, R22, R30, R44, R45, R46, R47, R48, R49

Owns one room's subscription: the app's only genuinely stateful component.
A subscription outlives the messages crossing it, so this is where dedupe
state, backoff state, and liveness live.

Sending publishes and does nothing else. The transcript is not touched on
send — the message reaches the view only when the subscription delivers it
back, which the daemon does for a node's own publishes. So what is displayed
is what the network actually carried, and a silent publish failure shows up
as a missing message rather than being masked by an optimistic echo.

Gossip may deliver the same message more than once, so every envelope
identifier seen is remembered and repeats are dropped. The set is bounded:
an unbounded set is a slow leak in a long-lived room, so oldest identifiers
are evicted once it grows past its cap.

Healing is the other job. The subscription stream ends whenever the daemon
restarts or the connection breaks. Rather than treating that as fatal, the
room reports the drop and reopens, waiting longer between successive failures
so a daemon that is down is not hammered. Messages sent while it was down are
gone; pubsub is not a durable log and this design does not pretend it is.

## Knows
- topic: the plain room name currently joined, or none
- selfPeerId: this node's peer ID, used to mark which messages are ours
- seen: bounded set of envelope identifiers already delivered
- controller: the abort controller cancelling the current subscription
- backoff: current reconnect delay, reset on a successful reopen
- running: whether a join is currently active, so a reconnect loop stops on leave

## Does
- join: records the topic, opens the subscription, starts presence polling
- leave: aborts the subscription and stops polling, unsubscribing at the daemon
- send: builds an envelope and publishes it; raises on failure so the caller
  can restore the text, and adds nothing to the transcript
- handleLine: parses, drops non-envelopes and duplicates, marks ours, emits
- reconnect: on stream end, reports and reopens with growing backoff
- pollPeers: periodically reads subscriber count and emits it
- on/emit: a minimal listener registry for message, presence, and status events

## Collaborators
- KuboClient: to publish, subscribe, and read peers
- Envelope: to build outbound payloads and validate inbound ones
- Measurement: the instrumentation responsibility this class carries; see crc-Measurement.md

## Sequences
- seq-join.md
- seq-message.md
- seq-reconnect.md
