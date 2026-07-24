// CRC: crc-App.md | Seq: seq-join.md#1.1 | R5, R17, R19, R43
//
// Entry point. Wires user intent from the view into the room, and room events
// back into the view. Holds no domain logic -- if a rule needs deciding it
// belongs in Room, Envelope or ChatView.

import { KuboClient } from './kubo.js';
import { Room } from './room.js';
import { ChatView } from './view.js';
import { httpHeadersSnippet, pubsubSnippet, bookmarkletHref } from './config-help.js';
import { watchForDaemon } from './monitor.js';

// R43: the app holds no knowledge of how it was delivered. Served from the
// IPFS gateway or from a static dev server, it talks to the same daemon.
const API = 'http://127.0.0.1:5001';
const PREFS_KEY = 'ipfs-pubsub-probe';

// R5
const loadPrefs = () => {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; }
};
const savePrefs = (p) => {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* private mode */ }
};

const view = new ChatView();
const client = new KuboClient(API);
let room = null;

// R17, R50, R51: the likely cause is named AND the fix is generated inline. A
// bare "failed to fetch" is indistinguishable from a stopped daemon, and the
// fix for the common case is a config change nobody would guess at — so the
// message carries the exact config, keyed to this page's own origin.
const failure = (err) => ({
  message:
    `Can't reach IPFS Desktop at ${API}. If it's running, the usual ` +
    `cause is that this page's origin isn't allowed to call it — it answers 403, ` +
    `which looks just like being offline. (${err.message})`,
  origin: location.origin,
  httpHeaders: httpHeadersSnippet(location.origin),
  pubsub: pubsubSnippet(),
  // SPIKE-SCRATCH: bookmarklet fast path (origin baked in; opens the one
  // same-origin page the bookmarklet can run on).
  bookmarklet: bookmarkletHref(location.origin, API),
  settingsUrl: `${API}/webui/`,
});

// CRC: crc-App.md | Seq: seq-join.md#1.9
function wire(r) {
  r.on('message', (msg) => view.appendMessage(msg, { showBeats: view.showBeats }));
  r.on('presence', (p) => view.setPresence(p));
  r.on('stats', (s) => view.renderStats(s));
  r.on('status', ({ live }) => view.setStatus({ connected: true, live }));
  r.on('error', (err) => view.flashError(`subscription trouble: ${err.message}`));
}

const monitor = watchForDaemon(() => client.selfId());

async function start() {
  monitor.stop();
  view.setStatus({ connected: false, live: false, text: 'checking IPFS Desktop…' });
  let selfId;
  try {
    // The peer ID must be known before joining: it is how a node recognises
    // its own messages arriving back through its own subscription.
    selfId = await client.selfId();
  } catch (err) {
    view.showFailure(failure(err));
    // R54: the fix is applied somewhere else -- another tab, a tray restart --
    // so the moment it lands is not a moment anyone is watching this page.
    // Keep checking, and carry on the instant the daemon answers.
    monitor.start(start);
    return;
  }
  view.setSelfId(selfId);
  view.setStatus({ connected: true, live: false });
  room = new Room(client, { nick: '', selfId });
  wire(room);
  view.showJoin(loadPrefs());
}

// Seq: seq-join.md#1.2
view.on('join', async ({ nick, room: name, heartbeatMs }) => {
  savePrefs({ nick, room: name, heartbeatMs });
  room.nick = nick;
  room.setHeartbeat(heartbeatMs);
  view.showConversation(name);
  view.renderStats(room.snapshot());
  await room.join(name);
});

// Seq: seq-message.md#1.8 -- R8
view.on('send', async (text) => {
  try {
    await room.send(text);
  } catch (err) {
    view.restoreText(text);
    view.flashError(`publish failed: ${err.message}`);
  }
});

view.on('leave', async () => {
  await room.leave();
  view.setStatus({ connected: true, live: false });
  view.showJoin(loadPrefs());
});

view.on('heartbeat', (ms) => {
  room?.setHeartbeat(ms);
  savePrefs({ ...loadPrefs(), heartbeatMs: ms });
});

view.on('retry', start);

start();
