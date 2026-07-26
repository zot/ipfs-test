# Design: Browser Pubsub Chat over Kubo

## Intent

A static browser page that holds a live chat over IPFS pubsub, doing no
networking of its own. Every network effect is a POST to a Kubo daemon on
localhost. The browser is a view onto a full node, not a node.

The shape follows from that. A thin transport layer (`KuboClient`) owns the
daemon's calling convention and its multibase encoding, so nothing above it
knows Kubo exists in detail. Two pure modules (`Multibase`, `Envelope`) hold
the logic worth testing without a daemon: encoding, and validating untrusted
payloads off a public topic. `Room` owns the one genuinely stateful thing —
a subscription that outlives individual messages, must dedupe, and must heal
itself when it drops. `ChatView` touches the DOM and nothing else. `App`
wires them and remembers preferences.

The design leans on one verified property of the daemon: a node delivers its
own published messages back to its own subscription. That lets the app render
only what it receives, with no optimistic local echo, so the transcript is
evidence the network carried the message rather than a hopeful guess. It also
means two browser tabs on one daemon can hold a conversation, which is how
this prototype is demonstrated.

A second delivery is being added alongside the original: a **GitHub-hosted
console** served from a stable public HTTPS origin that drives the same local
daemon (see specs/delivery.md, specs/onboarding.md). It reuses the transport
and chat components untouched (R58/R43) and adds five components around them —
Session (the URL is the session's identity), Readiness (a browser-branched
detection engine), Onboarding and OnboardingView (the guided readiness gate),
and GithubApp (its entry point). The original `index.html`/App stays in place so
the two can be compared (A/B).

## Cross-cutting Concerns

- **Untrusted input.** A pubsub topic is public and anything may publish to
  it. Every payload crossing `Envelope.parse` is treated as hostile: it may
  not be JSON, may lack fields, may hold any type. Parse returns null rather
  than throwing, and callers drop nulls silently. Text reaches the DOM only
  through `textContent`, never `innerHTML`.
- **Error surfacing, not swallowing.** Daemon failures are shown, not
  hidden. The single exception is a malformed payload from another
  publisher, which is dropped quietly because it is someone else's bug and
  must not be able to disrupt the reader.
- **Encoding boundary.** Multibase lives in `Multibase` and is applied only
  by `KuboClient`. Above the transport, topics and payloads are plain
  strings. Nothing in `Room`, `ChatView`, or `App` sees a `u`-prefix.
- **Cancellation.** Every subscription is opened with an `AbortSignal`.
  Leaving a room aborts it, which is what unsubscribes at the daemon.

## Artifacts

### CRC Cards
- [x] crc-Multibase.md → `src/multibase.js`
- [x] crc-KuboClient.md → `src/kubo.js`
- [x] crc-Envelope.md → `src/envelope.js`
- [x] crc-Room.md → `src/room.js`
- [x] crc-Measurement.md → `src/room.js`
- [x] crc-ChatView.md → `src/view.js`
- [x] crc-App.md → `src/app.js`, `src/monitor.js`, `index.html`
- [ ] crc-ConfigHelp.md → `src/config-help.js`, `src/crank-handle.js`
- [x] crc-Session.md → `src/session.js`
- [x] crc-Readiness.md → `src/readiness.js`
- [x] crc-Onboarding.md → `src/onboarding.js`
- [ ] crc-OnboardingView.md → `src/onboarding-view.js`
- [x] crc-GithubApp.md → `src/github-app.js`, `github.html`

### Sequences
- [x] seq-join.md → `src/app.js`, `src/room.js`
- [x] seq-message.md → `src/room.js`, `src/kubo.js`
- [x] seq-reconnect.md → `src/room.js`
- [x] seq-readiness.md → `src/readiness.js`
- [x] seq-onboarding.md → `src/onboarding.js`
- [x] seq-session.md → `src/session.js`

### UI Layouts
- [x] ui-chat.md → `index.html`, `src/view.js`
- [ ] ui-onboarding.md → `github.html`, `src/onboarding-view.js`

