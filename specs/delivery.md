# Delivery

How the app reaches a player, and how one player invites others into a session.

This supersedes the earlier IPNS-gateway delivery (see publishing.md, being
retired): the app is no longer served by IPFS at all. It is a static web page
hosted on GitHub Pages at a stable public HTTPS origin. Each player still needs
IPFS/Kubo running on their machine, but only as the pubsub transport (see
chat.md and kubo-rpc.md) — never as the way the app itself is delivered.

## Why a stable public origin

The page is served from its own public HTTPS origin (currently
`https://zot.github.io`), and that origin never changes as the app is edited.
That stability is the whole point. Two separate authorizations are keyed to the
page's origin — the daemon's CORS allowlist and the browser's local-network
permission (both in onboarding.md) — and under IPFS delivery the origin churned
on every content edit (a new CID, a new gateway subdomain), forcing the player
to re-authorize each build. A stable origin is authorized once and stays
authorized. This is how webui.ipfs.io already works: a public HTTPS page
driving the local daemon over its RPC.

The app holds no knowledge of how it was delivered: it reads its own
`location.origin` and works from wherever it is served, so the same code runs
unchanged from GitHub Pages or from a local dev server.

Because the page is public and static, there is nothing to install to get the
app itself — the only software a player installs is IPFS, which they must trust
anyway. Getting that daemon ready is onboarding.md's job, and it does ask them to
install one more thing: a bookmarklet. Worth being exact rather than letting the
claim above quietly cover it. That is the same capability an extension has —
arbitrary code, run against their own machine — and the honest difference is that
it acts only when clicked, on the page in front of them, out of a source small
enough to read in the link before they drag it.

## The session is its URL

A session is a room, and the room name is the capability. The pubsub topic is
public, so anyone who knows the room name can join and no one who doesn't can.
Room names are therefore random, with enough entropy (~128 bits) that they
cannot be guessed or wandered into.

The link a host shares is simply the page they are already on. When a host
starts a session, the page mints a random room and rewrites its own address bar
to include it (`?room=<random>`), so the URL showing in the browser already
*is* the invite. "Here's the page we're on" is the whole of it — there is no
separate invite to construct, copy, or format. Every instruction a recipient
might need lives in the page rather than in the shared message, because only the
page can adapt to what the recipient's machine turns out to need.

## Arriving

Opening the page with no room marks you as a host: once your daemon is confirmed
ready, you start a session, which mints the room and rewrites your URL as above,
and you wait in the room for others.

Opening the page with a room (`?room=<random>`) marks you as a guest: once your
daemon is confirmed ready, you land directly in that room. If it is not ready,
the page walks you through readying it (onboarding.md) and then places you in
the room — the room name is retained across the whole detour, so a guest who
had to stop and install still ends up exactly where the inviter intended.

The one URL serves first-time and returning visitors alike. For anyone already
set up it drops them straight into the room; for a newcomer it is still the only
thing they are handed, and the page does the rest.

## Coexistence (A/B)

This GitHub-hosted console is added alongside the existing locally-served app,
not in place of it, so the two can be compared. Both drive the same local daemon
and speak the same rooms, and a player on either can converse with a player on
the other. The chat behavior itself is unchanged and shared between them — see
chat.md.

## Not in this delivery

Deliberately excluded, so their absence is a decision rather than an oversight:

- The app is not delivered by IPFS. IPFS carries messages, and later assets,
  but never the client. (This is what supersedes publishing.md.)
- The room name is the only access control. Rooms are public to anyone holding
  the name; there is no membership, authentication, or private topic.
- Nothing about a session is persisted anywhere central; there is no server. The
  URL is the only durable artifact, and it lives wherever the host pasted it.
