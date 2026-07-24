# Publishing

The app is not merely an app that uses IPFS — it is delivered by IPFS. A
person opens it by following an IPFS link, and their own daemon fetches it.
Nobody runs a web server.

## What a person needs

A Kubo daemon, and nothing else. No web server, no public IP, no VPS, no
relay of ours, no account.

This works because each person's daemon does its own network traversal. A
daemon behind NAT reaches the network through public relays and the DHT — it
does not need to be reachable from outside. Pubsub messages propagate between
players through the public IPFS network rather than through any node we
operate.

The cost of that is honest and should be stated rather than hidden: every
player must install Kubo, have pubsub enabled, and add this app's origin to
their daemon's API allowlist. That last step is a documented one-line config
change and a restart. It is the price of letting the browser drive a real
node, and it is the same line for everyone.

## Addressing

The app is added to IPFS as a directory containing `index.html` and its
modules. It is opened and shared through the **IPNS-key subdomain** form of
the local gateway:

    http://<key>.ipns.localhost:<gateway-port>/

That it is a subdomain matters, and that the subdomain is the *key* rather
than a content CID matters more. The `localhost` gateway isolates origins per
subdomain: a `<cid>.ipfs.localhost` address gives an origin that embeds the
content CID, which changes on every edit and so falls out of the API allowlist
each time — fatal for a link meant to be stable. An IPNS name is a *stable
pointer*: the key does not change when the content it points at does. So
`http://<key>.ipns.localhost:<port>/` holds one constant origin across every
future build, and a single allowlist entry survives every edit.

The gateway port is not universal: a default Kubo install serves on 8080.
Because an origin includes its port, the allowlist lists the IPNS-key origin
at 8080, so one configuration line should fits a default install in simply
opens the URL at their own gateway's port.

## Pinning an exact version

The IPNS name always resolves to the current build. When a specific build must
be named instead — to pin it, or to record exactly what a test ran against —
the immutable `/ipfs/<cid>/` path form addresses that one version directly:

    http://127.0.0.1:<gateway-port>/ipfs/<cid>/

This form is secondary: good for naming a fixed version, useless for sharing,
because a new build is a new CID and therefore a new link.

## Publishing a version

One command adds the site directory to IPFS, reports the resulting CID and
both gateway URLs, and republishes the IPNS name to point at it. It is
ordinary shell, not part of the app.

## Development

Re-adding to IPFS on every edit is too slow a loop for building. During
development the same files are served from a plain static server on
`http://localhost:3000`, which is also allowlisted. The app is identical
either way — it holds no knowledge of how it was delivered.
