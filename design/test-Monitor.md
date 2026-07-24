# Test Design: Monitor
**Source:** crc-App.md

The timer functions are injected, so every case below is driven a tick at a
time rather than by waiting on real seconds.

## Test: keeps waiting while the daemon is unreachable
**Purpose:** R54 — a failing probe is the expected case, not an error. The
daemon being unreachable is *why* the watch exists, so it must not be mistaken
for a reason to stop or to report success.
**Input:** a probe that always rejects; two ticks.
**Expected:** the callback never fires and the watch is still running.

## Test: reports and stops as soon as the daemon answers
**Purpose:** R54 — the whole point is to carry on unprompted the moment the fix
lands, and to stop probing once it has.
**Input:** a probe that rejects, then resolves; one tick of each.
**Expected:** the callback fires exactly once, and the watch stops.

## Test: starting again replaces the previous watch
**Purpose:** two live watchers would both fire and restart the app twice.
**Input:** `start()` called twice.
**Expected:** the first timer is cleared before the second is armed.

## Test: stop() disarms the watch
**Purpose:** startup must be able to call off the watch when it succeeds by
another route — the player pressing "try again" themselves.
**Input:** `start()` then `stop()`.
**Expected:** not running, and no timer left armed.
