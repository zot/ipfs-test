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

The CORS step (R72) leads with the drag-and-click bookmarklet and opens the
daemon's own console; the honest full checklist and the origin-keyed by-hand
snippets sit behind the disclosure (R50–R52), exactly as the current failure
screen does — this gate is that screen promoted to a proactive, ordered flow.

## Permission step (R73)

```
+--------------------------------------------------------------+
|  Step 4 of 4 — Let this page reach your node                 |
|                                                              |
|  Your browser will now ask to reach devices on your local    |
|  network. That is YOUR IPFS node — not a notifications        |
|  request. Click Allow.                                        |
|                                                              |
|                            [ Connect to my IPFS node ]       |
|                                                              |
|  (blocked it before? -> we'll show you where to re-enable it) |
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
