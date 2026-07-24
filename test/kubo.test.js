// CRC: test-KuboClient.md | R23, R24, R25, R27
//
// The stream reader is the one piece of KuboClient with non-trivial logic: a
// message split across chunk boundaries must be held and reassembled, not
// dropped. The live smoke test happens to exercise this, but only when the
// network splits a packet; this pins it deterministically by choosing the
// splits adversarially.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { KuboClient } from '../src/kubo.js';
import { encodeText } from '../src/multibase.js';

// A ReadableStream that emits exactly the chunks given, as bytes.
function streamOf(chunks) {
  const enc = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(c) {
      if (i < chunks.length) c.enqueue(enc.encode(chunks[i++]));
      else c.close();
    },
  });
}

// One NDJSON line as Kubo emits it: data is multibase-encoded.
const line = (from, text) => JSON.stringify({ from, data: encodeText(text), seqno: 'uAAA' }) + '\n';

function clientWithStream(chunks) {
  const client = new KuboClient('http://x');
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, body: streamOf(chunks) });
  return { client, restore: () => { globalThis.fetch = original; } };
}

test('reassembles a message split across chunk boundaries', async () => {
  const whole = line('peerA', 'hello world');
  // Split the single line into three ugly pieces, none a whole line.
  const chunks = [whole.slice(0, 5), whole.slice(5, 20), whole.slice(20)];
  const { client, restore } = clientWithStream(chunks);
  const got = [];
  try {
    await client.subscribe('lobby', { onMessage: (m) => got.push(m), signal: new AbortController().signal });
  } finally { restore(); }
  assert.equal(got.length, 1);
  assert.equal(got[0].from, 'peerA');
  assert.equal(got[0].text, 'hello world');
});

test('handles several messages arriving in one chunk', async () => {
  const chunks = [line('a', 'one') + line('b', 'two') + line('c', 'three')];
  const { client, restore } = clientWithStream(chunks);
  const got = [];
  try {
    await client.subscribe('lobby', { onMessage: (m) => got.push(m), signal: new AbortController().signal });
  } finally { restore(); }
  assert.deepEqual(got.map((m) => m.text), ['one', 'two', 'three']);
});

test('skips a broken framing line without dropping the stream', async () => {
  const chunks = ['this is not json\n' + line('peerB', 'survives')];
  const { client, restore } = clientWithStream(chunks);
  const got = [];
  try {
    await client.subscribe('lobby', { onMessage: (m) => got.push(m), signal: new AbortController().signal });
  } finally { restore(); }
  assert.equal(got.length, 1);
  assert.equal(got[0].text, 'survives');
});

test('encodes the topic in the subscribe URL', async () => {
  const client = new KuboClient('http://x');
  const original = globalThis.fetch;
  let seenUrl;
  globalThis.fetch = async (url) => { seenUrl = url; return { ok: true, body: streamOf([]) }; };
  try {
    await client.subscribe('test-room', { onMessage: () => {}, signal: new AbortController().signal });
  } finally { globalThis.fetch = original; }
  assert.match(String(seenUrl), /arg=udGVzdC1yb29t/);
});
