// CRC: crc-Room.md | R2, R4, R6, R7, R8, R10, R11, R14, R18, R22, R30, R44-R47
//
// One room's subscription -- the only genuinely stateful component, and the
// instrument this spike exists for. It does three jobs: keep a subscription
// alive, discard duplicate gossip, and measure what actually arrives.
//
// Nothing here writes to the transcript on send. A message reaches the view
// only when the subscription delivers it back, which the daemon does for a
// node's own publishes. A publish that succeeded but reached nobody therefore
// shows up as a missing message rather than being masked by a local echo.

import * as Envelope from './envelope.js';

const SEEN_MAX = 4000;
const PEER_POLL_MS = 3000;
const BACKOFF_START = 1000;
const BACKOFF_MAX = 15000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class Room {
  constructor(transport, { nick, selfId }) {
    this.transport = transport;
    this.nick = nick;
    this.selfId = selfId;

    this.topic = null;
    this.running = false;
    this.controller = null;
    this.backoff = BACKOFF_START;

    // R11: bounded, because an unbounded set is a slow leak in a long session.
    this.seen = new Set();
    this.seenOrder = [];

    this.lastSeq = new Map(); // peerId -> last seq seen
    this.outSeq = 0;
    this.heartbeatMs = 0;
    this.heartbeatTimer = null;
    this.peerTimer = null;

    this.listeners = new Map();
    this.stats = this.#freshStats();
  }

  #freshStats() {
    return {
      joinedAt: 0,
      firstPeerAt: 0,   // R49: how long the mesh took to produce a peer
      received: 0,
      duplicates: 0,
      gaps: 0,          // R45: counted missing sequence numbers
      reordered: 0,     // arrived out of order, not lost
      dropped: 0,       // not a message of ours
      sent: 0,
      reconnects: 0,
      ownLatency: [],   // exact -- one clock
      peerLatency: [],  // clock-skew affected -- two machines
      peerCount: 0,
    };
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
  }

  #emit(event, data) {
    for (const fn of this.listeners.get(event) || []) fn(data);
  }

  // CRC: crc-Room.md | Seq: seq-join.md#1.4 | R2
  async join(topic) {
    await this.leave();
    this.topic = topic;
    this.running = true;
    this.backoff = BACKOFF_START;
    this.seen.clear();
    this.seenOrder.length = 0;
    this.lastSeq.clear();
    this.outSeq = 0;
    this.stats = this.#freshStats();
    this.stats.joinedAt = Date.now();

    this.#pollPeers();
    this.peerTimer = setInterval(() => this.#pollPeers(), PEER_POLL_MS);
    if (this.heartbeatMs) this.#startHeartbeat();
    this.#loop(); // deliberately not awaited: it runs until leave()
  }

  // CRC: crc-Room.md | Seq: seq-join.md#1.3 | R4
  // Aborting the request is what unsubscribes at the daemon.
  async leave() {
    this.running = false;
    this.controller?.abort();
    this.controller = null;
    clearInterval(this.peerTimer);
    clearInterval(this.heartbeatTimer);
    this.peerTimer = this.heartbeatTimer = null;
    this.topic = null;
  }

  // CRC: crc-Room.md | Seq: seq-message.md#1.5 | R6, R7, R8, R44, R47
  // Adds nothing to the transcript. A resolved publish means the daemon
  // accepted the bytes, not that a peer received them.
  async send(text, kind = 'chat') {
    if (!this.topic) throw new Error('not in a room');
    const seq = ++this.outSeq;
    await this.transport.publish(this.topic, Envelope.create(this.nick, text, seq, kind));
    this.stats.sent++;
    this.#emit('stats', this.snapshot());
  }

  // CRC: crc-Room.md | Seq: seq-reconnect.md#1.1 | R18
  async #loop() {
    while (this.running) {
      this.controller = new AbortController();
      try {
        await this.transport.subscribe(this.topic, {
          onMessage: (m) => this.#onMessage(m),
          onOpen: () => {
            this.backoff = BACKOFF_START;
            this.#emit('status', { live: true });
          },
          signal: this.controller.signal,
        });
      } catch (err) {
        if (!this.running) return; // our own abort, from leave()
        this.#emit('error', err);
      }
      // Seq: seq-reconnect.md#1.3
      if (!this.running) return;
      this.stats.reconnects++;
      this.#emit('status', { live: false });
      this.#emit('stats', this.snapshot());
      // Seq: seq-reconnect.md#1.4
      await sleep(this.backoff);
      this.backoff = Math.min(this.backoff * 2, BACKOFF_MAX);
    }
  }

  // CRC: crc-Room.md | Seq: seq-message.md#2.5 | R10, R11, R12, R45
  #onMessage({ from, text }) {
    const env = Envelope.parse(text);
    if (!env) {
      // R12: someone else's malformed publish must not disturb the reader.
      this.stats.dropped++;
      return;
    }
    if (this.seen.has(env.id)) {
      this.stats.duplicates++;
      this.#emit('stats', this.snapshot());
      return;
    }
    this.#remember(env.id);

    const mine = from === this.selfId;
    const gap = this.#trackSequence(from, env.seq);

    this.stats.received++;
    const latency = Date.now() - env.ts;
    (mine ? this.stats.ownLatency : this.stats.peerLatency).push(latency);

    this.#emit('message', { ...env, from, mine, latency, gap });
    this.#emit('stats', this.snapshot());
  }

  // R45: a receiver seeing 4 then 6 knows 5 was lost. Gossipsub may also
  // reorder, so a lower-than-expected seq is counted as reordering rather
  // than being mistaken for loss.
  #trackSequence(from, seq) {
    const last = this.lastSeq.get(from);
    if (last === undefined) {
      this.lastSeq.set(from, seq);
      return 0; // first sight of this sender; earlier messages predate us
    }
    if (seq <= last) {
      this.stats.reordered++;
      return 0;
    }
    const missing = seq - last - 1;
    if (missing > 0) this.stats.gaps += missing;
    this.lastSeq.set(from, seq);
    return missing;
  }

  #remember(id) {
    this.seen.add(id);
    this.seenOrder.push(id);
    if (this.seenOrder.length > SEEN_MAX) this.seen.delete(this.seenOrder.shift());
  }

  // CRC: crc-Room.md | Seq: seq-join.md#1.7 | R14, R49
  async #pollPeers() {
    if (!this.topic) return;
    try {
      const peers = await this.transport.peers(this.topic);
      this.stats.peerCount = peers.length;
      if (peers.length && !this.stats.firstPeerAt) {
        this.stats.firstPeerAt = Date.now() - this.stats.joinedAt;
        this.#emit('stats', this.snapshot());
      }
      this.#emit('presence', { count: peers.length, peers });
    } catch {
      // A failed poll is not worth interrupting a working conversation over.
    }
  }

  // R48: nobody can type fast enough to measure a loss rate. The heartbeat
  // generates the sample size, so the instrument works while unattended.
  setHeartbeat(ms) {
    this.heartbeatMs = ms;
    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = null;
    if (ms && this.topic) this.#startHeartbeat();
  }

  #startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.send('beat', 'beat').catch((err) => this.#emit('error', err));
    }, this.heartbeatMs);
  }

  // R46
  snapshot() {
    const s = this.stats;
    const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null);
    const expected = s.received + s.gaps;
    return {
      ...s,
      ownLatencyAvg: avg(s.ownLatency),
      peerLatencyAvg: avg(s.peerLatency),
      lossPct: expected ? +((s.gaps / expected) * 100).toFixed(1) : 0,
      uptimeSec: s.joinedAt ? Math.round((Date.now() - s.joinedAt) / 1000) : 0,
    };
  }
}
