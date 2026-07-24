// CRC: test-Monitor.md | R54
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { watchForDaemon } from '../src/monitor.js';

// A stand-in for the browser's timers, so the watcher can be driven a tick at a
// time instead of waiting on real seconds.
const fakeTimer = () => {
  let fn = null;
  let next = 0;
  return {
    setTimer: (f) => { fn = f; return ++next; },
    clearTimer: () => { fn = null; },
    tick: async () => { if (fn) await fn(); },
    get armed() { return fn !== null; },
  };
};

test('keeps waiting while the daemon is unreachable', async () => {
  const t = fakeTimer();
  let reached = 0;
  const w = watchForDaemon(async () => { throw new Error('403'); },
    { setTimer: t.setTimer, clearTimer: t.clearTimer });
  w.start(() => { reached += 1; });
  await t.tick();
  await t.tick();
  assert.equal(reached, 0, 'must not report success while the probe throws');
  assert.ok(w.running, 'must still be watching');
});

test('reports and stops as soon as the daemon answers', async () => {
  const t = fakeTimer();
  let up = false;
  let reached = 0;
  const w = watchForDaemon(async () => { if (!up) throw new Error('403'); return 'peer-id'; },
    { setTimer: t.setTimer, clearTimer: t.clearTimer });
  w.start(() => { reached += 1; });
  await t.tick();
  assert.equal(reached, 0);
  up = true;
  await t.tick();
  assert.equal(reached, 1, 'reports once the probe resolves');
  assert.equal(w.running, false, 'and stops watching');
});

// A second start() must not leave the first timer running: two live watchers
// would both fire, and the app would restart itself twice.
test('starting again replaces the previous watch', () => {
  const t = fakeTimer();
  const cleared = [];
  const w = watchForDaemon(async () => 'ok',
    { setTimer: t.setTimer, clearTimer: (id) => { cleared.push(id); t.clearTimer(id); } });
  w.start(() => {});
  w.start(() => {});
  assert.deepEqual(cleared, [1], 'the first timer is cleared before the second is armed');
});

test('stop() disarms the watch', () => {
  const t = fakeTimer();
  const w = watchForDaemon(async () => 'ok', { setTimer: t.setTimer, clearTimer: t.clearTimer });
  w.start(() => {});
  assert.ok(w.running);
  w.stop();
  assert.equal(w.running, false);
  assert.equal(t.armed, false);
});
