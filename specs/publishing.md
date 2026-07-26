# Publishing — superseded by Delivery

IPFS no longer delivers the app. How the app now reaches a player — a static
GitHub Pages page driving the local daemon — is delivery.md. This spec is
reduced to the parts that outlive that change: what a player must have, why
their daemon needs nothing reachable from outside, and how the same files are
served during development.

## What a person needs

A Kubo daemon, and nothing else. No web server, no public IP, no VPS, no relay
of ours, no account.

This works because each person's daemon does its own network traversal. A daemon
behind NAT reaches the network through public relays and the DHT — it does not
need to be reachable from outside. Pubsub messages propagate between players
through the public IPFS network rather than through any node we operate.

The cost is honest and stated rather than hidden: every player must install
Kubo, enable pubsub, and add this app's origin to their daemon's API allowlist.
Onboarding now guides all of that — see onboarding.md.

## Development

During development the same files are served from a plain static server on
`http://localhost:3000`, which is also allowlisted. The app is identical either
way — it holds no knowledge of how it was delivered.

## Retired

The IPFS-delivery mechanism this spec used to describe — the IPNS-key subdomain
gateway URL, the deliberate avoidance of the CID subdomain, the gateway-port
allowlist entry, the IPNS name as the shared link, and the publish command — is
retired (R38–R42, see T1–T5) and replaced by delivery.md. None of it is current
intent.
