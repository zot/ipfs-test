// CRC: crc-GithubApp.md | Seq: seq-session.md#1.1 | R56, R57, R58, R63, R64, R66
//
// The console's entry point, the counterpart of App for the GitHub-hosted page.
// It holds no domain logic: Session decides identity from the URL, Onboarding
// reaches a ready daemon, and Room + ChatView run the conversation -- the last
// two reused untouched from the original app (R63).

import { KuboClient } from './kubo.js';
import { Room } from './room.js';
import { ChatView } from './view.js';
import { Session } from './session.js';
import { Readiness } from './readiness.js';
import { Onboarding } from './onboarding.js';
import { OnboardingView } from './onboarding-view.js';
import { watchForDaemon } from './monitor.js';

// R56, R58: the app reads its own origin and would run unchanged from a dev
// server; the daemon is always the local RPC.
const API = 'http://127.0.0.1:5001';
const PREFS_KEY = 'ipfs-console-prefs';

const loadPrefs = () => { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; } };
const savePrefs = (p) => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* private mode */ } };

const client = new KuboClient(API);
const session = new Session();
const chat = new ChatView();
const gate = new OnboardingView({ origin: location.origin, apiBase: API });

// Thin adapters over KuboClient + the Permissions API, so Readiness stays pure
// and the whole truth table tests with fakes. The browser-branch -- which
// permission descriptor is authoritative -- lives here, not in Readiness.
const corsProbe = () => client.selfId();
const noCorsProbe = async () => {
  // Resolves only when the daemon is live AND the browser permission let it out.
  await fetch(`${API}/api/v0/id`, { method: 'POST', mode: 'no-cors' });
  return true;
};
const permission = {
  async query() {
    if (!navigator.permissions?.query) return 'unavailable';
    try { return (await navigator.permissions.query({ name: 'local-network-access' })).state; } catch { /* not Chrome */ }
    try { await navigator.permissions.query({ name: 'local-network' }); return 'nominal'; } catch { /* not Firefox */ }
    return 'unavailable';
  },
  onChange(cb) {
    if (!navigator.permissions?.query) return;
    navigator.permissions.query({ name: 'local-network-access' })
      .then((s) => { s.onchange = cb; }).catch(() => {});
  },
};
const readiness = new Readiness({ corsProbe, noCorsProbe, permission });

// R54, R76: keep probing while the gate is up; when the daemon finally answers,
// re-advance, so a fix applied in another tab lands without a button press.
const monitor = watchForDaemon(() => client.selfId());

let room = null;

// CRC: crc-GithubApp.md | Seq: seq-session.md#1.2 | R60, R64
// Onboarding reached ready. A host mints a room and the address bar becomes the
// invite (R60); a guest keeps the room the URL carried. Then a nickname is
// collected on the reused join form (R63) before the player enters.
function onReady(role) {
  monitor.stop();
  gate.hide();
  if (role === 'host' && !session.room) session.start();
  chat.showJoin({ nick: loadPrefs().nick, room: session.room });
}

const onboarding = new Onboarding({ readiness, view: gate, store: localStorage, onReady });

gate.on('done', (step, info) => onboarding.done(step, info));
// R73: the loud gesture summons the browser prompt (via a probe), then reports
// whether it ended denied so the flow can route to recovery.
gate.on('connect', async () => {
  await readiness.probe();
  return (await permission.query()) === 'denied';
});

// CRC: crc-GithubApp.md | Seq: seq-message.md#1.1 | R63
// ChatView -> Room, wired exactly as App does; the conversation is reused whole.
function wire(r) {
  r.on('message', (m) => chat.appendMessage(m, { showBeats: chat.showBeats }));
  r.on('presence', (p) => chat.setPresence(p));
  r.on('stats', (s) => chat.renderStats(s));
  r.on('status', ({ live }) => chat.setStatus({ connected: true, live }));
  r.on('error', (e) => chat.flashError(`subscription trouble: ${e.message}`));
}

chat.on('join', async ({ nick, room: name }) => {
  savePrefs({ nick });
  const roomName = name || session.room || session.start();
  const selfId = await client.selfId();
  chat.setSelfId(selfId);
  chat.setStatus({ connected: true, live: false });
  room = new Room(client, { nick, selfId });
  wire(room);
  chat.showConversation(roomName);
  chat.renderStats(room.snapshot());
  await room.join(roomName);
});

chat.on('send', async (text) => {
  try { await room.send(text); }
  catch (e) { chat.restoreText(text); chat.flashError(`publish failed: ${e.message}`); }
});
chat.on('leave', async () => { await room.leave(); chat.showJoin({ nick: loadPrefs().nick, room: session.room }); });
chat.on('heartbeat', (ms) => room?.setHeartbeat(ms));

// CRC: crc-GithubApp.md | Seq: seq-session.md#2.1 | R61, R64, R66
// Identity from the URL, then onboarding to a ready daemon.
function start() {
  const { role } = session.read();
  chat.setStatus({ connected: false, live: false, text: 'getting your node ready…' });
  monitor.start(() => onboarding.done('recheck'));
  onboarding.begin(role, session.room);
}

start();
