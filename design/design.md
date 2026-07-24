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
- [x] crc-ConfigHelp.md → `src/config-help.js`, `src/crank-handle.js`

### Sequences
- [x] seq-join.md → `src/app.js`, `src/room.js`
- [x] seq-message.md → `src/room.js`, `src/kubo.js`
- [x] seq-reconnect.md → `src/room.js`

### UI Layouts
- [x] ui-chat.md → `index.html`, `src/view.js`

### Manifests
- [x] manifest-daemon.md → `SETUP.md`
- [x] manifest-publish.md → `publish.sh`

### Test Designs
- [x] test-Multibase.md → `test/multibase.test.js`
- [x] test-Envelope.md → `test/envelope.test.js`
- [x] test-Room.md → `test/room.test.js`, `test/smoke-live.js`
- [x] test-KuboClient.md → `test/kubo.test.js`
- [x] test-ConfigHelp.md → `test/config-help.test.js`
- [x] test-Monitor.md → `test/monitor.test.js`

## Gaps

- A1: R31,R32 (CORS allowlist + preserving webui origins) are operational daemon-config requirements; design home is manifest-daemon.md and SETUP.md, not a runtime CRC class. Code coverage: SETUP.md.
- A2: R36-R42 (IPFS delivery, addressing, IPNS, publish command) are operational; design home is manifest-publish.md + publish.sh + SETUP.md, not a runtime CRC class. Code coverage: publish.sh, SETUP.md.
- [ ] O1: ChatView DOM rendering (textContent escaping R13, own/other alignment R10, gap markers) is verified by code inspection and the Envelope markup test, not by an automated DOM test — jsdom would add the project's first dependency, disproportionate for a spike. Envelope guarantees text is never interpreted; ChatView's textContent use is the remaining unautomated link.
- [ ] O2: Reconnect backoff loop (seq-reconnect) is covered for the leave-abort path but its growing-delay timing is not asserted (would need fake timers). The live failure mode — daemon restart — is better checked by the manual two-node run.
- A3: Crank-handle bookmarklet (src/crank-handle.js): the drag-to-install onboarding flow -- phase branch, injected control panel, config install, restart detection, verification -- is deliberately unanchored while it is unproven. Candidate for the real app's onboarding; anchor it in specs/requirements once it has worked for a player who is not the author.