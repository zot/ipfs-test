// CRC: crc-ChatView.md | R1, R3, R9, R10, R13, R14, R15, R16, R17, R45, R46, R52, R53
//
// The only component that touches the DOM. Knows nothing of Kubo, topics,
// multibase or subscriptions -- it renders values handed to it and reports
// user intent through callbacks.

const $ = (id) => document.getElementById(id);

// R3: a nickname is freely chosen and unverified, so the peer ID rides beside
// it as the only attested part of the line.
const shortId = (id) => (id && id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id || '?');

const clock = (ts) => new Date(ts).toLocaleTimeString();

export class ChatView {
  constructor() {
    this.el = {
      dot: $('dot'), statusText: $('status-text'), self: $('self'),
      fail: $('fail'), failMsg: $('fail-msg'), retry: $('retry'),
      failOrigin: $('fail-origin'), failAcao: $('fail-acao'), failPubsub: $('fail-pubsub'), copyOrigin: $('copy-origin'),
      steps: $('fail-steps'),
      bmLink: $('bm-link'), goDaemon: $('go-daemon'), // SPIKE-SCRATCH: bookmarklet fast path
      join: $('join'), nick: $('nick'), room: $('room'), beat: $('beat'), joinBtn: $('join-btn'),
      chat: $('chat'), roomName: $('room-name'), presence: $('presence'), leave: $('leave'),
      transcript: $('transcript'), composer: $('composer'), text: $('text'),
      stats: $('stats'), showBeats: $('show-beats'), copy: $('copy'),
    };
    this.handlers = {};
    this.lastStats = null;

    this.el.joinBtn.onclick = () => {
      const nick = this.el.nick.value.trim();
      const room = this.el.room.value.trim();
      // R1: both are required.
      if (!nick || !room) { this.el.nick.focus(); return; }
      this.handlers.join?.({ nick, room, heartbeatMs: +this.el.beat.value });
    };
    this.el.composer.onsubmit = (e) => {
      e.preventDefault();
      const text = this.el.text.value.trim();
      if (!text) return;
      this.el.text.value = ''; // R6: clears immediately
      this.handlers.send?.(text);
    };
    this.el.leave.onclick = () => this.handlers.leave?.();
    this.el.retry.onclick = () => this.handlers.retry?.();
    // R50: copy the exact origin so the player need not retype it into the editor.
    this.el.copyOrigin.onclick = () => {
      navigator.clipboard?.writeText(this.el.failOrigin.textContent);
      this.el.copyOrigin.textContent = 'copied';
      setTimeout(() => { this.el.copyOrigin.textContent = 'copy'; }, 1500);
    };

    // SPIKE-SCRATCH: bookmarklet fast path. The link is drag-only: the player
    // needs it ON the bookmarks bar to run it on the daemon's own tab, so a
    // click in place is a misclick to teach on rather than to honour. (Once
    // dragged, clicking it here IS useful -- it opens the settings tab -- but
    // that is the dragged bookmark firing, not this inline anchor.)
    this.el.bmLink.onclick = (e) => {
      e.preventDefault();
      alert('Drag "Fix IPFS CORS" up onto your bookmarks bar first — it can\'t run from here in place. Then click the bookmark you dragged: it opens your IPFS settings and takes it from there.');
    };
    // R53: the new tab takes focus at once, and the instruction the player needs
    // next lives on THIS page. A modal is dismissed and gone -- which is exactly
    // how a player was lost here -- so mark the step instead. The mark is still
    // showing when they come back to this tab, however long that takes.
    this.el.goDaemon.onclick = () => {
      this.#markStep(3);
      // Deliberately NOT 'noopener': a script may close only a window that a
      // script opened, so noopener here would leave the crank handle unable to
      // shut its own tab when it finishes. Verified in a browser.
      window.open(this.settingsUrl, '_blank');
    };
    this.el.beat.onchange = () => this.handlers.heartbeat?.(+this.el.beat.value);
    this.el.copy.onclick = () => this.#copyReport();
  }

  on(event, fn) { this.handlers[event] = fn; }

