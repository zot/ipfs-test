# Sequence: Detect readiness and attribute a failure

Covers R66, R67, R68, R69, R76.

The connection is attempted only on a deliberate call (the "connect" gesture),
never on load. A plain fetch failure is opaque, so a no-cors probe runs
alongside it; the two together, plus the permission query on Chrome, name the
unmet condition. Firefox's query is nominal, so two cases collapse there.

```
1. Probe and attribute

1.1. Onboarding -> Readiness      probe() — on the connect gesture, not on load
1.2. Readiness -> KuboClient      identify() via the ordinary CORS fetch
1.3. Readiness -> KuboClient      no-cors probe to the same endpoint
1.4. Readiness -> Readiness       classify: fetch ok -> ready; fails + no-cors reaches -> cors; fails + no-cors throws -> needs-attention
1.5. Readiness -> Permissions     needs-attention on Chrome: query local-network-access
1.6. Readiness -> Readiness       granted -> daemon-down; not granted -> permission
1.7. Readiness -> Readiness       needs-attention on Firefox: query nominal -> permission-or-daemon, prompt-behaviour as hint
1.8. Readiness -> Onboarding      diagnosis: ready | cors | permission | daemon-down | permission-or-daemon
```

```
2. Watch and re-diagnose

2.1. Readiness -> Permissions     subscribe to the permission change event, where exposed
2.2. Permissions -> Readiness     change -> rerun the probe of diagram 1
2.3. Readiness -> Onboarding      updated diagnosis; a dropped live connection or a failed probe despite localStorage triggers the same rerun
```
