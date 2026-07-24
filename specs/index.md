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

- [publishing.md](publishing.md) — How the app itself reaches a player:
  published to IPFS, opened from their own gateway, with a stable IPNS link.
  What a player must have installed, and what they must not need.

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
