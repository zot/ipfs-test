// CRC: test-Readiness.md | R66, R67, R68, R69
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readiness } from '../src/readiness.js';

// The truth table from 2026-07-24, with fakes for each of the three inputs.
const ok = () => Promise.resolve('12D3KooW');
const fail = () => Promise.reject(new Error('Failed to fetch'));
const reached = () => Promise.resolve(true);
const threw = () => Promise.reject(new Error('Failed to fetch'));
const perm = (state) => ({ query: () => Promise.resolve(state) });

// R67
test('ready when the CORS fetch succeeds', async () => {
  const r = new Readiness({ corsProbe: ok, noCorsProbe: threw, permission: perm('granted') });
  assert.deepEqual(await r.probe(), { state: 'ready' });
});

// R67: no-cors reaches a live daemon that hasn't allowlisted the origin.
test('cors problem when no-cors reaches', async () => {
  const r = new Readiness({ corsProbe: fail, noCorsProbe: reached, permission: perm('granted') });
  assert.deepEqual(await r.probe(), { state: 'cors' });
});

// R68: Chrome reads the permission, so a block is named precisely.
test('Chrome: denied permission is attributed to the permission', async () => {
  const r = new Readiness({ corsProbe: fail, noCorsProbe: threw, permission: perm('denied') });
  assert.deepEqual(await r.probe(), { state: 'permission' });
});

test('Chrome: an un-decided (prompt) permission is still the permission', async () => {
  const r = new Readiness({ corsProbe: fail, noCorsProbe: threw, permission: perm('prompt') });
  assert.deepEqual(await r.probe(), { state: 'permission' });
});

// R68: granted-but-unreachable is a stopped daemon, not a permission block.
test('Chrome: granted but unreachable is daemon-down', async () => {
  const r = new Readiness({ corsProbe: fail, noCorsProbe: threw, permission: perm('granted') });
  assert.deepEqual(await r.probe(), { state: 'daemon-down' });
});

// R69: Firefox's nominal API cannot separate the two -- they collapse.
test('Firefox: nominal permission collapses to permission-or-daemon', async () => {
  const r = new Readiness({ corsProbe: fail, noCorsProbe: threw, permission: perm('nominal') });
  assert.deepEqual(await r.probe(), { state: 'permission-or-daemon' });
});

// R66: nothing probes on construction; the attempt is a deliberate call.
test('probe is deliberate: nothing runs before probe()', async () => {
  let calls = 0;
  const count = () => { calls++; return Promise.reject(new Error('x')); };
  const r = new Readiness({
    corsProbe: count,
    noCorsProbe: count,
    permission: { query: () => { calls++; return Promise.resolve('nominal'); } },
  });
  assert.equal(calls, 0);
  await r.probe();
  assert.ok(calls > 0);
});
