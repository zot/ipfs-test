# Manifest: Publishing the app
**Requirements:** R38, R41, R42, R43

The app is delivered by IPFS, not by a web server, so "deploying" means adding
a directory to IPFS and republishing an IPNS name. `publish.sh` is that step;
it is ordinary shell and no part of the running app.

## What it does

- Stages only the files a browser needs — `index.html`, `src/`, and `SETUP.md`
  for the reader — deliberately excluding specs, design, and tests, which are
  not part of what a player downloads.
- Adds the staged directory with `ipfs add -r --cid-version 1` and reports the
  resulting CID.
- Reads the gateway port from `Addresses.Gateway` rather than assuming it, so
  the printed URL is correct if the daemon serves on 8080. (R40).
- Republishes an IPNS name to the new CID under the node's `self` key by
  default (overridable), so the printed share link matches the one in
  `SETUP.md` and survives edits (R41, R42). Two URLs are printed: the
  `<key>.ipns.localhost` **share** link (R38) and the immutable
  `/ipfs/<cid>/` **pin** link for naming an exact build (R39).

## What it does not do

It does not restart the daemon and it does not touch the CORS allowlist —
those are one-time human steps in `SETUP.md`, not per-publish actions.

## Finding the binary

IPFS Desktop bundles `ipfs` inside an AppImage whose mountpoint is regenerated
on every restart (`/tmp/.mount_ipfs_*`), so the script globs for it rather than
hard-coding a path, and honours an `IPFS=` override. A system `ipfs` on `PATH`
is preferred when present.

## Development alternative

`publish.sh` is for producing a shareable build. The fast inner loop does not
use it: `python3 -m http.server 3000` serves the working tree directly at the
allowlisted `http://localhost:3000`, so an edit is visible on reload without a
re-add (R43).
