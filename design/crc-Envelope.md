# Envelope
**Requirements:** R12, R33, R34

Builds and validates the JSON envelope the app publishes as its pubsub
payload. Pure functions; no I/O, no DOM, no daemon.

Kubo carries opaque bytes, so the envelope is entirely this app's convention:
a nickname, the message text, a timestamp, and an identifier used to discard
duplicate gossip deliveries.

Parsing is the security-relevant half. A topic is public and anything may
publish to it, so a received payload is hostile input. Parse never throws and
never returns a partly-valid object: either every field is present and of the
right type, or the result is null and the caller drops the message. Nickname
and text are length-capped so one publisher cannot flood the transcript with
a single enormous message.

## Knows
- version: an envelope marker, so a future format change is distinguishable
- limits: maximum nickname and text lengths

## Does
- create: nickname and text → JSON string carrying a fresh identifier and timestamp
- parse: arbitrary text → validated envelope, or null if it is not one of ours
- newId: a random identifier unique enough to dedupe gossip redelivery

## Collaborators
- none

## Sequences
- seq-message.md
