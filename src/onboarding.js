// CRC: crc-Onboarding.md | Seq: seq-onboarding.md#1.1 | R54, R64, R70, R71, R72, R74, R75
//
// Walks a player to a ready daemon, re-probing after every step so the daemon --
// not the stored expectation -- is the arbiter. It holds the flow; Readiness
// decides what is wrong, OnboardingView renders it and supplies the bookmarklet.

const STORE_KEY = 'ipfs-console-onboarding';

// R75: the diagnosis maps to the step to show. daemon-down and the Firefox
// collapse both route to `setup` (install + run + pubsub) first, because the
// permission prompt cannot fire until the daemon is live -- so the permission
// step is never reached while the daemon is unconfirmed.
const STEP_FOR = {
  ready: 'ready',
  'daemon-down': 'setup',
  'permission-or-daemon': 'setup',
  cors: 'cors',
  permission: 'permission',
};

export class Onboarding {
  constructor({ readiness, view, store, onReady }) {
    this.readiness = readiness;
    this.view = view;
    this.store = store;
    this.onReady = onReady;
  }

  // CRC: crc-Onboarding.md | Seq: seq-onboarding.md#1.1 | R64
  async begin(role, room) {
    this.role = role;
    this.room = room;
    // R54, R76: a grant flipped in site-settings or a daemon restart re-advances
    // the flow without the player pressing anything.
    this.readiness.watch?.(() => this.#advance());
    await this.#advance();
  }

  // CRC: crc-Onboarding.md | Seq: seq-onboarding.md#1.3 | R70, R71, R72, R74, R75
  async #advance() {
    const { state } = await this.readiness.probe(); // R70: the daemon is the arbiter
    const step = STEP_FOR[state] ?? 'setup';
    if (step === 'ready') { this.onReady(this.role, this.room); return; } // R64
    this.view.showStep(step, {
      role: this.role,
      // R71/R69: on Firefox the two cases collapse, so the setup step guides both.
      collapse: state === 'permission-or-daemon',
      // R74: a permission denied before means the browser will not re-ask, so
      // route to the site-settings recovery rather than summoning the prompt.
      denied: step === 'permission' && this.#progress().permissionDenied === true,
    });
  }

  // CRC: crc-Onboarding.md | Seq: seq-onboarding.md#1.8 | R70, R74
  // The view reports a completed step (the CORS bookmarklet clicked per R72, the
  // permission answered). Every completion re-probes, so the daemon confirms it.
  async done(step, info = {}) {
    if (step === 'permission') this.#mark('permissionDenied', !!info.denied);
    await this.#advance();
  }

  #progress() {
    try { return JSON.parse(this.store.getItem(STORE_KEY)) || {}; } catch { return {}; }
  }
  #mark(key, value) {
    const p = this.#progress();
    p[key] = value;
    try { this.store.setItem(STORE_KEY, JSON.stringify(p)); } catch { /* private mode */ }
  }
}
