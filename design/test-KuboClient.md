# Test Design: KuboClient
**Source:** crc-KuboClient.md

Tested with a stubbed `fetch` returning a hand-fed `ReadableStream`, so the
stream-reassembly logic is exercised without a daemon. End-to-end behaviour
against the real daemon is covered by smoke-live.js (see test-Room.md).

## Test: reassembles a message split across chunk boundaries
**Purpose:** R27 — a line split mid-message must be buffered and rejoined.
**Input:** one NDJSON line cut into three pieces, none a whole line.
**Expected:** exactly one message, fields intact.
**Refs:** crc-KuboClient.md, seq-message.md#2.2

## Test: handles several messages in one chunk
**Purpose:** the buffer must drain every complete line, not just the first.
**Input:** three lines concatenated in a single chunk.
**Expected:** three messages in order.
**Refs:** crc-KuboClient.md

## Test: skips a broken framing line without dropping the stream
**Purpose:** a corrupt daemon framing line must not kill the subscription.
**Input:** a non-JSON line followed by a valid one.
**Expected:** the valid message still arrives.
**Refs:** crc-KuboClient.md, seq-message.md#2.3

## Test: encodes the topic in the subscribe URL
**Purpose:** R24 — the topic crosses the wire multibase-encoded.
**Input:** subscribe to `test-room`.
**Expected:** request URL carries `arg=udGVzdC1yb29t`.
**Refs:** crc-KuboClient.md
