// CRC: crc-Readiness.md | Seq: seq-readiness.md#1.1 | R65, R66, R67, R68, R69, R76
//
// The detection engine. A plain fetch failure is opaque -- identical whether the
// daemon is down, the origin is un-allowlisted, or the permission is denied --
// so a no-cors probe runs alongside the CORS fetch: it reaches a live daemon
// even without a CORS grant, but only when the browser permission lets the
// request out. That splits the cases the CORS fetch cannot. On Chrome the
// permission state is readable and finishes the job; on Firefox it is nominal
// and two cases collapse (measured on both, 2026-07-24).
//
// The three inputs are injected as thin async adapters so the whole truth table
// tests with fakes -- no daemon, no browser. GithubApp builds them over
// KuboClient and the Permissions API; the browser-branch (which permission
// descriptor is authoritative) lives in that adapter, not here.

// R65: the four conditions the diagnosis ultimately distinguishes between.
export const CONDITIONS = ['ipfs-running', 'pubsub', 'cors', 'permission'];

export class Readiness {
  constructor({ corsProbe, noCorsProbe, permission }) {
    this.corsProbe = corsProbe;     // () => resolves (reachable + allowed) | throws
    this.noCorsProbe = noCorsProbe; // () => true (reached a live daemon) | throws
    this.permission = permission;   // { query() -> state, onChange(cb) }
  }

  // CRC: crc-Readiness.md | Seq: seq-readiness.md#1.4 | R66, R67
  // Deliberate: nothing here runs until probe() is called -- never on import or
  // construction, so the browser's permission prompt is never summoned cold.
  async probe() {
    try {
      await this.corsProbe();
      return { state: 'ready' };
    } catch {
      // Opaque failure -- fall through to the no-cors split rather than guess.
    }
    let reached = false;
    try { reached = await this.noCorsProbe(); } catch { /* unreachable: leave reached false */ }
    if (reached) return { state: 'cors' }; // daemon up + permitted, origin not allowlisted
    return this.#attribute();              // needs-attention: permission or daemon-down
  }

  // CRC: crc-Readiness.md | Seq: seq-readiness.md#1.6 | R68, R69
  // The adapter returns the authoritative permission state where the browser
  // gives one (Chrome), or 'nominal'/'unavailable' where it does not (Firefox).
  async #attribute() {
    const state = await this.permission.query();
    if (state === 'granted') return { state: 'daemon-down' };      // R68
    if (state === 'denied' || state === 'prompt') return { state: 'permission' }; // R68
    return { state: 'permission-or-daemon' };                      // R69: Firefox collapse
  }

  // CRC: crc-Readiness.md | Seq: seq-readiness.md#2.1 | R76
  // A grant applied in site-settings or a daemon restart advances the flow
  // without a button, where the browser exposes a change event.
  watch(onChange) {
    this.permission.onChange?.(() => onChange());
  }
}
