# Test Design: Onboarding
**Source:** crc-Onboarding.md

Flow logic against a fake Readiness (scripted diagnoses), a fake OnboardingView
(records what it was told to show, replays attestations), and an in-memory
localStorage double. No DOM, no daemon.

## Test: shows the step for the unmet condition
**Purpose:** the first unmet condition is the step shown (R64)
**Input:** Readiness returns `cors`
**Expected:** the view was told to show the CORS/bookmarklet step
**Refs:** crc-Onboarding.md, seq-onboarding.md#1.5

## Test: permission step comes after the daemon is live
**Purpose:** ordering — a stopped daemon never shows the permission step (R75)
**Input:** Readiness returns `daemon-down`
**Expected:** the `setup` step is shown; the permission step is not
**Refs:** crc-Onboarding.md, seq-onboarding.md#1.7

## Test: ready proceeds to the room
**Purpose:** a ready daemon hands off to the room with the session's role and room (R64)
**Input:** Readiness returns `ready`
**Expected:** onReady is called with (role, room); no step is shown
**Refs:** crc-Onboarding.md, seq-onboarding.md#1.11

## Test: daemon overrides a stale flag
**Purpose:** the daemon is the arbiter, not the store (R70)
**Input:** localStorage holds a stale `permissionDenied`; Readiness returns `daemon-down`
**Expected:** the `setup` step is shown, not a permission recovery — the diagnosis wins
**Refs:** crc-Onboarding.md, seq-onboarding.md#1.3

## Test: denied permission switches to recovery
**Purpose:** a denied permission routes to the site-settings recovery, not another prompt (R74)
**Input:** Readiness returns `permission`; the view reports the permission was previously denied
**Expected:** the view was told to show the recovery pointer, not to re-summon the prompt
**Refs:** crc-Onboarding.md, seq-onboarding.md#1.7
