# Test Design: Readiness
**Source:** crc-Readiness.md

The detection truth table, codified. A fake KuboClient decides each of the CORS
fetch and the no-cors probe independently (resolve or throw), and a fake
Permissions API returns a state or throws "unrecognized". No daemon, no browser.
Cells mirror the Chrome and Firefox matrices measured on 2026-07-24.

## Test: ready
**Purpose:** a reachable, allowlisted, permitted daemon reads as ready (R67)
**Input:** CORS fetch resolves; permission granted
**Expected:** diagnosis `ready`
**Refs:** crc-Readiness.md, seq-readiness.md#1.4

## Test: cors problem (no-cors reaches)
**Purpose:** daemon up + permitted but origin not allowlisted (R67)
**Input:** CORS fetch throws; no-cors probe resolves (opaque)
**Expected:** diagnosis `cors` — on both browsers, independent of the API
**Refs:** crc-Readiness.md, seq-readiness.md#1.4

## Test: Chrome — permission denied
**Purpose:** Chrome attributes a blocked permission precisely (R68)
**Input:** CORS fetch throws; no-cors throws; `local-network-access` = denied
**Expected:** diagnosis `permission`
**Refs:** crc-Readiness.md, seq-readiness.md#1.6

## Test: Chrome — daemon down
**Purpose:** Chrome separates a stopped daemon from a blocked permission (R68)
**Input:** CORS fetch throws; no-cors throws; `local-network-access` = granted
**Expected:** diagnosis `daemon-down`
**Refs:** crc-Readiness.md, seq-readiness.md#1.6

## Test: Firefox — the collapse
**Purpose:** Firefox cannot separate permission-denied from daemon-down (R69)
**Input:** CORS fetch throws; no-cors throws; permission query nominal (`prompt`/unrecognized)
**Expected:** diagnosis `permission-or-daemon`
**Refs:** crc-Readiness.md, seq-readiness.md#1.7

## Test: probe is deliberate
**Purpose:** the probe runs only when called, never as an import/construction side effect (R66)
**Input:** construct Readiness; assert the fake client saw no calls until probe() is invoked
**Expected:** zero daemon calls before the deliberate probe()
**Refs:** crc-Readiness.md, seq-readiness.md#1.1
