// CRC: crc-App.md | R54
//
// Watches for the daemon becoming reachable, so the failure screen heals itself.
//
// The fix always happens somewhere else -- a settings editor in another tab, a
// tray-icon restart -- so the moment it lands is precisely the moment the player
// is not looking at this page. Polling means they come back to a working app
// rather than to a button they have to notice and press.
//
// The timer functions are injected so this is testable without real time passing.
export function watchForDaemon(probe, opts = {}) {
  const { intervalMs = 3000, setTimer = setInterval, clearTimer = clearInterval } = opts;
  let id = null;

  const stop = () => {
    if (id !== null) { clearTimer(id); id = null; }
  };

  return {
    // R54: a failing probe is the expected case, not an error -- the daemon is
    // unreachable, which is why we are watching at all. Keep waiting quietly.
    start(onReachable) {
      stop(); // never leave a second timer running behind the first
      id = setTimer(async () => {
        try { await probe(); } catch { return; }
        stop();
        onReachable();
      }, intervalMs);
    },
    stop,
    get running() { return id !== null; },
  };
}
