// CRC: test-Room.md | R7, R10, R11, R12, R44, R45, R46
//
// These matter more than they look. The whole point of the spike is the loss
// figure the app reports, so if gap detection is wrong the instrument lies and
// the conclusion drawn from it is wrong too.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../src/room.js';
import * as Envelope from '../src/envelope.js';

// Satisfies the transport seam (crc-KuboClient.md) with no daemon, no HTTP.
class FakeTransport {
  constructor() {
    this.published = [];
    this.peerList = [];
    this.onMessage = null;
    this.subscribes = 0;
  }
  async selfId() { return 'self'; }
  async publish(topic, text) { this.published.push({ topic, text }); }
  async subscribe(topic, { onMessage, onOpen, signal }) {
    this.subscribes++;
    this.lastTopic = topic;
    this.onMessage = onMessage;
    onOpen?.();
    return new Promise((resolve) => signal.addEventListener('abort', resolve, { once: true }));
  }
  async peers() { return this.peerList; }
  deliver(from, text) { this.onMessage({ from, text }); }
}

async function joined(opts = {}) {
  const t = new FakeTransport();
  const room = new Room(t, { nick: 'bill', selfId: 'self', ...opts });
  const seen = [];
  room.on('message', (m) => seen.push(m));
  await room.join('lobby');
  return { t, room, seen };
}

const msg = (nick, text, seq, kind = 'chat') => Envelope.create(nick, text, seq, kind);

test('delivers a message and marks whose it is', async () => {
  const { t, room, seen } = await joined();
  t.deliver('self', msg('bill', 'mine', 1));
  t.deliver('peer', msg('friend', 'theirs', 1));
  assert.equal(seen.length, 2);
  assert.equal(seen[0].mine, true);
  assert.equal(seen[1].mine, false);
  assert.equal(seen[1].nick, 'friend');
  await room.leave();
});

// R7: no local echo. What is displayed is what the network carried, so a
// publish that reached nobody shows up as a missing message.
test('send publishes but adds nothing to the transcript', async () => {
  const { t, room, seen } = await joined();
  await room.send('hello');
  await room.send('again');
  assert.equal(seen.length, 0);
  assert.equal(t.published.length, 2);
  assert.equal(Envelope.parse(t.published[0].text).seq, 1);
  assert.equal(Envelope.parse(t.published[1].text).seq, 2);
  assert.equal(room.snapshot().sent, 2);
  await room.leave();
});

// R11: gossipsub redelivers.
test('shows a redelivered message once', async () => {
  const { t, room, seen } = await joined();
  const m = msg('friend', 'once', 1);
  t.deliver('peer', m);
  t.deliver('peer', m);
  t.deliver('peer', m);
  assert.equal(seen.length, 1);
  assert.equal(room.snapshot().duplicates, 2);
  assert.equal(room.snapshot().received, 1);
  await room.leave();
});

// R45: the finding the spike exists to produce.
test('counts a sequence gap as loss', async () => {
  const { t, room, seen } = await joined();
  t.deliver('peer', msg('friend', 'one', 1));
  t.deliver('peer', msg('friend', 'four', 4));   // 2 and 3 never arrived
  assert.equal(room.snapshot().gaps, 2);
  assert.equal(seen[1].gap, 2);
  assert.equal(room.snapshot().lossPct, 50); // 2 lost of 4 expected
  await room.leave();
});

test('does not blame loss for the first message seen from a sender', async () => {
  const { t, room } = await joined();
  t.deliver('peer', msg('friend', 'joined late', 9));
  assert.equal(room.snapshot().gaps, 0);
  await room.leave();
});

test('counts gaps per sender, not globally', async () => {
  const { t, room } = await joined();
  t.deliver('a', msg('ann', 'x', 1));
  t.deliver('b', msg('bob', 'y', 1));
  t.deliver('a', msg('ann', 'x', 2));
  t.deliver('b', msg('bob', 'y', 2));
  assert.equal(room.snapshot().gaps, 0);
  await room.leave();
});

// Gossipsub reorders. Calling that loss would overstate the failure rate.
test('treats an out-of-order arrival as reordering, not loss', async () => {
  const { t, room } = await joined();
  t.deliver('peer', msg('friend', 'one', 1));
  t.deliver('peer', msg('friend', 'three', 3));
  assert.equal(room.snapshot().gaps, 1);
  t.deliver('peer', msg('friend', 'two', 2));   // the straggler
  assert.equal(room.snapshot().reordered, 1);
  assert.equal(room.snapshot().gaps, 1, 'gap count must not double-count');
  await room.leave();
});

// R12: someone else's broken publisher must not disturb the reader.
test('ignores payloads that are not ours', async () => {
  const { t, room, seen } = await joined();
  t.deliver('peer', 'not json');
  t.deliver('peer', JSON.stringify({ hello: 'from another program' }));
  t.deliver('peer', msg('friend', 'still works', 1));
  assert.equal(seen.length, 1);
  assert.equal(room.snapshot().dropped, 2);
  await room.leave();
});

test('reports peer count and time to first peer', async () => {
  const t = new FakeTransport();
  const room = new Room(t, { nick: 'bill', selfId: 'self' });
  const presence = [];
  room.on('presence', (p) => presence.push(p));
  t.peerList = ['peer-a', 'peer-b'];
  await room.join('lobby');
  await new Promise((r) => setImmediate(r));
  assert.equal(presence.at(-1).count, 2);
  assert.ok(room.snapshot().firstPeerAt >= 0);
  await room.leave();
});

test('leaving ends the subscription and stops its timers', async () => {
  const { t, room } = await joined();
  assert.equal(t.subscribes, 1);
  assert.equal(t.lastTopic, 'lobby', 'the plain room name crosses the seam, not an encoded one');
  await room.leave();
  assert.equal(room.running, false);
  assert.equal(room.topic, null);
  assert.equal(room.peerTimer, null);
});

test('joining a second room resets the measurements', async () => {
  const { t, room } = await joined();
  t.deliver('peer', msg('friend', 'x', 1));
  t.deliver('peer', msg('friend', 'x', 5));
  assert.ok(room.snapshot().gaps > 0);
  await room.join('other');
  assert.equal(room.snapshot().gaps, 0);
  assert.equal(room.snapshot().received, 0);
  await room.leave();
});

// An unbounded seen-set is a slow leak in a long tabletop session.
test('bounds the duplicate-detection set', async () => {
  const { t, room } = await joined();
  for (let i = 1; i <= 4200; i++) t.deliver('peer', msg('friend', 'x', i));
  assert.ok(room.seen.size <= 4000, `seen grew to ${room.seen.size}`);
  assert.equal(room.seenOrder.length, room.seen.size);
  await room.leave();
});
