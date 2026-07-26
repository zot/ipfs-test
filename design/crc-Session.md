# Session
**Requirements:** R59, R60, R61, R62

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
- role: host (no `?room=`) or guest (arrived with one)

## Does
- read: parse `location.search` — `?room=<name>` marks a guest bound for that
  room, its absence marks a host (R61); a guest's room is still readable after
  onboarding because the URL never changed (R62)
- mint: generate a random ~128-bit room name from the crypto source (R59)
- start: mint a room and rewrite the address bar to `?room=<name>` through the
  history API, so the URL on screen is itself the invite (R60)
- inviteUrl: the current page URL including the room — what a host shares

## Collaborators
- none — reads `location`/`history` (injectable for tests) and hands plain
  strings to GithubApp

## Sequences
- seq-session.md
