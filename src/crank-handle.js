// CRC: crc-ConfigHelp.md
//
// SPIKE-SCRATCH — the bookmarklet's *behaviour* is deliberately not anchored in
// specs or requirements yet (see gap A3). It is a candidate for the real app's
// onboarding, and should be anchored once it has proven itself on a player who
// is not the author.
//
// A human crank handle. The player supplies the two things a browser will not
// let a script do for itself -- dragging the bookmark, and clicking it on the
// daemon's own page -- and this supplies everything else, including telling
// them what to do next at each point. The sequencing lives in the code rather
// than in the player's head.
//
// It is ordinary readable JavaScript here, and is stringified into a
// `javascript:` URL by config-help.js at generation time. Two consequences
// follow, and both matter:
//
//   1. The module loader parses this file, so a syntax error surfaces during
//      `npm test` instead of in a player's browser.
//   2. It must close over NOTHING. Everything it needs arrives in `cfg`,
//      because the stringified source runs in a foreign page where this
//      module's scope does not exist. No imports, no module-level constants.
//
// Verified in a real browser against Kubo 0.42.0 -- the API port's `/webui/`
// redirect is relative, so it lands same-origin with the config API; that page
// carries no CSP, so injected code runs; and `window.close()` succeeds there,
// provided the tab was opened without `noopener`.
export function crankHandle(cfg) {
  // 127.0.0.1, localhost and ::1 are one daemon to us but three different
  // origins to the browser, and the settings page is reachable by any of them.
  // Recognise all three at the API's own port, or a settings page opened (or
  // refreshed) as localhost:5001 is mistaken for a stranger and the whole
  // procedure dead-ends on "Wrong page for this bookmark."
  const onApi = () => {
    try {
      const here = new URL(location.origin), api = new URL(cfg.api);
      const loopback = (h) => h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]';
      return here.protocol === api.protocol && here.port === api.port && loopback(here.hostname);
    } catch { return location.origin === cfg.api; }
  };

  // Phase 1 -- anywhere but the daemon's own page. Nothing here can reach the
  // config API, so the only useful act is to get them onto a page that can.
  if (!onApi()) {
    if (location.origin === cfg.app) {
      alert('Opening your IPFS settings page in a new tab.\n\nWhen it appears, click this same bookmark again — on that new tab.');
      window.open(cfg.api + '/webui/', '_blank'); // not 'noopener': it must be able to close itself
    } else {
      alert('Wrong page for this bookmark.\n\nClick it on the test app page, or on your IPFS settings page at ' + cfg.api + '.');
    }
    return;
  }

  // Phase 2 -- on the daemon's page, where the config API is same-origin.
  if (document.getElementById('ipfs-crank')) return; // already cranking

  const bar = document.createElement('div');
  bar.id = 'ipfs-crank';
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#14161a;' +
    'color:#d7dce2;font:14px/1.5 ui-monospace,Menlo,Consolas,monospace;padding:.7rem 1rem;' +
    'border-bottom:2px solid #63c08a;box-shadow:0 2px 12px #0008';
  const say = document.createElement('div');
  const row = document.createElement('div');
  row.style.cssText = 'margin-top:.5rem;display:flex;gap:.5rem;flex-wrap:wrap';
  const note = document.createElement('div');
  note.style.cssText = 'color:#79828e;font-size:.85em;margin-top:.3rem';
  bar.append(say, row, note);
  document.body.appendChild(bar);
  document.body.style.paddingTop = '6rem';

  const show = (text, buttons, hint) => {
    say.textContent = text;
    note.textContent = hint || '';
    row.replaceChildren();
    for (const b of buttons || []) {
      const el = document.createElement('button');
      el.textContent = b[0];
      el.style.cssText = 'font:inherit;background:#1c2027;color:#d7dce2;border:1px solid #3a424e;' +
        'border-radius:3px;padding:.3rem .7rem;cursor:pointer';
      el.onclick = b[1];
      row.appendChild(el);
    }
  };

  const KEY_O = 'API.HTTPHeaders.Access-Control-Allow-Origin';
  const KEY_M = 'API.HTTPHeaders.Access-Control-Allow-Methods';
  const get = async (k) => (await (await fetch('/api/v0/config?arg=' + k, { method: 'POST' })).json()).Value;
  const set = (k, v) => fetch('/api/v0/config?arg=' + k + '&arg=' +
    encodeURIComponent(JSON.stringify(v)) + '&json=true', { method: 'POST' });
  const alive = async () => { try { return (await fetch('/api/v0/id', { method: 'POST' })).ok; } catch (e) { return false; } };

  // Merge, never replace: the daemon's existing entries are load-bearing for
  // its own web UI, and this field is written wholesale.
  async function install() {
    const have = (await get(KEY_O)) || [];
    for (const o of cfg.origins) if (have.indexOf(o) < 0) have.push(o);
    await set(KEY_O, have);
    await set(KEY_M, ['POST', 'OPTIONS']);
    await set('Pubsub.Enabled', true);
    // IPNS-over-pubsub can't rescue the FIRST load -- the app is already open by
    // the time this runs -- but flipping it on the restart we're about to ask
    // for anyway means IPNS resolves for every session after, so nobody has to
    // fall back to a CID next time. Not gated in verify(): it speeds delivery,
    // it is not required for the loaded app to reach its own daemon.
    await set('Ipns.UsePubsub', true);
  }

  async function verify() {
    const have = (await get(KEY_O)) || [];
    const methods = (await get(KEY_M)) || [];
    const missing = cfg.origins.filter((o) => have.indexOf(o) < 0);
    const ok = !missing.length && methods.indexOf('POST') >= 0 && (await get('Pubsub.Enabled')) === true;
    return { ok: ok, missing: missing };
  }

  let sawDown = false;
  let wasUp = true;
  let timer = null;

  function watch() {
    timer = setInterval(async () => {
      const now = await alive();
      if (wasUp && !now) { sawDown = true; show('IPFS is restarting. Waiting for it to come back…'); }
      if (!wasUp && now) { clearInterval(timer); resumed(); }
      wasUp = now;
    }, 1000);
  }

  async function resumed() {
    show('IPFS is back. Checking that the settings took…');
    const v = await verify();
    if (v.ok) return finish();
    show('IPFS settings did not change.', [['Retry', run]], 'still missing: ' + v.missing.join(', '));
  }

  function finish() {
    show('All set. Closing this tab…');
    setTimeout(() => {
      window.close();
      // Only reached if this tab was not script-opened, so the close was refused.
      show('All set — you can close this tab and go back to the test.');
    }, 800);
  }

  // A restart can be quicker than the poll, so a missed dip is not proof of an
  // unrestarted daemon. Check the config before declaring defeat.
  async function claimedRestart() {
    if (sawDown) return; // the watcher has this
    const v = await verify();
    if (v.ok) return finish();
    show('Have you restarted IPFS?', [
      ['Yes', async () => {
        const again = await verify();
        if (again.ok) return finish();
        show('Installation failed — contact the author.', [], 'still missing: ' + again.missing.join(', '));
      }],
      ['No', () => show('OK, please restart it and I will wait.',
        [['I have restarted it', claimedRestart]], 'tray icon → Restart')],
    ]);
  }

  async function run() {
    try {
      show('Installing settings…');
      await install();
      show('Settings installed. Now restart IPFS Desktop.',
        [['I have restarted it', claimedRestart]],
        'tray icon → Restart. I am watching, and will carry on by myself when it comes back.');
      watch();
    } catch (e) {
      show('Could not reach the daemon config API: ' + e.message, [['Retry', run]]);
    }
  }

  run();
}
