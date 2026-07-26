// CRC: crc-OnboardingView.md | R50, R51, R52, R53, R73, R75
//
// The only component that touches the DOM for the readiness gate. Like ChatView,
// it renders what it is told and reports the player's intent through callbacks.
// One step is shown at a time (R75, R53); the CORS step leads with the drag-and-
// click bookmarklet and hides the by-hand snippets behind a disclosure (R52); the
// permission step is a loud, primed control that previews the browser's own
// wording so the prompt is expected, not mistaken for notifications (R73).

import { httpHeadersSnippet, pubsubSnippet, bookmarkletHref } from './config-help.js';

const $ = (id) => document.getElementById(id);

export class OnboardingView {
  constructor({ origin = location.origin, apiBase = 'http://127.0.0.1:5001' } = {}) {
    this.handlers = {};
    this.el = {
      gate: $('gate'),
      setup: $('step-setup'), setupDone: $('setup-done'), collapseNote: $('setup-collapse-note'),
      cors: $('step-cors'), bmLink: $('gate-bm-link'), openConsole: $('gate-open-console'), corsDone: $('cors-done'),
      origin: $('gate-origin'), acao: $('gate-acao'), pubsub: $('gate-pubsub'), copyOrigin: $('gate-copy-origin'),
      perm: $('step-permission'), connect: $('connect-btn'), recovery: $('perm-recovery'),
    };

    this.el.setupDone.onclick = () => this.handlers.done?.('setup');
    this.el.corsDone.onclick = () => this.handlers.done?.('cors');
    // R72: the bookmarklet must run on the daemon's own console tab (its origin is
    // pre-allowlisted), so open that tab for the player; the link itself is drag-only.
    this.el.openConsole.onclick = () => window.open(`${apiBase}/webui/`, '_blank');
    this.el.bmLink.onclick = (e) => {
      e.preventDefault();
      alert('Drag "Fix IPFS CORS" up to your bookmarks bar, then click it on the IPFS console tab that opened.');
    };
    this.el.copyOrigin.onclick = () => navigator.clipboard?.writeText(origin);

    // R73: the loud, deliberate gesture. It summons the browser prompt (through the
    // wired probe) and then reports whether it ended denied, so the flow advances
    // or routes to recovery.
    this.el.connect.onclick = async () => {
      const denied = await this.handlers.connect?.();
      this.handlers.done?.('permission', { denied });
    };

    // R50, R51: the by-hand fallback, keyed to this page's own origin.
    this.el.origin.textContent = origin;
    this.el.acao.textContent = httpHeadersSnippet(origin);
    this.el.pubsub.textContent = pubsubSnippet();
    this.el.bmLink.href = bookmarkletHref(origin, apiBase);
  }

  on(event, fn) { this.handlers[event] = fn; }

  #show(which) {
    for (const k of ['setup', 'cors', 'perm']) this.el[k].hidden = k !== which;
    this.el.gate.hidden = false;
  }

  // CRC: crc-OnboardingView.md | R73, R75
  showStep(step, opts = {}) {
    if (step === 'setup') {
      this.el.collapseNote.hidden = !opts.collapse; // R69/R71: Firefox guides both at once
      this.#show('setup');
    } else if (step === 'cors') {
      this.#show('cors');
    } else if (step === 'permission') {
      // R74: a denied permission cannot be re-prompted -- show recovery, not the button.
      this.el.recovery.hidden = !opts.denied;
      this.el.connect.hidden = !!opts.denied;
      this.#show('perm');
    }
  }

  hide() { this.el.gate.hidden = true; }
}
