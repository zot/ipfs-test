# ChatView
**Requirements:** R1, R3, R9, R10, R13, R14, R15, R16, R17, R45, R46, R50, R51, R52, R53

The only component that touches the DOM. Knows nothing of Kubo, topics,
multibase, or subscriptions — it renders values handed to it and reports user
intent back through callbacks.

The page has two states, join and conversation, and the view switches between
them. Structure is static in `index.html`; this card only toggles visibility
and appends message rows, so the DOM stays as slim as the content requires.

Message text reaches the DOM through `textContent` exclusively. A message
containing markup is displayed as characters. This is not a nicety — the text
came off a public topic from an unauthenticated publisher.

A row shows the nickname, a shortened peer ID, the text, and a local
timestamp. The nickname is chosen freely and unverified, so the peer ID is
shown beside it as the identity that is actually attested; the layout gives
the peer ID enough prominence that two different peers using one nickname are
distinguishable.

Presence is labelled as a count of nodes rather than people, because two tabs
on one daemon are one node and an unlabelled number would be read wrong.

The failure screen is rendered as an ordered procedure, not a paragraph, and
one of its steps can be marked as current. The procedure spans two tabs and a
daemon restart, so the player's own attention is the scarce resource: an
instruction delivered as a modal is gone the moment the second tab takes focus,
whereas a marked step is still there when they come back.

## Knows
- elements: the join form, transcript, composer, presence and status regions
- selfPeerId: to render this node's own identity in the status region

## Does
- showJoin: reveals the join form, prefilled with remembered values
- showConversation: switches to the transcript and composer, clearing the transcript
- appendMessage: adds one row, styled by whether it is ours, and scrolls to newest
- setPresence: renders the subscriber count with its nodes-not-people label
- setStatus: renders daemon connectivity and subscription liveness
- showFailure: renders the startup failure — the diagnosis, plus the generated
  config snippets (origin, HTTPHeaders block, pubsub block) and a copy control,
  each set via textContent (R50, R51)
- markStep: marks one step of the fix procedure as the current one and clears
  the mark from the others, so a player who left this tab to carry a step out
  can see where they stopped when they come back (R53)
- onJoin/onSend/onLeave/onRetry: callbacks the app registers for user intent

## Collaborators
- none — receives plain values, returns intent through callbacks

## Sequences
- seq-join.md
- seq-message.md
- seq-reconnect.md
