# ConfigHelp
**Requirements:** R50, R51, R31, R32, R55, R72, R77, R78, R79, R80, R81, R82, R83, R84

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
  mid-procedure
- crankHandle: the procedure that gets stringified — the sequencing lives here
  rather than in the player's head. It runs in whatever page the bookmark was
  clicked on and speaks through a panel it draws into that page, never a modal
  dialog: a modal standing between the click and the tab that click is meant to
  open can outlast the click's authority to open one (R78). Away from the
  daemon's console it is the **only** way there (R77) — it offers to open the
  console, then holds the opening back behind a stated warning that the bookmark
  must be clicked again on the page about to appear, with the acknowledgement
  withheld long enough to be read (R79). That delay buys the last thing that can
  be said: once the console tab exists, the console is the daemon's own page and
  the app's page is behind it, so nothing on this side can reach the player. For
  the same reason the panel stays on the app page carrying that instruction, for
  a player who backs out to where they came from (R80). The console opens as an
  ordinary tab — a pop-up window has no bookmarks bar, so the second click could
  not happen there — and a tab the browser blocks is detected and named rather
  than failing silently (R81). On the console page, where the config API is
  same-origin, it merges the origin into the allowlist (R55, R72), asks for the
  restart, and re-reads the config once the daemon answers again — a read that
  proves the *write* landed and nothing else, because Kubo's config API serves
  stored configuration while the CORS headers it governs are applied at start.
  So no branch treats a clean read-back as evidence of a restart, and the crank
  handle never announces the procedure succeeded; that belongs to the app's own
  cross-origin probe, the only check that exercises what is being fixed (R82).
  It does not close the console tab on its own evidence either: the reachability
  poll answers as soon as the HTTP API is listening, which precedes readiness by
  a good margin. Having saved and seen the daemon return, it reports to the page
  that opened the tab and waits to be told the probe got through, closing only
  then; with no opener, or no answer inside half a minute, it says so and leaves
  the tab alone (R84).
  Throughout, each gesture is spent on at most one window — one gesture buys
  exactly one, and no window may open anything on another's behalf (R83) — which
  is why the panel is drawn into the page rather than being a window of its own:
  a separate window cannot raise itself and would be buried by the tab it opened

## Collaborators
- none — App calls these with `location.origin` and hands the result to ChatView

## Sequences
- (none — pure helpers on the failure path of seq-join)
