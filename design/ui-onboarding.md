# UI: Onboarding gate and host lobby

Covers R64, R71, R72, R73, R75, R77–R81, R85, R86, R87. References
crc-OnboardingView.md, crc-GithubApp.md.

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
|  One-time fix - drag this up to your bookmarks bar:          |
|                                                              |
|  [ >> Fix IPFS CORS ]  <---- After you drag this, click the  |
|                              bookmark                        |
|  no bookmarks bar? Ctrl+Shift+B                              |
|                                                              |
|  > Not working? Configure it by hand                         |
|                                                              |
|                                   [ Done - check again ]     |
+--------------------------------------------------------------+
```

Instructions are anchored to what they refer to rather than gathered above it
(R87). The drag instruction leads the bookmarklet because dragging comes first;
the instruction to click it afterwards sits to its right, arrow pointing back at
the thing just dragged. Read left to right, that is the order the hands move in —
the same reason the panel's instruction lives inside its button rather than above
it (R79).

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
|  Your IPFS console is about to open in a new tab.            |
|                                                              |
|  5s  [ I'm ready - I'll click the bookmark I just dragged,   |
|        on the page that opens ]                              |
|                                                              |
|  Nothing here can reach you once it opens, so this is the    |
|  last thing I can tell you.                                  |
+--------------------------------------------------------------+
              |  acknowledged -> console tab opens
              v
3. left standing on the app page
+--------------------------------------------------------------+
|  Waiting. Click the bookmark you dragged, on the IPFS        |
|  console tab.                                                |
+--------------------------------------------------------------+
```

State 2 is the whole reason for the delay, and the instruction sits **in** the
button rather than above it (R79). Prose beside a control is skipped by a player
aiming at the control, so the label is the only string guaranteed to be read —
and it is phrased in the first person, as a commitment rather than a dismissal.
The button is disabled against a visible countdown, because a control that is
merely slow reads as broken while one that is visibly counting reads as meant.
The count leads the button rather than trailing it, so that scanning left to
right a player meets the reason before the dead control, not after it.
That this is the app's last word is measured, not assumed: a separate window
would be buried by the tab it opens and cannot raise itself.

The bookmark is named by **provenance** — "the bookmark I just dragged" — and
never by its label. "Fix IPFS CORS" names two things that look identical: the
link still sitting on the app page and the bookmark now in the bar. Only one of
them was just dragged, and only that one works; clicking the other gets the hint
and no progress, which reads as the flow being broken rather than as a
misaimed click. The label carries the location too, since by R79's own logic it
is the only string guaranteed to be read and cannot lean on the line above it.

State 3 is what a player finds if they back out to the tab they came from (R80),
and the app clears it once connected (R85). A tab the browser refuses is detected
between 2 and 3, and the panel offers the console's address to open by hand (R81).

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

## Naming the room (R88, R89, R90)

The join form is ui-chat.md's markup reused (R63); the console adds a rename
control and a note beside the room field, both hidden for a guest, whose room
came from the URL and is not theirs to rename.

```
+--------------------------------------------------------------+
|   nickname  [ bill                                 ]         |
|   room      [ quiet-harbor-3f9c8a2b...  ] [ change room ]    |
|                                                              |
|                                   [   enter room   ]         |
+--------------------------------------------------------------+
              |  change room pressed
              v
+--------------------------------------------------------------+
|   room      [ quiet-harbor|             ] [ change room ]    |
|                                                              |
|   Type a name and click away - a fresh random ID is added,   |
|   so the link stays private.                                 |
+--------------------------------------------------------------+
```

The room is already minted by the time this form appears, so the address bar is
a working invite before anything is typed (R90) and the field arrives holding a
generated adjective-noun name (R89). Pressing *change room* narrows the field to
the **label alone** — the random half is not the host's to edit — selects it, and
reveals the note.

The commit is on **blur**, and that timing is the whole design. Copying the URL
means leaving the field, so the act of reaching for the invite is itself what
commits the name; a host cannot end up handing out a link that disagrees with
what they just typed. Enter blurs rather than committing directly, so both routes
run the same path. Committing mints a fresh random half and rewrites the address
bar (R92), which is why the note promises a new ID rather than a new label.

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
