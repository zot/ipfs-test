# Measurement
**Requirements:** R44, R45, R46, R47, R48, R49

Not a separate class — a responsibility carried by Room, given its own card
because it is the reason this spike exists. Gossipsub fails silently: a publish
succeeds whether or not any peer received the message, so reliability cannot be
judged by watching a chat window. This responsibility turns "does pubsub work"
into numbers.

The mechanism is a monotonic per-sender counter (Alibi Stamp applied to
delivery: each message carries proof of its own position, so a receiver detects
a missing one without the sender saying anything). A receiver tracks the last
counter seen per sender; a forward skip is loss, a backward step is reordering.
Keeping those apart matters — counting reordering as loss would overstate the
failure rate and misinform the very decision the spike feeds.

Two measurements need no counter. Time-to-first-peer, from subscribe to the
first non-empty peer poll, is the most direct test of the mesh warm-up theory.
Own round-trip latency is exact because one clock stamps and reads it; peer
latency is reported separately and flagged, because two machines' clocks differ
and the figure is only indicative.

The heartbeat exists because nobody types fast enough to produce a sample size.
An automatic numbered ping at a fixed interval generates traffic so the
instrument works unattended — leave two tabs open and read the loss rate off
later.

## Knows
- lastSeq: last counter seen per sender, for gap and reorder detection
- outSeq: this node's own outgoing counter
- stats: running totals — received, gaps, reordered, duplicates, dropped, sent,
  reconnects, latencies, peer count, join and first-peer timestamps
- heartbeatMs: heartbeat interval, or zero for off

## Does
- trackSequence: classify an arrival as in-order, a gap of N, or reordering
- setHeartbeat: start or stop the automatic numbered ping
- snapshot: derive loss rate, average latencies, and uptime for display and export

## Collaborators
- Room: whose subscription this instruments; the counters ride the Envelope
- Envelope: carries the per-sender seq and the send timestamp

## Sequences
- seq-message.md
