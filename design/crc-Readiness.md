# Readiness
**Requirements:** R65, R66, R67, R68, R69, R76

Decides which readiness condition is unmet, without being fooled by the
browser's deliberately-opaque fetch errors. This is the detection engine: it
reports a diagnosis and neither touches the DOM nor drives the flow.

The core method, established by testing both browsers: a plain fetch to the
daemon fails identically whether the daemon is down, the origin is
un-allowlisted, or the permission is denied — so a `no-cors` probe runs
alongside it. The no-cors probe reaches a live daemon even without a CORS grant,
but only when the browser permission already lets the request out, which splits
the cases the plain fetch cannot (R67). On Chrome the permission state is
readable and finishes the attribution; on Firefox it is nominal and two cases
collapse (R68, R69).

## Knows
- corsProbe / noCorsProbe: thin async adapters GithubApp builds over KuboClient —
  the CORS fetch and the no-cors probe
- permission: an adapter over the Permissions API returning the authoritative
  local-network state where the browser gives one (Chrome), else nominal (Firefox)
- the four readiness conditions it is ultimately deciding between (R65)

## Does
- probe: on a deliberate call, never on load (R66), run the CORS fetch and the
  no-cors probe together and classify — fetch ok → ready; fetch fails + no-cors
  reaches → cors; fetch fails + no-cors throws → needs-attention (R67)
- attribute: refine needs-attention. Chrome — query `local-network-access`:
  granted → daemon-down, not granted → permission (R68). Firefox — the query is
  nominal, so report `permission-or-daemon`, carrying the first-contact prompt
  behaviour as a hint (R69)
- watch: subscribe to the permission's change event where the browser exposes
  one, and re-diagnose; a dropped live connection or a failed probe despite
  localStorage triggers the same re-diagnosis (R76)

## Collaborators
- KuboClient / Permissions API: reached only through the injected adapters, so the
  whole truth table tests with fakes; GithubApp builds the adapters
- Onboarding: calls probe() and reacts to the diagnosis

## Sequences
- seq-readiness.md
