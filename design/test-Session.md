# Test Design: Session
**Source:** crc-Session.md

Pure URL/identity logic, tested against an injected fake `location`/`history` and
a seedable fake crypto source — no browser.

## Test: host when no room
**Purpose:** absence of `?room=` is a host (R61)
**Input:** location.search = ""
**Expected:** role `host`, room none
**Refs:** crc-Session.md, seq-session.md#2.1

## Test: guest when room present
**Purpose:** `?room=<name>` is a guest bound for that room (R61)
**Input:** location.search = "?room=7f3a...c2"
**Expected:** role `guest`, room "7f3a...c2"
**Refs:** crc-Session.md, seq-session.md#2.1

## Test: minted room is high-entropy and unique
**Purpose:** room names are unguessable and do not repeat (R59)
**Input:** call mint() twice
**Expected:** each is ~128 bits in the expected charset; the two differ
**Refs:** crc-Session.md, seq-session.md#1.2

## Test: start rewrites the address bar
**Purpose:** starting a session makes the URL its own invite (R60)
**Input:** host; call start()
**Expected:** fake history received a replace to a URL carrying `?room=<minted>`; inviteUrl() returns it
**Refs:** crc-Session.md, seq-session.md#1.3

## Test: guest room survives a re-read
**Purpose:** the room is retained across the onboarding detour because the URL is untouched (R62)
**Input:** guest; read(), then read() again after an interleaved no-op
**Expected:** the same room both times
**Refs:** crc-Session.md, seq-session.md#2.4

## Test: a label prefixes the room without touching the random half
**Purpose:** R88 — the label is decoration; a change that eroded or shortened
the random half would weaken the capability while looking cosmetic.
**Input:** `start('Café du Monde!!')` on a fake location/history/crypto.
**Expected:** `cafe-du-monde-<32 hex>`, `label` set to the slug, and the address
bar rewritten to that room.
**Refs:** crc-Session.md, crc-RoomLabel.md

## Test: an unusable label yields a bare random room
**Purpose:** R91 — a label of pure punctuation must not produce a leading hyphen
or an empty prefix. Falling back to a bare random name is the honest result.
**Input:** `start` with `'!!!'`, `''`, `null`, `undefined`.
**Expected:** a bare 32-hex room each time, and an empty `label`.
**Refs:** crc-Session.md

## Test: renaming mints a new random half, not just a new label
**Purpose:** R92 — keeping the old random half would leave a holder of the
previous link holding all of the capability but one word from a published list.
Uses the *same* label twice so only the random half can account for the change.
**Input:** `start('game-night')` twice.
**Expected:** different rooms, and specifically different random halves.
**Refs:** crc-Session.md
