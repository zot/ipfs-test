// CRC: test-ConfigHelp.md | R31, R32, R40, R50, R51, R55
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allowOriginArray, crankOrigins, httpHeadersSnippet, pubsubSnippet, bookmarkletHref } from '../src/config-help.js';

const crankSource = (origin, api) =>
  decodeURIComponent(bookmarkletHref(origin, api).replace(/^javascript:/, ''));

test('includes this page origin plus the webui default', () => {
  const arr = allowOriginArray('http://k51abc.ipns.localhost:9090');
  assert.ok(arr.includes('http://k51abc.ipns.localhost:9090'), 'must include the page origin');
  assert.ok(arr.includes('https://webui.ipfs.io'), 'must keep the webui default');
});

// R32, R40: the web UI is served by the same gateway as the app, so its origin
// always carries the app's own port. Nothing is guessed and nothing falls back
// to a likely port -- a fixed port is the bug that cost a friend their web UI,
// on a list that gets replaced wholesale. Ports below are arbitrary on purpose:
// neither is special, because no port is.
test('derives every origin from the port this player actually uses', () => {
  for (const port of ['8080', '9090']) {
    const arr = allowOriginArray(`http://k51abc.ipns.localhost:${port}`);
    assert.ok(arr.includes(`http://k51abc.ipns.localhost:${port}`), `app at :${port}`);
    assert.ok(arr.includes(`http://webui.ipfs.io.ipns.localhost:${port}`), `web UI at :${port}`);
    assert.equal(
      arr.filter((o) => o.startsWith('http://webui.ipfs.io.ipns.localhost:')).length,
      1,
      'exactly one web UI origin -- no invented ports',
    );
  }
});

test('does not duplicate an origin that is already a default', () => {
  const arr = allowOriginArray('https://webui.ipfs.io');
  assert.equal(arr.filter((o) => o === 'https://webui.ipfs.io').length, 1);
});

// With no origin there is no port to derive from, so no loopback entry can be
// invented -- only the one origin that does not depend on the player's setup.
test('tolerates a missing origin without adding junk', () => {
  assert.deepEqual(allowOriginArray(''), ['https://webui.ipfs.io']);
});

// R55: the crank handle reads the allowlist and merges into it, so it never
// removes anything and need only name what is required. Handing a PUBLIC site
// access to a local daemon that had granted it to nobody is an expansion of the
// player's exposure that buys them nothing -- so it adds loopback origins only.
test('the crank handle does not grant a remote site access to a local daemon', () => {
  const added = crankOrigins('http://k51abc.ipns.localhost:8080');
  assert.ok(!added.includes('https://webui.ipfs.io'), 'must not add the public web UI origin');
  assert.ok(added.every((o) => o.startsWith('http://')), 'everything it adds is loopback http');
  assert.ok(added.includes('http://k51abc.ipns.localhost:8080'), 'but the app itself must be there');
  assert.ok(added.includes('http://webui.ipfs.io.ipns.localhost:8080'), 'and the local web UI');
});

// The blind paste is the opposite case: it replaces the list sight unseen, so
// omitting a default would be the thing that removes it (R32).
test('the by-hand paste still carries the defaults it might otherwise remove', () => {
  assert.ok(allowOriginArray('http://k51abc.ipns.localhost:8080').includes('https://webui.ipfs.io'));
});

// The snippet must be pasteable straight into API.HTTPHeaders: valid JSON as a
// whole, carrying the player's own origin.
test('snippet is the whole HTTPHeaders block and parses as JSON', () => {
  const origin = 'http://k51abc.ipns.localhost:8080';
  const headers = JSON.parse(`{${httpHeadersSnippet(origin)}}`);
  assert.ok(headers['Access-Control-Allow-Origin'].includes(origin));
});

// R31: a player whose API.HTTPHeaders is empty -- an observed state, not a
// hypothetical -- needs both fields. Handing over the origin alone leaves the
// daemon refusing the preflight, which looks exactly like the failure they were
// trying to fix.
test('snippet carries the allowed methods, not just the origin', () => {
  const headers = JSON.parse(`{${httpHeadersSnippet('http://k51abc.ipns.localhost:8080')}}`);
  assert.deepEqual(headers['Access-Control-Allow-Methods'], ['POST', 'OPTIONS']);
});

test('pubsub snippet parses as JSON with Enabled true', () => {
  const snip = pubsubSnippet();
  const value = JSON.parse(`{${snip.replace(/^"Pubsub":\s*/, '"Pubsub":')}}`);
  assert.equal(value.Pubsub.Enabled, true);
  assert.equal(value.Pubsub.Router, 'gossipsub');
});

// R78: the crank handle speaks through a panel it draws into the page, never a
// modal. A blocking dialog standing between the player's click and the tab that
// click is meant to open can outlast the click's authority to open one, so an
// alert() creeping back is a real regression rather than a style lapse. The
// whole procedure is a string by the time it reaches here, which is why this
// costs no DOM.
test('the generated bookmarklet raises no modal dialogs', () => {
  const src = crankSource('https://example.github.io', 'http://127.0.0.1:5001');
  for (const modal of ['alert(', 'confirm(', 'prompt(']) {
    assert.ok(!src.includes(modal), `must not call ${modal}`);
  }
});

// R77: nothing on the app page opens the daemon's console any more, so the
// bookmarklet has to carry that opening itself. If it ever stops, the CORS step
// becomes a dead end rather than an obviously broken one.
test('the generated bookmarklet opens the console itself', () => {
  const src = crankSource('https://example.github.io', 'http://127.0.0.1:5001');
  assert.ok(src.includes('window.open'), 'must open the console tab itself');
  assert.ok(src.includes('http://127.0.0.1:5001'), "must carry this player's API base");
});
