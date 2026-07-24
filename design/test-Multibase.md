# Test Design: Multibase
**Source:** crc-Multibase.md

## Test: encodes the topic form kubo accepts
**Purpose:** Pin the exact wire vector the live daemon accepted (`test-room` →
`udGVzdC1yb29t`). If this drifts, publishing silently breaks.
**Input:** the string `test-room`.
**Expected:** `udGVzdC1yb29t`.
**Refs:** crc-Multibase.md, seq-message.md#1.6

## Test: round trips (incl. non-ascii and empty)
**Purpose:** Encoding then decoding is the identity.
**Input:** empty string, ascii, spaces, JSON, and `héllo — 世界 🎲`.
**Expected:** output equals input.
**Refs:** crc-Multibase.md

## Test: base64url alphabet, no padding
**Purpose:** The `u` variant must never emit `+`, `/`, or `=`.
**Input:** bytes that would produce those in standard base64.
**Expected:** none of those characters appear.
**Refs:** crc-Multibase.md

## Test: rejects a prefix that is not u
**Purpose:** A wrong base decodes to plausible garbage, so it must fail loudly.
**Input:** a `b`-prefixed string, empty string, null.
**Expected:** throws "unsupported multibase prefix".
**Refs:** crc-Multibase.md

## Test: decodes invalid utf-8 without throwing
**Purpose:** Arbitrary bytes on a public topic must yield replacement chars for
Envelope to reject, not an exception that tears down the subscription.
**Input:** multibase of bytes `ff fe 00 41`.
**Expected:** a string, no throw.
**Refs:** crc-Multibase.md, cross-cutting: untrusted input
