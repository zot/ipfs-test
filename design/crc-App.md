# App
**Requirements:** R5, R17, R19, R43, R50, R51, R54

The entry point. Wires user intent from the view into the room, and room
events back into the view. Holds no domain logic of its own — if a rule needs
deciding, it belongs in Room, Envelope, or ChatView instead.

Startup order matters. Before any room can be joined, the daemon must answer
and yield this node's peer ID, which the room needs in order to recognize its
own messages coming back. So the app confirms reachability first, and on
failure shows a plain explanation with a retry rather than a stalled page or
a silent console error. The most likely cause of that failure is a CORS
rejection from an unconfigured daemon, so the message points at the setup
document instead of leaving the reader guessing.

Nickname and room are remembered between visits, in browser-local storage
only — nothing about a person leaves the machine except the messages they
choose to send.

The page is served as static files with no build step: ES modules loaded
directly by the browser, no bundler, no package manager, no framework.

## Knows
- prefs: last-used nickname and room, persisted locally
- client: the configured KuboClient
- room: the active Room, if any

## Does
- start: checks daemon reachability, gets the peer ID, renders the join form
- failure: on an unreachable daemon, builds the diagnosis plus the config to
  fix it, keyed to this page's own `location.origin` (R50, R51)
- handleJoin: persists preferences, leaves any current room, joins the new one
- handleSend: forwards to the room; on failure restores the text and reports
- handleLeave: leaves the room and returns to the join form
- handleRetry: re-runs startup after a connection failure
- watchForDaemon: while the failure screen is up, keeps probing the daemon and
  re-runs startup the moment it answers, because the fix is applied in another
  window and the moment it lands is not a moment anyone is watching this page
  (R54)

## Collaborators
- KuboClient: constructed here and passed down; probed at startup
- Room: created per join, subscribed to for message, presence and status events
- ChatView: registered with for user intent, driven with room events
- ConfigHelp: turns this page's origin into the pasteable fix shown on failure

## Sequences
- seq-join.md
- seq-message.md
- seq-reconnect.md
