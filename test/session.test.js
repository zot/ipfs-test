// CRC: test-Session.md | R59, R60, R61, R62
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Session } from '../src/session.js';

// A seedable fake crypto source: deterministic, and different on each call.
const fakeCrypto = (seed = 1) => ({
  getRandomValues(arr) {
    for (let i = 0; i < arr.length; i++) arr[i] = (seed + i * 31) & 0xff;
    seed = (seed * 1103515245 + 12345) & 0xffffffff;
    return arr;
  },
});

function makeEnv(search = '', seed = 1) {
  const location = { href: 'https://zot.github.io/' + search, search };
  const replaced = [];
  const history = {
    replaceState(_s, _t, url) {
      replaced.push(url);
      location.href = url;
      location.search = new URL(url).search;
    },
  };
  return { location, history, replaced, crypto: fakeCrypto(seed) };
}

// R61
test('no room means host', () => {
  const s = new Session(makeEnv(''));
  assert.deepEqual(s.read(), { role: 'host', room: null });
});

// R61
test('a room means guest bound for it', () => {
  const s = new Session(makeEnv('?room=7f3ac2'));
  assert.deepEqual(s.read(), { role: 'guest', room: '7f3ac2' });
});

// R59: the room is the capability, so it must be unguessable and unique.
test('minted rooms are 128-bit and do not repeat', () => {
  const s = new Session(makeEnv('', 5));
  const a = s.mint();
  const b = s.mint();
  assert.match(a, /^[0-9a-f]{32}$/); // 16 bytes -> 32 hex chars = 128 bits
  assert.notEqual(a, b);
});

// R60: starting a session rewrites the address bar so the URL is the invite.
test('start rewrites the address bar and yields the invite URL', () => {
  const env = makeEnv('', 9);
  const s = new Session(env);
  const room = s.start();
  assert.equal(env.replaced.length, 1);
  assert.ok(env.replaced[0].includes('room=' + room));
  assert.ok(s.inviteUrl().includes('room=' + room));
});

// R62: a guest's room survives the onboarding detour because the URL is untouched.
test('guest room survives a re-read', () => {
  const s = new Session(makeEnv('?room=abc123'));
  const first = s.read().room;
  const second = s.read().room; // onboarding did not navigate away
  assert.equal(first, 'abc123');
  assert.equal(second, first);
});

// R88: the label is a prefix on the minted name -- it does not replace the
// random half, and does not shorten it. A label that eroded the entropy would
// weaken the capability while looking like a cosmetic change.
test('a label prefixes the room without touching the random half', () => {
  const env = makeEnv('', 7);
  const s = new Session(env);
  s.read();
  const room = s.start('Café du Monde!!');
  assert.match(room, /^cafe-du-monde-[0-9a-f]{32}$/, room);
  assert.equal(s.label, 'cafe-du-monde');
  assert.match(env.replaced[0], /\?room=cafe-du-monde-[0-9a-f]{32}$/);
});

// R91: an unusable label must not produce a malformed room -- no leading hyphen,
// no empty prefix. Falling back to a bare random name is the honest result.
test('an unusable label yields a bare random room', () => {
  const s = new Session(makeEnv('', 3));
  s.read();
  for (const label of ['!!!', '', null, undefined]) {
    assert.match(s.start(label), /^[0-9a-f]{32}$/, `for ${JSON.stringify(label)}`);
    assert.equal(s.label, '');
  }
});

// R92: a rename mints a FRESH random half. Keeping the old one would leave
// whoever held the previous link holding all of the capability but one word
// drawn from a published list.
test('renaming mints a new random half, not just a new label', () => {
  const s = new Session(makeEnv('', 11));
  s.read();
  const first = s.start('game-night');
  const second = s.start('game-night'); // same label on purpose
  assert.notEqual(first, second, 'the random half must be regenerated');
  const randomHalf = (room) => room.split('-').pop();
  assert.notEqual(randomHalf(first), randomHalf(second));
});
