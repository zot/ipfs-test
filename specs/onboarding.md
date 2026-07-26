# Onboarding

Getting a player's machine ready to be driven by the app, and guiding them
through whatever is missing.

The app is a public web page that reaches the player's *local* IPFS daemon (see
delivery.md, kubo-rpc.md). Before it can join a room, several things on the
player's own machine and browser must be true, and none of them are true by
default the first time. Onboarding is the front door that detects what is
missing and walks the player through each fix. It is shown to host and guest
alike; a guest who arrives via an invite (`?room=`) is carried through
onboarding and then dropped into the intended room, the room name retained
across the whole detour.

## What "ready" means

Four conditions must all hold before the page can drive the daemon:

1. **IPFS is installed and running.** The player runs a real Kubo node (IPFS
   Desktop is the assumed distribution — it bundles the node with a tray UI).
2. **Pubsub is enabled** in the daemon configuration; without it the pubsub
   endpoints error and no room works.
3. **The page's origin is in the daemon's CORS allowlist.** Kubo answers an
   unrecognised origin with a 403, so the page's own origin (delivery.md) must
   be allowlisted or every call is refused.
4. **The browser's local-network permission is granted** for the page's origin.
   A public HTTPS page reaching `127.0.0.1` is gated by the browser (Chrome
   calls it "Apps on device"); without the grant the request never leaves.

Onboarding's job is to determine which of the four is missing and guide only
that, and to notice when a previously-ready machine stops being ready.

## Detecting readiness

The ground truth is the daemon itself: the app attempts to reach it and reads
what happens. Two properties of that attempt were established by testing real
browsers, and both shape the design rather than being assumed:

- **The attempt is a deliberate action taken after the page has loaded** — the
  player presses a "connect" control — never an automatic fetch on page load.
  An automatic attempt was unreliable, and worse, it summons the browser's
  permission prompt with no context, which players dismiss as a notifications
  request.
- **A plain fetch failure is opaque.** The browser returns the same error
  (Chrome "Failed to fetch", Firefox "NetworkError") whether the daemon is
  down, the origin is not allowlisted, or the permission is denied. The error
  text tells onboarding nothing; attribution needs more than the fetch.

The attribution scheme therefore pairs the ordinary (CORS) fetch with a second,
`no-cors` probe. The no-cors probe reaches a *live* daemon even without a CORS
grant, but only when the browser permission already allows the request out.
That gives every browser a three-way split:

- CORS fetch **succeeds** → **ready**.
- CORS fetch fails, no-cors probe **reaches** → the daemon is up and the
  permission is granted, but the origin is not allowlisted → a **CORS** problem.
- CORS fetch fails, no-cors probe **throws** → the permission is blocked or the
  daemon is down → **needs attention**.

The two browsers differ on that last bucket, and the difference is load-bearing:

- **Chrome can separate it.** It exposes the permission state directly — a query
  reports granted, prompt, or denied and tracks changes live. Not granted → the
  fix is the permission; granted → the daemon is down. Chrome's attribution is
  therefore complete: ready, CORS, permission, or daemon-down, unambiguously.
- **Firefox cannot.** Its equivalent query is nominal — it always reports the
  same "prompt" regardless of the real state — so permission-denied and
  daemon-down collapse into one indistinguishable bucket. Onboarding handles
  this two ways: Firefox raises *its own* permission prompt on first contact
  with a *live* daemon, so an appearing prompt already tells the player the
  daemon is up and the fix is the grant; and where that does not resolve it, the
  page guides both fixes at once — "is IPFS running, and has the browser been
  allowed local network access?" — biased by what the player has done before.

That "what the player has done before" is a third signal: **localStorage records
the player's progress**, so a returning visitor is tried straight through and
only a failed probe triggers re-diagnosis. It is expectation and fast-path,
never truth — the daemon is always the arbiter.

## The two grants

Readiness needs two separate authorizations, on two different sides, and
onboarding must never let them blur together, because a player who has done one
will not understand why they are still blocked by the other.

### The daemon-side CORS grant (the bookmarklet)

