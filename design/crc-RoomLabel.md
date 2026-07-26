# RoomLabel
**Requirements:** R88, R89, R91

Pure functions for the human half of a room name. No I/O, no DOM, no state.

A room is `<label>-<random>`. The random half is the capability; this component
owns the other half, which exists only so a person can tell one room from
another. Several bare hex names sitting in a chat history are indistinguishable,
and that — not secrecy — is the entire problem being solved here. Nothing this
component produces is ever trusted, and no security rests on it (R88).

Kept apart from Session so the word lists do not bloat the module that reasons
about URLs, and so both halves test without a browser.

## Knows
- adjectives and nouns: two short curated lists. Entropy is not their job, so
  their only requirements are that the words are pronounceable aloud, hard to
  misspell, and inoffensive — these end up in URLs people paste to friends
- adjective-noun rather than noun-noun: "quiet-harbor" reads as a name, while
  "harbor-otter" reads as a typo

## Does
- suggestLabel: an adjective-noun pair, drawn from the same crypto source as the
  room itself (R89) — not because this needs to be unguessable, but because two
  random sources in one flow invites someone to use the wrong one for the half
  that matters
- slugify: reduce anything a host types to a name safe for a URL and a pubsub
  topic — lowercased, diacritics folded rather than replaced (so `café` yields
  `cafe`, not `caf-`), runs of anything else collapsed to single hyphens,
  trimmed, length-capped, and trimmed again because the cap can itself leave a
  hyphen dangling. An unusable label yields the empty string, which Session
  reads as "no label" and mints a bare random name (R91)

## Collaborators
- none — Session calls slugify, GithubApp calls suggestLabel

## Sequences
- seq-session.md
