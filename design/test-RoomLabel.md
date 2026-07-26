# Test Design: RoomLabel
**Source:** crc-RoomLabel.md

## Test: folds diacritics instead of replacing them
**Purpose:** R91 — a host typing an accented word should get the word, not a
gap. Without the NFD fold, `café` slugs to `caf-`, which reads as a bug rather
than a name and is the sort of thing nobody notices until a player asks.
**Input:** `'  Café du Monde!! '`.
**Expected:** `'cafe-du-monde'` — accent folded, punctuation and runs of spaces
collapsed to single hyphens, ends trimmed.
**Refs:** crc-RoomLabel.md

## Test: an unusable label yields the empty string
**Purpose:** R91 — Session reads empty as "no label" and mints a bare random
name. Returning a hyphen or a stub instead would produce a malformed room.
**Input:** `'!!!'`, `''`, `null`, `undefined`.
**Expected:** `''` for each.
**Refs:** crc-RoomLabel.md

## Test: the length cap never leaves a dangling hyphen
**Purpose:** R91 — the cap is applied after collapsing, so it can cut in the
middle of a run and strand a trailing hyphen. That is why the trim runs twice.
**Input:** a label whose slug has a hyphen exactly at the cut.
**Expected:** no leading or trailing hyphen, and no longer than the cap.
**Refs:** crc-RoomLabel.md

## Test: a suggested label is two words joined by a hyphen
**Purpose:** R89 — the pre-filled name must itself be a valid label, or the very
first room a host gets would need slugifying to be usable.
**Input:** suggestLabel with a stub crypto source.
**Expected:** matches the slug shape, survives slugify unchanged, and both words
come from the lists.
**Refs:** crc-RoomLabel.md

## Test: suggestion draws from the injected crypto source
**Purpose:** R89 — the same source as the room's random half, so no second
random source exists in this flow for someone to reach for by mistake.
**Input:** a stub whose getRandomValues writes known values.
**Expected:** the chosen words are the ones those values index.
**Refs:** crc-RoomLabel.md
