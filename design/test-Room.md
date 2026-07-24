# Test Design: Room
**Source:** crc-Room.md, crc-Measurement.md

Room is tested two ways: unit tests with a fake transport (no daemon), and a
live smoke test with the real daemon. The fake satisfies the transport seam
(crc-KuboClient.md), so the unit tests exercise the real Room logic without
HTTP.

## Test: delivers a message and marks whose it is
**Purpose:** R10 — own vs other by peer id.
**Input:** deliver from `self` and from `peer`.
**Expected:** first is mine, second is not; nick preserved.
**Refs:** crc-Room.md, seq-message.md#2.7

## Test: send publishes but adds nothing to the transcript
**Purpose:** R7 — no local echo; what shows is what the network carried.
**Input:** two sends, nothing delivered back.
**Expected:** zero messages emitted; two publishes; outgoing seq 1 then 2.
**Refs:** crc-Room.md, seq-message.md#1.5

## Test: shows a redelivered message once
**Purpose:** R11 — gossip redelivery is deduped by id.
**Input:** same envelope delivered three times.
**Expected:** one emission; duplicates counter is 2.
**Refs:** crc-Room.md, seq-message.md#2.6

## Test: counts a sequence gap as loss
**Purpose:** R45 — the finding the spike produces.
**Input:** seq 1 then seq 4 from one sender.
**Expected:** gaps 2; emitted gap marker 2; loss 50%.
**Refs:** crc-Measurement.md

## Test: no loss blamed for first message from a sender
**Purpose:** a late joiner's first-seen seq is not retroactive loss.
**Input:** first delivery has seq 9.
**Expected:** gaps 0.
**Refs:** crc-Measurement.md

## Test: gaps counted per sender, not globally
**Purpose:** interleaved senders must not create phantom gaps.
**Input:** a1,b1,a2,b2.
**Expected:** gaps 0.
**Refs:** crc-Measurement.md

## Test: out-of-order is reordering, not loss
**Purpose:** counting reorder as loss would overstate the failure rate.
**Input:** seq 1, seq 3 (gap 1), then the straggler seq 2.
**Expected:** reordered 1; gaps stays 1, not double-counted.
**Refs:** crc-Measurement.md

## Test: ignores payloads that are not ours
**Purpose:** R12 — a broken publisher must not disturb the reader.
**Input:** non-JSON, foreign JSON, then a valid message.
**Expected:** one emission; dropped counter 2.
**Refs:** crc-Room.md

## Test: reports peer count and time to first peer
**Purpose:** R14, R49.
**Input:** transport reports two peers; join.
**Expected:** presence count 2; firstPeerAt recorded.
**Refs:** crc-Measurement.md, seq-join.md#1.7

## Test: leaving ends subscription and stops timers
**Purpose:** R4 — leave unsubscribes and cleans up; the plain topic crosses the
seam, not an encoded one.
**Input:** join then leave.
**Expected:** running false, topic null, timers cleared, lastTopic `lobby`.
**Refs:** crc-Room.md, seq-join.md#1.3

## Test: joining a second room resets measurements
**Purpose:** R4 — fresh stats per room.
**Input:** accumulate gaps, then join another room.
**Expected:** gaps and received reset to 0.
**Refs:** crc-Measurement.md

## Test: bounds the duplicate-detection set
**Purpose:** R11 — an unbounded seen-set leaks over a long session.
**Input:** 4200 distinct messages.
**Expected:** seen size ≤ 4000; order array matches set size.
**Refs:** crc-Room.md

## Test: live self-delivery (smoke-live.js)
**Purpose:** R30 — against the real daemon, the exact browser code path:
multibase, multipart publish, streaming read, self-delivery. Not in the unit
suite because it needs a running Kubo.
**Input:** subscribe to a fresh topic, publish two messages.
**Expected:** both return, identified as ours, payload intact, zero loopback
gaps.
**Refs:** crc-KuboClient.md, crc-Room.md, seq-message.md
