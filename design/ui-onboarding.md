# UI: Onboarding gate and host lobby

Covers R64, R71, R72, R73, R75. References crc-OnboardingView.md, crc-GithubApp.md.

The console page (`github.html`) reuses the chat state's DOM from ui-chat.md; it
adds a readiness gate and a host lobby ahead of it. One region is shown at a
time. The gate shows one step at a time, in order, with the current step marked.

## Readiness gate — a step

```
+--------------------------------------------------------------+
|  session over IPFS               [ ] getting your node ready |
+--------------------------------------------------------------+
|  Step 2 of 4 — Enable pubsub                                 |
|                                                              |
|  In IPFS Desktop -> Settings, turn on "Enable pubsub".       |
|     [ screenshot ]                                           |
|                                                              |
|                                   [ I've done this ]         |
|                                                              |
|  > Not working? Full steps / configure by hand               |
+--------------------------------------------------------------+
```

## CORS step (R72, R77)

```
+--------------------------------------------------------------+
|  Step 3 of 4 - Let this page talk to your node               |
|                                                              |
|  One-time fix. Drag this to your bookmarks bar, then click   |
|  it. It does the rest.                                       |
|                                                              |
|      [ >> Fix IPFS CORS ]                                    |
|      no bookmarks bar? Ctrl+Shift+B                          |
|                                                              |
|  > Not working? Configure it by hand                         |
|                                                              |
|                                   [ Done - check again ]     |
+--------------------------------------------------------------+
```

The bookmarklet is the **only** control here that leads anywhere (R77). There is
no button that opens the daemon's console: one would let a player press it
without having dragged the bookmark and arrive on a page with nothing to click.
Clicking the link rather than dragging it is intercepted and answered in the page
(R78), never in a dialog. The honest full checklist and the origin-keyed by-hand
snippets sit behind the disclosure (R50–R52) — this gate is the old failure
screen promoted to a proactive, ordered flow.

## Crank-handle panel (R78–R81)

Drawn by the bookmarklet into whatever page it was clicked on, so it is not part
of `github.html`. On the app page it runs as three states; each transition is one
human gesture, because one gesture buys exactly one window (R83).

```
1. clicked on the app page
+--------------------------------------------------------------+
|  This bookmark does its work on your node's own console page.|
|                              [ open my IPFS console ]        |
+--------------------------------------------------------------+
              |  pressed
              v
2. the warning, before anything opens
+--------------------------------------------------------------+
|  When the console opens, click "Fix IPFS CORS" AGAIN - on    |
|  that page. Nothing here can reach you once it is open.      |
|                              [ OK ]   <- fades in after 10s  |
+--------------------------------------------------------------+
              |  acknowledged -> console tab opens
              v
3. left standing on the app page
+--------------------------------------------------------------+
|  Waiting. Click "Fix IPFS CORS" on the IPFS console tab.     |
+--------------------------------------------------------------+
```

State 2 is the whole reason for the delay. The acknowledgement is withheld
because the sentence above it is the last thing the app can say (R79) — measured,
not assumed: a separate window would be buried by the tab it opens and cannot
raise itself. State 3 is what a player finds if they back out to the tab they
came from (R80). A tab the browser refuses is detected between 2 and 3, and the
panel offers the console's address to open by hand (R81).

On the daemon's console page the panel is the existing fixed top bar, which
leaves the console visible beneath it — the page the player was just told to look
at. It narrates the write, asks for the restart, and hands back to the app
without claiming the procedure succeeded (R82).

## Permission step (R73)

```
+--------------------------------------------------------------+
|  Step 4 of 4 — Let this page reach your node                 |
|                                                              |
|  Your browser will now ask to reach devices on your local    |
|  network. That is YOUR IPFS node — not a notifications       |
|  request. Click Allow.                                       |
|                                                              |
|                            [ Connect to my IPFS node ]       |
|                                                              |
|  (blocked it before? -> we'll show you where to re-enable it)|
+--------------------------------------------------------------+
```

The loud control is the deliberate post-load gesture that summons the prompt
(R66); its copy previews the browser's own wording so the prompt is expected,
not mistaken for notifications. On a denied permission the recovery pointer to
the site-settings toggle replaces the button (R74).

## Host lobby (R60, R64)

```
+--------------------------------------------------------------+
|  room 7f3a...  (share this page's URL to invite)   [ leave ] |
+--------------------------------------------------------------+
|  waiting for others to join...                               |
|  0 other nodes subscribed                                    |
+--------------------------------------------------------------+
```

A host who is ready lands here: the room is minted, the address bar already
carries `?room=`, and the invite is simply the URL on screen. As peers arrive
the presence count rises; the conversation view (ui-chat.md) is the same DOM,
revealed once the session is under way.

## Structure

All regions live in `github.html` and are toggled by the hidden attribute; the
chat region is the ui-chat.md markup verbatim so ChatView is reused unchanged.
Every generated value reaches the DOM through `textContent` — see cross-cutting:
untrusted input.

Because ChatView is reused whole, the page also carries a hidden `#fail` section
holding every id ChatView wires on construction — the old app's failure screen,
which this page never shows because the gate replaces it (R86). Those stubs are
not decoration: `#show()` toggles `#fail` on the first transition to ready, so
omitting it survives a page load and a rendered gate, then throws at the exact
moment a player finally gets connected. A component reused wholesale is owed its
whole DOM, including the parts this page has no use for.
