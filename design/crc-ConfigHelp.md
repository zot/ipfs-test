# ConfigHelp
**Requirements:** R50, R51, R31, R32, R55

Pure functions that turn this page's own origin into the exact daemon
configuration a player must add to fix a CORS failure. No I/O, no DOM.

The idea it embodies: the page is served *from* the gateway, so its own
`location.origin` is precisely the origin the daemon has to allowlist —
correct for whatever gateway and port this particular player used. So the
failure path can hand the player the exact fix rather than a generic
instruction they must adapt. A friend on a default Kubo install (gateway 8080)
gets the `:8080` origin without anyone editing anything.

Kept in its own module rather than inside App so it imports and tests without a
browser — App runs its startup on import.

## Knows
- local webui origins: where the gateway serves the web UI, derived rather than
  fixed — the origin carries the gateway's port, and this page's own port is
  the authoritative one for this player (R40)
- the remote webui origin: `https://webui.ipfs.io`, held apart from the local
  ones because it is a public site with access to a local daemon (R55)

## Does
- allowOriginArray: origin → the array for the **by-hand paste**, which replaces
  the allowlist sight unseen and so must carry the defaults it would otherwise
  remove (R32)
- crankOrigins: origin → what the **crank handle adds**. It reads the existing
  list and merges, so it removes nothing and names only what is required —
  loopback origins only, never handing a public site access to a local daemon
  that had granted it to nobody (R55)
- httpHeadersSnippet: origin → the whole `API.HTTPHeaders` block rendered as
  pasteable config fields — the allowlist *and* the allowed methods together,
  because a player whose `HTTPHeaders` is empty needs both, and being handed
  only the origin produces a failure identical to the one being fixed
- pubsubSnippet: the constant `Pubsub` enabled block
- bookmarkletHref: stringifies the crank handle into a `javascript:` URL with
  this player's origins and API base baked in as its argument. Inlined rather
  than fetched at click time, so a slow IPNS resolution cannot strand a player
  mid-procedure (gap A3 — its behaviour is not yet anchored)

## Collaborators
- none — App calls these with `location.origin` and hands the result to ChatView

## Sequences
- (none — pure helpers on the failure path of seq-join)
