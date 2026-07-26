# Spec Index

Root index for the browser pubsub chat prototype. Every per-feature spec is
listed here under a system. Read this first to orient.

## System: Chat

- [chat.md](chat.md) — Rooms, nicknames, sending and receiving messages,
  presence. The user-facing behavior of the app.

## System: Kubo Delegation

- [kubo-rpc.md](kubo-rpc.md) — How the browser talks to the local Kubo
  daemon: endpoints used, wire encoding, and the environment the app runs in.
  All IPFS/libp2p networking is Kubo's job; the browser does none of it.

## System: Delivery

- [delivery.md](delivery.md) — How the app reaches a player and how a session
  is shared: a static GitHub Pages origin driving the local daemon, with the
  random-room URL that is itself the invite. The current delivery model.
- [publishing.md](publishing.md) — **Reduced** to what survives the pivot: what a
  player must have (R36), the daemon's own NAT traversal (R37), and dev-serving
  (R43). Its old IPFS-gateway delivery (R38–R42) is retired; delivery.md owns
  delivery now.

## System: Onboarding

- [onboarding.md](onboarding.md) — Getting a player's machine ready to be driven
  by the app: the four readiness conditions, the browser-branched detection
  scheme (CORS fetch + no-cors probe, refined by the permission query on Chrome),
  the two grants (CORS bookmarklet, browser local-network permission), and the
  guided, checkpointed sequence. Absorbs the former config-help behaviour.

## Summary specs

None yet. If the set of RPC endpoints grows past a handful, an API-surface
summary spec over `kubo-rpc.md` becomes worth keeping.

## Cross-cutting themes

- **Kubo is the only network.** The browser never speaks libp2p, never opens
  a socket to a peer, never runs a DHT. Every network effect is produced by
  asking the local daemon over HTTP. Touches: chat.md, kubo-rpc.md.
- **The daemon is the source of truth for messages.** The app does not
  locally echo what it sends; it renders only what the subscription delivers
  back. Touches: chat.md, kubo-rpc.md.
- **The page's origin is the authorization key.** Both the daemon's CORS
  allowlist and the browser's local-network permission are keyed to the page's
  origin — which is why delivery fixes that origin and onboarding authorizes it
  once. Touches: delivery.md, onboarding.md.
- **The daemon is the source of truth for readiness.** localStorage records
  what the player has configured before, but only the daemon's actual response
  decides whether the app can run; a failed probe re-diagnoses from the daemon
  rather than trusting the stored expectation. Touches: onboarding.md.
