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

  // A button may be withheld: [label, handler, delayMs]. It fades in rather than
  // popping, so the delay reads as deliberate instead of broken.
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
      if (b[2]) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        el.style.transition = 'opacity 1.5s';
        setTimeout(() => { el.style.opacity = '1'; el.style.pointerEvents = 'auto'; }, b[2]);
      }
      row.appendChild(el);
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
    const warnThenOpen = () => show(
      'When the console opens, click "Fix IPFS CORS" again — on that page.',
      [['OK', openConsole, 10000]],
      'Nothing here can reach you once it is open, so this is the last thing I can tell you.');

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
    // A restart was observed and the settings are in place -- as much as can be
    // known from this side. Whether the app can now reach the daemon is the
    // app's own cross-origin probe to answer (R82), so hand off rather than
    // declare success.
    show('Restarted, and the settings are in place. Closing this tab…');
    setTimeout(() => {
      window.close();
      // Only reached if this tab was not script-opened, so the close was refused.
      show('Done — close this tab and go back to the test; it will connect on its own.');
    }, 800);
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
