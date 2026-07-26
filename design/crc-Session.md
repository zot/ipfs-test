# Session
**Requirements:** R59, R60, R61, R62, R88, R90, R92

Turns the page's URL into the session's identity: decides whether this visitor
is a host or a guest, mints a room when a host starts one, and keeps the address
bar and the shared link the same thing.

The room name is the capability — the pubsub topic is public, so the name is the
only thing between a session and a stranger. Names are therefore random with
~128 bits of entropy, drawn from the platform crypto source, never a counter or
a timestamp. A guest's room lives in `?room=` for the whole visit, so it is
retained across the onboarding detour for free — the URL is not navigated away
from, it is only read.

## Knows
- room: the current room name, or none (a host who has not started yet)
- label: the human half of that name, kept so a rename can edit it alone —
  the random half is never the host's to edit (R88)
- role: host (no `?room=`) or guest (arrived with one)

## Does
- read: parse `location.search` — `?room=<name>` marks a guest bound for that
  room, its absence marks a host (R61); a guest's room is still readable after
  onboarding because the URL never changed (R62)
- mint: generate a random ~128-bit room name from the crypto source (R59)
- start: mint a room as `<label>-<random>` and rewrite the address bar to
  `?room=<name>` through the history API, so the URL on screen is itself the
  invite (R60). The label is slugified on the way in, and an unusable one yields
  a bare random name rather than a malformed one (R88, R91)
- start, called again: this *is* the rename. It mints a **fresh** random half
  rather than re-labelling the old one — the label is part of the pubsub topic,
  so a rename moves the session either way, and keeping the old half would leave
  whoever held the previous link holding all of the capability but one word from
  a published list (R92)
- inviteUrl: the current page URL including the room — what a host shares

## Collaborators
- RoomLabel: slugifies a host's label into something safe for a URL and a topic
- otherwise none — reads `location`/`history` (injectable for tests) and hands
  plain strings to GithubApp

## Sequences
- seq-session.md