Allowlisting the page's origin is a change to the daemon's own configuration,
and it cannot be made from the app's page: a call from the public origin to the
daemon hits exactly the allowlist wall being fixed (a chicken-and-egg). It works
only from the daemon's *own* console page (its web UI), whose origin ships
pre-allowlisted, so a call from there can write the new entry.

The player is therefore handed a **bookmarklet** — dragged from the app page to
their bookmarks bar, then clicked. The instruction on the app page is exactly
that and nothing more: drag it, click it. The bookmarklet reads the current
allowlist and **merges** the page's origin in, adding only what is required and
removing nothing — in particular it does not grant any remote website access to
the local daemon. No hand-editing of JSON is required.

Because a bookmarklet runs on whatever page is open, and the daemon's console is
the only page it can do its work from, the bookmarklet has to get the player
there itself. **It is the only route to that console** — the app page offers no
other control that opens it. That is deliberate: a separate "open my console"
button gives a player two ways forward, and the one who presses the button
without having dragged the bookmark arrives on a page with nothing to click and
no idea what was expected. One route means the step cannot be walked past
without the tool that completes it.

So the first click, wherever it lands, opens the bookmarklet's own panel drawn
into the current page — never a modal dialog, which would stand blocking between
the player's click and the tab about to be opened, long enough for the browser
to withdraw the click's authority to open it. The panel offers to open the
console. Pressing that does *not* open it yet: the panel first states that the
bookmarklet must be clicked **again**, on the page that is about to appear, and
holds its acknowledgement control back for long enough that the sentence is read
rather than clicked past. Only on acknowledgement does the console open.

The delay is bought with a real cost, and it buys the last thing that can be
said. Once the console tab is open the app cannot reach the player at all: the
console is the daemon's own page and carries none of the app's UI, and the app's
page is behind it. The instruction has to land before the channel closes. For
the same reason the panel stays behind on the app page showing that standing
instruction, so a player who backs out to where they came from finds it waiting.

The console opens as an ordinary browser tab, never a small pop-up window — a
pop-up has no bookmarks bar, so the second click would be impossible in exactly
the place it is needed. Should the browser block the tab anyway, that is
detectable, and the panel says so and offers the console's address to open by
hand rather than failing silently.

The panel is drawn into the app's own page and is not a separate window. That was
measured rather than assumed, because a separate window is the obvious answer to
the problem this section spends so long on — an instruction surface that survives
the move to the console tab — and it does not work. A window a page opens cannot
raise itself: `window.focus()` on your own pop-up is declined the same way
focusing a stranger's window is. So the surface a separate window would provide
is buried by the very tab it opens, at exactly the moment it would have been
useful, and a player working with maximised windows never sees it again. What it
can still do — receive the console page's progress reports — is worth nothing,
because by then the bookmarklet has injected its own panel into the console page,
where the player is already looking. It costs a window and buys nothing the
in-page panel does not.

Two further limits were measured alongside it, and both shape what is possible
here. **One gesture buys one window**: whichever `window.open` runs first
succeeds and any second call in the same gesture returns null, in either order —
which is why the flow spends each click on exactly one thing. And **the pop-up
blocker judges by the target window, not the caller**, so a freshly-clicked
window cannot open anything on a stale one's behalf. There is no arrangement of
windows that escapes these; the sequence of single human actions is not a
stylistic choice but the only shape the platform permits.

Framing the console does not escape them either, and this is worth stating
plainly because the first half of it looks so promising. **The console does frame
— Kubo sets no `X-Frame-Options` on the API port**, so it renders inside an
iframe on the app's own page, apparently placing it right beside the
instructions. It buys nothing. A bookmarklet runs in the **top-level document
regardless of which frame has focus** (measured: clicking into the frame first
changes nothing), so it would execute in the app's origin and hit the very
allowlist wall it exists to remove. Nor can the parent reach in: a cross-origin
frame exposes no document and no scripts, `postMessage` finds no listener in the
webui, and `javascript:` navigation of a cross-origin frame is blocked outright.
Framing yields a picture of the console and no way to act on it.

