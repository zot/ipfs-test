// CRC: test-Room.md | R23, R24, R25, R27, R28, R29, R30
//
// Integration smoke test against a REAL daemon. Not part of `npm test` -- it
// needs a running Kubo and so cannot be part of the unit suite.
//
//     node test/smoke-live.js
//
// It exercises the exact code the browser runs (KuboClient + Room + Envelope)
// over the real wire, which is the only way to catch a wrong multibase prefix,
// a wrong multipart field name, or a broken stream reader. Node sends no
// Origin header, so this passes even before the CORS allowlist is configured
// -- it verifies the protocol, not the browser's access to it.

import { KuboClient } from '../src/kubo.js';
import { Room } from '../src/room.js';

const topic = `smoke-${Date.now()}`;
const client = new KuboClient(process.env.KUBO_API || 'http://127.0.0.1:5001');

const fail = (m) => { console.error(`FAIL ${m}`); process.exitCode = 1; };
const ok = (m) => console.log(`ok   ${m}`);

const selfId = await client.selfId();
ok(`daemon reachable, node ${selfId}`);

const room = new Room(client, { nick: 'smoke', selfId });
const got = [];
room.on('message', (m) => got.push(m));
room.on('error', (e) => fail(`subscription error: ${e.message}`));

await room.join(topic);
ok(`subscribed to ${topic}`);

// R30: self-delivery is the property the whole no-local-echo design rests on.
// If this stops holding, the app goes silent and it must not do so quietly.
await new Promise((r) => setTimeout(r, 400));
await room.send('hello from the smoke test');
await room.send('and again');
await new Promise((r) => setTimeout(r, 1200));

got.length === 2
  ? ok(`self-delivery works (${got.length} messages returned)`)
  : fail(`expected 2 self-delivered messages, got ${got.length}`);

got.every((m) => m.mine)
  ? ok('own messages identified by peer id')
  : fail('own messages not recognised as ours');

got[0]?.text === 'hello from the smoke test'
  ? ok('payload survived multibase round trip')
  : fail(`payload mangled: ${JSON.stringify(got[0]?.text)}`);

const s = room.snapshot();
s.gaps === 0 ? ok('no sequence gaps on loopback') : fail(`${s.gaps} gaps on loopback`);
ok(`own round trip ~${s.ownLatencyAvg}ms`);

// A single node subscribed to a fresh topic sees no peers; that is expected
// and is exactly the mesh-warm-up condition the browser instrument measures.
console.log(`info peers on topic: ${s.peerCount} (0 is normal for a fresh topic on one node)`);

await room.leave();
ok('unsubscribed');
