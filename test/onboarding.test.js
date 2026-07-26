// CRC: test-Onboarding.md | R64, R70, R74, R75
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Onboarding } from '../src/onboarding.js';

const memStore = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
};
// Returns each scripted state once, then repeats the last.
const scripted = (states) => {
  let i = 0;
  return { probe: () => Promise.resolve({ state: states[Math.min(i++, states.length - 1)] }), watch() {} };
};
const recordingView = () => {
  const calls = [];
  return { calls, showStep(step, opts) { calls.push({ step, opts }); } };
};

// R64
test('shows the step for the unmet condition (cors)', async () => {
  const view = recordingView();
  const ob = new Onboarding({ readiness: scripted(['cors']), view, store: memStore(), onReady() {} });
  await ob.begin('host', null);
  assert.equal(view.calls.at(-1).step, 'cors');
});

// R75: a stopped daemon shows setup, never the permission step.
test('daemon-down shows setup, not permission (ordering)', async () => {
  const view = recordingView();
  const ob = new Onboarding({ readiness: scripted(['daemon-down']), view, store: memStore(), onReady() {} });
  await ob.begin('guest', 'r1');
  assert.equal(view.calls.at(-1).step, 'setup');
  assert.ok(!view.calls.some((c) => c.step === 'permission'));
});

// R70: the daemon is the arbiter; a stale stored flag does not override it.
test('a stale permissionDenied flag does not override a daemon-down diagnosis', async () => {
  const store = memStore();
  store.setItem('ipfs-console-onboarding', JSON.stringify({ permissionDenied: true }));
  const view = recordingView();
  const ob = new Onboarding({ readiness: scripted(['daemon-down']), view, store, onReady() {} });
  await ob.begin('host', null);
  assert.equal(view.calls.at(-1).step, 'setup');
});

// R74: a previously-denied permission routes to recovery, not another prompt.
test('a denied permission routes to recovery', async () => {
  const store = memStore();
  store.setItem('ipfs-console-onboarding', JSON.stringify({ permissionDenied: true }));
  const view = recordingView();
  const ob = new Onboarding({ readiness: scripted(['permission']), view, store, onReady() {} });
  await ob.begin('host', null);
  const last = view.calls.at(-1);
  assert.equal(last.step, 'permission');
  assert.equal(last.opts.denied, true);
});

// R64: a ready daemon hands off to the room with role and room.
test('ready proceeds to the room', async () => {
  let readied = null;
  const ob = new Onboarding({
    readiness: scripted(['ready']),
    view: recordingView(),
    store: memStore(),
    onReady: (role, room) => { readied = { role, room }; },
  });
  await ob.begin('guest', 'r7');
  assert.deepEqual(readied, { role: 'guest', room: 'r7' });
});
