// CRC: test-Multibase.md | R24, R25
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodeText, decodeToBytes, decodeToText } from '../src/multibase.js';

// The vector the live daemon accepted; if this changes, publishing breaks.
test('encodes the topic form kubo accepts', () => {
  assert.equal(encodeText('test-room'), 'udGVzdC1yb29t');
});

test('round trips', () => {
  for (const s of ['', 'a', 'lobby', 'a room with spaces', '{"json":true}']) {
    assert.equal(decodeToText(encodeText(s)), s);
  }
});

test('round trips non-ascii', () => {
  const s = 'héllo — 世界 🎲';
  assert.equal(decodeToText(encodeText(s)), s);
});

test('emits base64url alphabet without padding', () => {
  const out = encodeText('\xfb\xff\xfe');
  assert.ok(!/[+/=]/.test(out), `unexpected chars in ${out}`);
});

// R25: a wrong base decodes to plausible garbage, so it must fail loudly.
test('rejects a prefix that is not u', () => {
  assert.throws(() => decodeToBytes('bdGVzdC1yb29t'), /unsupported multibase prefix/);
  assert.throws(() => decodeToBytes(''), /unsupported multibase prefix/);
  assert.throws(() => decodeToBytes(null), /unsupported multibase prefix/);
});

// Another program may publish arbitrary bytes to a public topic. That must
// yield replacement characters for Envelope to reject -- not an exception
// that would tear down the subscription.
test('decodes invalid utf-8 without throwing', () => {
  const raw = 'u' + Buffer.from([0xff, 0xfe, 0x00, 0x41]).toString('base64url');
  const out = decodeToText(raw);
  assert.equal(typeof out, 'string');
  assert.ok(out.includes('A'));
});