What the bookmarklet can confirm, and what it cannot, matters here because the
difference is invisible. After writing, it reads the configuration back — but the
daemon's config API reads *stored* configuration, and the CORS headers that
configuration governs are applied when the daemon starts. So the read-back
returns the new values whether or not the daemon has restarted. It is proof the
write landed and nothing more, and a player who says they restarted when they did
not will pass it.

The bookmarklet therefore reports the write, asks for the restart, and stops
short of announcing that the procedure worked — an announcement it has no
standing to make. The only check that exercises the thing being fixed is a
cross-origin request from the app's own origin, and the app is already making one
every few seconds while the gate is up. Success is the app's to declare.

A by-hand fallback remains for when the bookmarklet cannot run: onboarding shows
the exact configuration to paste into the daemon's settings editor, keyed to the
page's own origin (so it is correct for this player) with a control to copy it,
plus the pubsub-enabled block. This full checklist and by-hand alternative sit
behind a disclosure so they do not compete with the bookmarklet path; the honest
step count is stated rather than undersold. Because the procedure spans two tabs
and a daemon restart, a step the player leaves the page to perform is marked as
the current one, so an interrupted player sees where they stopped on return; and
while the fix is being applied elsewhere the page keeps probing the daemon by
itself and proceeds the instant it answers.

### The browser-side local-network permission

The browser gate is granted by the browser's own prompt, and the prompt only
appears when the page attempts to reach a *live* daemon. So the permission step
comes after IPFS is installed and running, and it is driven by a deliberate,
loudly-labelled control: pressing it triggers the attempt that summons the
prompt, and the label warns the player *before* the prompt that the browser is
about to ask permission to reach *their own IPFS node* — not the
notifications request it resembles.

Recovery depends on the state, which Chrome can read and Firefox cannot. When
the permission is merely un-decided, pressing the control summons the prompt and
the player grants it. When it has been actively **denied**, the browser will not
ask again, so onboarding cannot rely on the prompt and instead walks the player
to the browser's site-settings toggle. On Chrome the page can watch the
permission for changes and advance the moment the player flips it, hands-free; on
Firefox, where the state is unreadable, the page falls back to re-probing.

## The guided sequence

On load the page consults localStorage for what the player has already done and
probes the daemon. If the probe succeeds, it goes straight to the room. If not,
it shows the install console and walks the player through, one action at a time,
checkpointing each completed step so an interruption resumes rather than
restarts:

1. Install IPFS (attested by the player, with a screenshot of the tray icon to
   confirm against).
2. Enable pubsub (attested, with screenshots; verified against the daemon once
   it becomes reachable).
3. Install the CORS grant via the bookmarklet on the daemon's console page.
4. Grant the browser's local-network permission via the loud control.
5. Connected — proceed to the requested room, or, if there is none, offer to
   start a new session (delivery.md).

The order is not arbitrary: the browser prompt cannot appear until the daemon is
live, so install-and-run must precede the permission step. Where a step's result
can be checked against the daemon rather than merely attested, it is checked, so
a mistaken "I did it" is caught early instead of dead-ending at the end.

## Staying ready

Readiness is not permanent. A player may quit IPFS, uninstall it, change its
ports, upgrade their browser, or copy their profile to a new machine — and any
of these silently breaks a session that worked yesterday. The app monitors the
daemon and, when a live connection is lost or a returning visitor's probe fails
despite localStorage saying all was configured, re-diagnoses from the daemon
using the scheme above rather than trusting the stored expectation. A browser
upgrade or copied profile characteristically loses the *browser* permission
while the daemon config survives; on Chrome the page can name that precisely,
and on Firefox it guides both.

## Browser scope

The detection scheme is grounded in tested behaviour on Chrome and Firefox. Other
browsers (Safari, in particular) are untested; treating them is out of scope for
this spike, and the honest position is that their gate behaviour is unknown
rather than assumed.

## If the whole approach fails

The console model depends on the browser permitting a public page to reach
localhost at all. Testing showed it does (as a one-time grant), so the console
is the chosen path. Should that ever harden into an outright block, the fallback
is a *launcher* that top-level-navigates to a locally-served copy of the app —
exempt from the permission entirely — at the cost of reintroducing local
delivery. That fallback is documented as the escape hatch, not built here.
