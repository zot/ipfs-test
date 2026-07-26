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
