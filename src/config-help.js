// CRC: crc-ConfigHelp.md | R50, R51
//
// Pure helpers that turn this page's own origin into the exact daemon
// configuration a player must add. Kept out of app.js so they import and test
// without a browser (app.js runs start() on import).
//
// The insight: the page is served FROM the gateway, so `location.origin` is
// precisely the origin the daemon must allowlist — correct for whatever
// gateway and port this player used. So the broken app can hand the player the
// exact fix rather than a generic instruction.

import { crankHandle } from './crank-handle.js'

// R40: the web UI is served by the same gateway as the app, so its origin
// always carries that gateway's port. This page was served by that gateway, so
// `location.port` is the authoritative answer and no port needs guessing — a
// fixed port here is exactly the bug that cost a friend their web UI, because
// the allowlist is replaced wholesale and naming the wrong port removes the
// right one.
//
// R32: these are loopback origins, and they are what actually breaks when an
// entry is dropped. IPFS Desktop's own window is Electron and needs no CORS at
// all; it is the web UI opened as an ordinary browser page that loses the
// daemon.
function localWebuiOrigins(origin) {
  let port = ''
  try {
    port = new URL(origin).port
  } catch {
    /* not a URL — nothing to derive from, so nothing is added */
  }
  return port ? [`http://webui.ipfs.io.ipns.localhost:${port}`] : []
}

// R55: a public website granted access to a local API. Carried only by the
// blind wholesale paste, which cannot know whether the player already had it
// and must not be the thing that takes it away.
const REMOTE_WEBUI = 'https://webui.ipfs.io'

// R32, R50: for the by-hand paste, which replaces the allowlist sight unseen.
// It has to carry the defaults, because omitting one removes it.
export function allowOriginArray(origin) {
  const arr = [REMOTE_WEBUI, ...localWebuiOrigins(origin)]
  if (origin && !arr.includes(origin)) arr.push(origin)
  return arr
}

// R55: what the crank handle ADDS. It reads the existing list and merges, so it
// never removes anything and need name only what is genuinely required — which
// pointedly excludes handing a remote site access to a local daemon that had
// granted it to nobody.
export function crankOrigins(origin) {
  const arr = localWebuiOrigins(origin)
  if (origin && !arr.includes(origin)) arr.push(origin)
  return arr
}

// R31: Kubo needs the methods allowed as well as the origin. A player whose
// API.HTTPHeaders is empty -- an observed state, not a hypothetical -- ends up
// one field short if only the origin is handed over, and the resulting failure
// is indistinguishable from the one they just tried to fix.
const ALLOW_METHODS = ['POST', 'OPTIONS']

// R50, R31: the whole HTTPHeaders block rendered as config-file fields, ready
// to paste into the settings-editor JSON. Both fields together, because both
// are required and a player starting from `{}` has neither.
export function httpHeadersSnippet(origin) {
  const field = (name, values) =>
    `"${name}": [\n${values.map((v) => `    ${JSON.stringify(v)}`).join(',\n')}\n]`
  return [
    field('Access-Control-Allow-Origin', allowOriginArray(origin)),
    field('Access-Control-Allow-Methods', ALLOW_METHODS),
  ].join(',\n')
}

// R51: pubsub must be enabled; this block is constant.
export function pubsubSnippet() {
  return [
    '"Pubsub": {',
    '  "Enabled": true,',
    '  "Router": "gossipsub"',
    '}',
  ].join('\n')
}

// SPIKE-SCRATCH — intentionally NOT anchored in specs/design/requirements yet.
//
// The bookmarklet is `crank-handle.js` stringified into a `javascript:` URL,
// with this player's own origins and API base baked in as its argument. The
// whole thing is inlined rather than fetched at click time. Fetching a
// continuation from the gateway does work — measured at 200 in 36ms warm — but
// a cold IPNS resolution was seen to exceed 45s today, and a player stranded
// mid-procedure is the exact failure this exists to prevent. Inlining costs a
// re-drag whenever the code changes, which is cheap with someone on the call.
export function bookmarkletHref(origin, apiBase) {
  // R84: `app` is not a branch any more -- the console is offered from anywhere
  // (R77) -- but the crank handle still needs the app's origin to address it,
  // because it asks that page whether the fix actually worked before closing.
  const cfg = { api: apiBase, app: origin, origins: crankOrigins(origin) }
  return (
    'javascript:' +
    encodeURIComponent(`(${crankHandle})(${JSON.stringify(cfg)})`)
  )
}
