# GithubApp
**Requirements:** R56, R57, R58, R63, R64

The console's entry point, and the counterpart of App for the GitHub-hosted
page. It wires user intent and component events together and holds no domain
logic of its own — Session decides identity, Onboarding reaches ready, Room and
ChatView run the conversation.

It is served as a static page from a stable public HTTPS origin and does no IPFS
networking itself; it reads its own `location.origin` and would run unchanged
from a dev server (R56, R57, R58). It runs alongside the original App/`index.html`
for A/B, driving the same daemon and speaking the same rooms, reusing ChatView,
Room, KuboClient, Envelope, Multibase and Measurement untouched (R63).

## Knows
- client: the configured KuboClient
- session: the Session, for role and room
- room: the active Room, once joined

## Does
- start: read the session role/room; if the daemon is not ready, hand off to
  Onboarding, else go straight on (R64)
- onReady: a host reaches the lobby and can start a session (Session mints the
  room, rewrites the URL); a guest joins the room named in the URL
- wire: forward Room events to ChatView and ChatView intent to Room, exactly as
  App does (reuse, R63)

## Collaborators
- Session: role/room from the URL, and the invite URL
- Onboarding: invoked when not ready; reports back when ready
- Readiness: constructed here and passed to Onboarding
- Room, ChatView: the conversation, reused unchanged
- KuboClient: constructed here and passed down

## Sequences
- seq-session.md
- seq-onboarding.md