### Manifests
- [x] manifest-daemon.md → `SETUP.md`

### Test Designs
- [x] test-Multibase.md → `test/multibase.test.js`
- [x] test-Envelope.md → `test/envelope.test.js`
- [x] test-Room.md → `test/room.test.js`, `test/smoke-live.js`
- [x] test-KuboClient.md → `test/kubo.test.js`
- [x] test-ConfigHelp.md → `test/config-help.test.js`
- [x] test-Monitor.md → `test/monitor.test.js`
- [x] test-Session.md → `test/session.test.js`
- [x] test-Readiness.md → `test/readiness.test.js`
- [x] test-Onboarding.md → `test/onboarding.test.js`

## Gaps

- A1: R31,R32 (CORS allowlist + preserving webui origins) are operational daemon-config requirements; design home is manifest-daemon.md and SETUP.md, not a runtime CRC class. Code coverage: SETUP.md.
- A2: R36 (a player needs only a daemon), R37 (the daemon's own NAT traversal), and R43 (dev-server + origin-agnostic) are operational/transport/dev facts with no runtime CRC class; home is specs/publishing.md (reduced) + delivery.md + onboarding.md. The IPFS-delivery requirements R38–R42 are retired (T1–T5); manifest-publish.md and its publish command are removed.
- [ ] O1: ChatView DOM rendering (textContent escaping R13, own/other alignment R10, gap markers) is verified by code inspection and the Envelope markup test, not by an automated DOM test — jsdom would add the project's first dependency, disproportionate for a spike. Envelope guarantees text is never interpreted; ChatView's textContent use is the remaining unautomated link.
- [ ] O2: Reconnect backoff loop (seq-reconnect) is covered for the leave-abort path but its growing-delay timing is not asserted (would need fake timers). The live failure mode — daemon restart — is better checked by the manual two-node run.
- A3: (resolved 2026-07-25) The crank-handle bookmarklet (src/crank-handle.js) is now anchored — the drag-to-install CORS flow is a first-class requirement of the console (R72, onboarding.md), reused by OnboardingView. It met the anchor condition: it worked for a non-author player. Retained as the record of when it was unanchored.
- T1: R38 retired by R56 (2026-07-25 github-delivery)
- T2: R39 retired (2026-07-25 github-delivery: CID-subdomain concern gone)
- T3: R40 retired by R57 (2026-07-25 github-delivery)
- T4: R41 retired by R60 (2026-07-25 github-delivery)
- T5: R42 retired (2026-07-25 github-delivery: no publish command)
- [ ] O3: The GitHub console's DOM/wiring (OnboardingView, GithubApp, github.html) is verified by a browser load -- it renders the readiness gate, wires all six components, and throws no JS errors -- but the full end-to-end flow (real daemon, a real local-network permission grant, actually joining a room) is PNA-gated, and automated browsers relax that gate, so it needs a manual run in a real Chrome/Firefox. Detection logic is covered by test-Readiness.
- [ ] O4: ConfigHelp derives the local web UI gateway port from location.port (R32), which is empty for a public origin like github.io, so the console's by-hand allowlist snippet omits the local web UI origin when accessed there -- the user's existing entry is untouched and the bookmarklet path merges rather than replaces, so only the manual-paste fallback is affected. The R40 refs in config-help now serve R32; R40's gateway-port rationale is retired.
- [ ] O5: R79 and R80 are written on the premise that once the console tab opens the app has no channel to the player, which is what justifies the withheld acknowledgement and the standing instruction left on the app page. A popup instruction surface (popup-probe.html, mechanisms V1/V2/V3) would falsify that premise: a window we control survives the navigation and can keep instructing, close the console tab when done, and receive phase 2's progress via postMessage. Repairing this gap rewrites R79 (the delay's justification, likely its duration) and R80 (which surface carries the standing instruction). Blocked on the manual probe -- real Chrome and Firefox only, automated browsers relax window rules.