  // R53: exactly one step carries the mark, so "where am I" has one answer.
  #markStep(n) {
    for (const li of this.el.steps.children) li.classList.toggle('current', li.id === `step-${n}`);
  }

  #show(which) {
    for (const k of ['fail', 'join', 'chat']) this.el[k].hidden = k !== which;
  }

  showJoin(prefs = {}) {
    this.el.nick.value = prefs.nick || '';
    this.el.room.value = prefs.room || '';
    if (prefs.heartbeatMs != null) this.el.beat.value = String(prefs.heartbeatMs);
    this.#show('join');
    this.el.nick.focus();
  }

  showConversation(room) {
    this.el.roomName.textContent = `room ${room}`;
    this.el.transcript.replaceChildren();
    this.#show('chat');
    this.el.text.focus();
  }

  // R17, R50, R51: the diagnosis plus the exact config to paste. Every snippet
  // reaches the DOM through textContent — see cross-cutting: untrusted input —
  // though here the values are the app's own, not off the wire.
  showFailure({ message, origin, httpHeaders, pubsub, bookmarklet, settingsUrl }) {
    this.el.failMsg.textContent = message;
    this.el.failOrigin.textContent = origin;
    this.el.failAcao.textContent = httpHeaders;
    this.el.failPubsub.textContent = pubsub;
    this.el.bmLink.href = bookmarklet;   // SPIKE-SCRATCH
    this.settingsUrl = settingsUrl;      // SPIKE-SCRATCH
    this.#show('fail');
  }

  // R16
  setStatus({ connected, live, text }) {
    this.el.dot.className = connected ? 'on' : 'off';
    this.el.statusText.textContent = text
      ?? (connected ? (live ? 'IPFS Desktop connected · subscription live' : 'IPFS Desktop connected') : 'IPFS Desktop unreachable');
  }

  setSelfId(id) { this.el.self.textContent = `node ${id}`; }

  // R14, R15: nodes, never users -- two tabs on one daemon are one node.
  setPresence({ count }) {
    this.el.presence.textContent =
      `${count} other node${count === 1 ? '' : 's'} subscribed (nodes, not people)`;
  }

  // R9, R10, R13, R45
  appendMessage(msg, { showBeats = false } = {}) {
    const t = this.el.transcript;
    const atBottom = t.scrollHeight - t.scrollTop - t.clientHeight < 40;

    if (msg.gap > 0) {
      const li = document.createElement('li');
      li.className = 'gap';
      li.textContent = `— ${msg.gap} message${msg.gap === 1 ? '' : 's'} lost from ${shortId(msg.from)} —`;
      t.append(li);
    }

    if (msg.kind !== 'beat' || showBeats) {
      const li = document.createElement('li');
      li.className = `${msg.mine ? 'mine' : 'theirs'}${msg.kind === 'beat' ? ' beat' : ''}`;

      const meta = document.createElement('div');
      meta.className = 'meta';
      const who = document.createElement('span');
      who.textContent = msg.nick;                      // R13: text, never markup
      const pid = document.createElement('span');
      pid.className = 'pid';
      pid.textContent = shortId(msg.from);
      const when = document.createElement('span');
      when.textContent = `${clock(msg.ts)} · #${msg.seq}`;
      meta.append(who, pid, when);

      const body = document.createElement('div');
      body.className = 'body';
      body.textContent = msg.text;                     // R13

      li.append(meta, body);
      t.append(li);
    }

    if (atBottom) t.scrollTop = t.scrollHeight;
  }

  get showBeats() { return this.el.showBeats.checked; }

  // R8: a failed publish gives the text back rather than swallowing it.
  restoreText(text) { this.el.text.value = text; this.el.text.focus(); }

  flashError(message) {
    this.el.statusText.textContent = message;
    this.el.dot.className = 'off';
  }

  // R46
  renderStats(s) {
    this.lastStats = s;
    const rows = [
      ['uptime', `${s.uptimeSec}s`],
      ['first peer seen', s.firstPeerAt ? `${(s.firstPeerAt / 1000).toFixed(1)}s` : 'not yet'],
      ['peers on topic', s.peerCount],
      ['sent', s.sent],
      ['received', s.received],
      ['lost (seq gaps)', s.gaps, s.gaps ? 'bad' : ''],
      ['loss rate', `${s.lossPct}%`, s.lossPct > 0 ? 'bad' : ''],
      ['reordered', s.reordered, s.reordered ? 'warn' : ''],
      ['duplicates', s.duplicates, s.duplicates ? 'warn' : ''],
      ['dropped (not ours)', s.dropped],
      ['reconnects', s.reconnects, s.reconnects ? 'warn' : ''],
      ['own round trip', s.ownLatencyAvg == null ? '—' : `${s.ownLatencyAvg}ms`],
      ['peer latency*', s.peerLatencyAvg == null ? '—' : `${s.peerLatencyAvg}ms`],
    ];
    this.el.stats.replaceChildren(...rows.map(([k, v, cls]) => {
      const div = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = k;
      const dd = document.createElement('dd');
      dd.textContent = String(v);
      if (cls) dd.className = cls;
      div.append(dt, dd);
      return div;
    }));
  }

  // Two people comparing what each observed is the whole point, so the numbers
  // have to leave the page as text.
  #copyReport() {
    const s = this.lastStats;
    if (!s) return;
    const report = [
      `ipfs pubsub probe -- ${new Date().toISOString()}`,
      `uptime ${s.uptimeSec}s, peers ${s.peerCount}, first peer ${s.firstPeerAt ? (s.firstPeerAt / 1000).toFixed(1) + 's' : 'never'}`,
      `sent ${s.sent}, received ${s.received}, lost ${s.gaps} (${s.lossPct}%)`,
      `reordered ${s.reordered}, duplicates ${s.duplicates}, dropped ${s.dropped}, reconnects ${s.reconnects}`,
      `own round trip ${s.ownLatencyAvg ?? '-'}ms, peer latency ${s.peerLatencyAvg ?? '-'}ms (*clock skew between machines)`,
    ].join('\n');
    navigator.clipboard?.writeText(report);
    this.el.copy.textContent = 'copied';
    setTimeout(() => { this.el.copy.textContent = 'copy report'; }, 1500);
  }
}
