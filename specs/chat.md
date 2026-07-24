# Chat

A browser page that lets a person join a named chat room and exchange live
messages with anyone else subscribed to that room, using IPFS pubsub as the
transport.

## Joining

The app opens showing a join form: a nickname and a room name. Both are
required. Joining a room subscribes to that room's pubsub topic and switches
the page to the conversation view.

The nickname is a display label chosen by the person. It is not an identity
and is not verified — two people may pick the same nickname. The cryptographic
identity of a message is the publishing node's peer ID, which the daemon
attaches and which the app displays alongside the nickname.

A person can leave a room and join a different one without reloading the page.
Leaving unsubscribes from the old topic.

The last-used nickname and room are remembered across page reloads, so
rejoining is one click.

## Sending

Typing a message and submitting it publishes it to the room's topic. The
input clears immediately on submit.

The app does not add the message to its own transcript when sending. It waits
for the message to come back through its own subscription. This means what is
displayed is exactly what the network carried — if publishing silently failed,
nothing appears, and the failure is visible rather than hidden behind an
optimistic local echo.

If publishing returns an error, the message is not lost: it is restored to the
input and an error is shown.

## Receiving

Messages arriving on the subscribed topic appear in a transcript, oldest at
top, newest at bottom, scrolled to the newest. Each shows the sender's
nickname, a shortened form of their peer ID, the message text, and a local
timestamp.

Messages published by this node are visually distinguished from messages
published by other nodes.

The same message may be delivered more than once by the gossip network. A
message already shown is not shown again.

Content that is not a message this app understands — malformed, or published
to the topic by some other program — is ignored without disturbing the
transcript. A broken publisher on the topic must not break the reader.

Message text is displayed as text, never as markup. A message containing HTML
shows that HTML as characters.

## Presence

The conversation view shows how many other nodes are currently subscribed to
the room, and this node's own peer ID.

Presence comes from the daemon's view of the topic, so it counts nodes, not
people: two browser tabs on the same daemon are one node. This is stated in
the UI so the count is not misread.

## Connection

The page shows whether it is connected to the local daemon, and whether the
room subscription is live.

If the daemon is unreachable when the page loads, the app says so plainly and
offers to retry, rather than failing silently or hanging. Because the most
common cause is not an offline daemon but this page's origin missing from the
daemon's CORS allowlist — which Kubo answers with a 403 indistinguishable from
being offline — the failure message carries the fix inline. It shows the exact
configuration to paste into the daemon's settings editor: this page's own
origin (which the page reads from itself, so it is correct for whatever gateway
and port this player used) to add to the allowlist, and the pubsub-enabled
block. The player can apply it in the daemon's JSON settings editor — IPFS
Desktop's Settings screen, or the WebUI, which keeps working because its own
origin is allowlisted even when this app's is not — then restart and retry. A
control copies the origin so it need not be retyped.

The fix is presented as a numbered sequence of single actions rather than as a
paragraph, and the by-hand alternative is folded away behind a disclosure so it
does not compete with the quick path. This is not tidiness for its own sake.
The procedure spans two browser tabs and a daemon restart, and a player who is
interrupted partway through cannot tell from prose which parts they already
did — an observed failure, not a supposed one. For the same reason, leaving the
page to carry out a step marks that step as the current one, so returning to
the tab shows where they stopped. The step count is stated honestly; claiming
fewer steps than the procedure has is what loses people.

While that screen is up, the app keeps probing the daemon by itself and carries
on the instant it answers. The fix is always applied somewhere else — a
settings editor in another tab, a restart from the tray — so the moment it
lands is precisely the moment nobody is looking at this page. A player who has
just fixed their configuration should come back to an app that already works,
not to a button they have to notice and press.

If a live subscription drops — the daemon restarted, the stream broke — the
app reports it and resubscribes automatically, backing off between attempts so
a daemon that is down does not get hammered. Messages sent by others while the
subscription was down are missed; pubsub is not a durable log and the app does
not pretend otherwise.

## Not in this prototype

Deliberately excluded, so their absence is a decision and not an oversight:

- Message history. Nothing is persisted; joining a room shows an empty
  transcript. A refresh loses the conversation.
- File or CID sharing.
- Any encryption beyond what libp2p already does between peers. Room names
  are public, and anyone subscribed to the topic reads everything.
- Verified identity. Nicknames are freely chosen and unauthenticated.

## Environment

Runs as a static page in a modern browser. Vanilla JavaScript, ES modules,
no build step, no package manager, no framework.

The page is delivered by IPFS itself and opened from the local gateway; see
publishing.md. It must be served over HTTP either way — a `file://` page
cannot talk to the daemon at all.

## A spike, and what it is for

This is a probe ahead of a peer-to-peer virtual tabletop, not a product. It
exists to answer questions that tabletop depends on: whether gossipsub
delivers reliably enough at human pace, how duplicates and presence actually
behave, and what a message envelope needs to carry.

Chat is the right first probe because it is the smallest thing that exercises
the whole path, and because a tabletop needs chat anyway. It is not the hard
part.

Three consequences shape this spike.

**The transport is provisional.** Everything above it — messages, duplicate
handling, presence, rendering — is written so that replacing Kubo's HTTP API
with a libp2p node running in the browser would not disturb it. Which
transport wins is not yet decided and this spike should not decide it.

**The lack of durable history is a finding, not a defect.** A tabletop session
must survive a refresh and admit a late-arriving player, and pubsub offers
neither: no ordering, no delivery guarantee, nothing retained. Working around
that here would hide the very thing worth learning. The shape of the real
answer is already visible — a tabletop has a natural authority in the game
master, so state can be held as addressed content and pubsub used only to
announce where that content moved, with players sending intents rather than
edits. Building it is a later spike.

**Assets, not messages, are where IPFS earns its place.** Maps, token art, and
handouts are large and immutable, which is precisely what content addressing
is good at: fetched once per player, deduplicated, cached, and served between
players rather than from any one machine. This is also why requiring each
player to run a real node is a reasonable price rather than a burden. That
pipeline is untested here, and testing it is the most valuable thing this
spike could be extended to do.
