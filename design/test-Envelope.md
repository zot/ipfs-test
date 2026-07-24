# Test Design: Envelope
**Source:** crc-Envelope.md

## Test: round trips chat and heartbeat kinds
**Purpose:** create → parse preserves nick, text, seq, and kind.
**Input:** a chat message and a `beat` message.
**Expected:** fields survive; a fresh id and finite ts are present.
**Refs:** crc-Envelope.md

## Test: ids differ between messages
**Purpose:** dedupe depends on id uniqueness.
**Input:** 200 generated ids.
**Expected:** 200 distinct values.
**Refs:** crc-Envelope.md

## Test: rejects anything that is not one of ours
**Purpose:** Every field is validated because the input is hostile. Each case
is something a different or malicious publisher could place on a public topic.
**Input:** non-JSON, null, array, wrong version, missing/empty id, unknown
kind, wrong-typed nick/text, non-numeric ts, non-integer/negative seq.
**Expected:** every case parses to null.
**Refs:** crc-Envelope.md, cross-cutting: untrusted input

## Test: never throws on hostile input
**Purpose:** parse is called on every delivery; a throw would kill the reader.
**Input:** truncated JSON, whitespace, undefined, null, a number.
**Expected:** no throw.
**Refs:** crc-Envelope.md

## Test: caps oversized fields on the way in
**Purpose:** The sender is not trusted to have honoured length limits.
**Input:** a valid envelope with a 500-char nick and 50000-char text.
**Expected:** nick and text truncated to their maxima.
**Refs:** crc-Envelope.md

## Test: markup survives as text
**Purpose:** confirms no parsing-side interpretation of markup (rendering-side
escaping is ChatView's job, tested by inspection of textContent use).
**Input:** a message whose text is an `<img onerror>` payload.
**Expected:** text preserved verbatim as a string.
**Refs:** crc-Envelope.md, crc-ChatView.md
