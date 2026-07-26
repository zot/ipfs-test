// CRC: crc-ConfigHelp.md | R55, R72, R77-R83
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
//
// The window rules this walks through were measured, not assumed (2026-07-26,
// specs/onboarding.md): one gesture buys exactly one window, no window may open
// anything on another's behalf, and a window a page opens cannot raise itself.
// That is why every transition below is one human click, and why the panel is
// drawn into the page instead of being a window of its own.
export function crankHandle(cfg) {
  // 127.0.0.1, localhost and ::1 are one daemon to us but three different
  // origins to the browser, and the settings page is reachable by any of them.
  // Recognise all three at the API's own port, or a settings page opened (or
  // refreshed) as localhost:5001 is mistaken for a stranger and the whole
  // procedure dead-ends.
  const onApi = () => {
    try {
      const here = new URL(location.origin), api = new URL(cfg.api);
      const loopback = (h) => h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]';
      return here.protocol === api.protocol && here.port === api.port && loopback(here.hostname);
    } catch { return location.origin === cfg.api; }
  };

  if (document.getElementById('ipfs-crank')) return; // already cranking, either phase

  // R78: the panel, drawn into whichever page this was clicked on. Never a modal
  // dialog -- one standing between the click and the tab that click is meant to
  // open can outlast the click's authority to open one.
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

  // A button may be withheld: [label, handler, delaySeconds]. R79: it is disabled
  // against a visible countdown rather than merely appearing late -- a control
  // that is simply slow reads as broken, while one that is visibly counting reads
  // as deliberate, which is the whole point of the pause. Labels here carry
  // sentences, not verbs, so they wrap and align left instead of centring.
  const show = (text, buttons, hint) => {
    say.textContent = text;
    note.textContent = hint || '';
    row.replaceChildren();
    for (const b of buttons || []) {
      const el = document.createElement('button');
      el.textContent = b[0];
      el.style.cssText = 'font:inherit;background:#1c2027;color:#d7dce2;border:1px solid #3a424e;' +
        'border-radius:3px;padding:.4rem .8rem;cursor:pointer;text-align:left;white-space:normal;max-width:42rem';
      el.onclick = b[1];
      row.appendChild(el);
      if (!b[2]) continue;

      let left = b[2];
      el.disabled = true;
      el.style.opacity = '.45';
      el.style.cursor = 'default';
      const tick = document.createElement('span');
      tick.style.cssText = 'align-self:center;color:#79828e;font-variant-numeric:tabular-nums';
      tick.textContent = left + 's';
      row.appendChild(tick);
      const id = setInterval(() => {
        left -= 1;
        if (left > 0) { tick.textContent = left + 's'; return; }
        clearInterval(id);
        tick.remove();
        el.disabled = false;
        el.style.opacity = '1';
        el.style.cursor = 'pointer';
      }, 1000);
    }
  };

  // ---- Phase 1: anywhere but the daemon's own page ------------------------
  // Nothing here can reach the config API, so the only useful act is to get the
  // player onto a page that can. This is the only thing that opens that page
  // (R77): a second route would let someone arrive there with no bookmark to
  // click and nothing telling them what was expected.

  if (!onApi()) {
    // R79: the console tab is the end of the line for anything we can say. Once
    // it is open the console is the daemon's own page, this one is behind it,
    // and a window a page opens cannot raise itself -- all measured. So the
    // instruction goes before the opening, and its acknowledgement is withheld
    // long enough to be read rather than clicked past.
    // The instruction lives in the button, not beside it (R79): a player aiming
    // at a control does not read the prose around it, so the one string they
    // cannot skip is the one they are aiming at. First person on purpose -- it
    // is a commitment rather than a dismissal.
    const warnThenOpen = () => show(
      'Your IPFS console is about to open in a new tab.',
      [['I’m ready — I’ll click "Fix IPFS CORS" again when the console opens', openConsole, 5]],
      'Nothing here can reach you once it opens, so this is the last thing I can tell you.');

    function openConsole() {
      // Not 'noopener': the tab must stay script-opened so it can close itself.
      const w = window.open(cfg.api + '/webui/', '_blank');
      if (!w) {
        // R81: a refused tab is named rather than failing silently.
        show('Your browser blocked the new tab.', [['try again', openConsole]],
          'Allow pop-ups for this page, or open ' + cfg.api + '/webui/ yourself and click the bookmark there.');
        return;
      }
      // R80: left standing, for a player who backs out to the tab they came from.
      show('Waiting. Click "Fix IPFS CORS" on the IPFS console tab.');
    }

    show('This bookmark does its work on your node’s own console page.',
      [['open my IPFS console', warnThenOpen]]);
    return;
  }

  // ---- Phase 2: on the daemon's page, where the config API is same-origin --

  const KEY_O = 'API.HTTPHeaders.Access-Control-Allow-Origin';
  const KEY_M = 'API.HTTPHeaders.Access-Control-Allow-Methods';
  const get = async (k) => (await (await fetch('/api/v0/config?arg=' + k, { method: 'POST' })).json()).Value;
  const set = (k, v) => fetch('/api/v0/config?arg=' + k + '&arg=' +
    encodeURIComponent(JSON.stringify(v)) + '&json=true', { method: 'POST' });
  const alive = async () => { try { return (await fetch('/api/v0/id', { method: 'POST' })).ok; } catch (e) { return false; } };

  // R55: merge, never replace -- the daemon's existing entries are load-bearing
  // for its own web UI, and this field is written wholesale.
  async function install() {
    const have = (await get(KEY_O)) || [];
    for (const o of cfg.origins) if (have.indexOf(o) < 0) have.push(o);
    await set(KEY_O, have);
    await set(KEY_M, ['POST', 'OPTIONS']);
    await set('Pubsub.Enabled', true);
    await set('Ipns.UsePubsub', true);
  }

  // R82: this confirms the WRITE and nothing more. Kubo's config API serves
  // stored configuration, while the CORS headers it governs are applied when the
  // daemon starts -- so it reads back the same whether or not a restart has
  // happened, and no caller may treat a clean result as evidence that one did.
  async function saved() {
    const have = (await get(KEY_O)) || [];
    const methods = (await get(KEY_M)) || [];
    const missing = cfg.origins.filter((o) => have.indexOf(o) < 0);
    const ok = !missing.length && methods.indexOf('POST') >= 0 && (await get('Pubsub.Enabled')) === true;
    return { ok: ok, missing: missing };
  }

  let sawDown = false;
  let wasUp = true;
  let timer = null;

  // The one honest restart detector: the daemon actually going away and coming
  // back. Everything else is inference.
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
    const v = await saved();
    if (!v.ok) {
      show('IPFS settings did not change.', [['Retry', run]], 'still missing: ' + v.missing.join(', '));
      return;
    }
    handOff();
  }

  // R84: a restart was observed and the settings are in place -- but `alive()`
  // answers as soon as the HTTP API is listening, which is well before the node
  // has finished starting, so this page has not earned the right to declare the
  // job done. The page that opened this tab probes cross-origin, which is the
  // one check that exercises what was actually fixed (R82). Ask it, and close
  // only when it answers.
  function handOff() {
    let settled = false;
    if (!window.opener || window.opener.closed) {
      show('Settings saved and IPFS restarted. Go back to the test tab — it will connect on its own.');
      return;
    }
    show('Settings saved. Waiting for the test page to connect…');
    addEventListener('message', (e) => {
      if (e.origin !== cfg.app || e.data !== 'ipfs-crank:connected' || settled) return;
      settled = true;
      show('Connected. Closing this tab…');
      setTimeout(() => {
        window.close();
        // Only reached if this tab was not script-opened, so the close was refused.
        show('Done — close this tab and go back to the test.');
      }, 600);
    });
    window.opener.postMessage('ipfs-crank:saved', cfg.app);
    // Never wait silently for ever: a restart can take longer than this, but a
    // player staring at an unchanging line deserves to be told what to check.
    setTimeout(() => {
      if (settled) return;
      show('Settings saved, but the test page has not connected yet.', [],
        'Go back to that tab and see what it says. IPFS can take a while to finish starting.');
    }, 30000);
  }

  // R82: a restart quicker than the poll leaves no dip to see -- but the config
  // cannot settle the question either, since it reads back the same either way.
  // So this says what is known instead of guessing, and leaves the watcher
  // running, which can still catch a restart that has not happened yet.
  async function claimedRestart() {
    if (sawDown) return; // the watcher has this, and it has real evidence
    const v = await saved();
    if (!v.ok) {
      show('The settings are not in place.', [['Retry', run]], 'still missing: ' + v.missing.join(', '));
      return;
    }
    show('Settings saved — but I did not see IPFS restart, and I cannot tell from here.',
      [['I have restarted it', claimedRestart]],
      'If it is already restarted, go back to the test tab; it will connect on its own. I am still watching.');
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
