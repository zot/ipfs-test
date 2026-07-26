// CRC: crc-OnboardingView.md | R50, R51, R52, R53, R73, R75, R77, R78
//
// The only component that touches the DOM for the readiness gate. Like ChatView,
// it renders what it is told and reports the player's intent through callbacks.
// One step is shown at a time (R75, R53); the CORS step leads with the drag-and-
// click bookmarklet and hides the by-hand snippets behind a disclosure (R52); the
// permission step is a loud, primed control that previews the browser's own
// wording so the prompt is expected, not mistaken for notifications (R73).
//
// The CORS step offers the bookmarklet and nothing else (R77). It used to carry
// its own "open IPFS console" button, which gave two ways forward -- and a player
// who pressed the button without having dragged the bookmark landed on a page
// with nothing to click. The bookmarklet opens that console itself, so being the
// only route makes the step un-skippable rather than merely tidy.

import { httpHeadersSnippet, pubsubSnippet, bookmarkletHref } from './config-help.js';

const $ = (id) => document.getElementById(id);

export class OnboardingView {
  constructor({ origin = location.origin, apiBase = 'http://127.0.0.1:5001' } = {}) {
    this.handlers = {};
    this.el = {
      gate: $('gate'),
      setup: $('step-setup'), setupDone: $('setup-done'), collapseNote: $('setup-collapse-note'),
      cors: $('step-cors'), bmLink: $('gate-bm-link'), bmHint: $('gate-bm-hint'), corsDone: $('cors-done'),
      origin: $('gate-origin'), acao: $('gate-acao'), pubsub: $('gate-pubsub'), copyOrigin: $('gate-copy-origin'),
      perm: $('step-permission'), connect: $('connect-btn'), recovery: $('perm-recovery'),
    };

    this.el.setupDone.onclick = () => this.handlers.done?.('setup');
    this.el.corsDone.onclick = () => this.handlers.done?.('cors');
    // R72, R77: the link is drag-only. Following it would run the procedure from
    // this page without leaving a bookmark behind to finish it on the console --
    // so the click is intercepted, and answered in the page rather than in a
    // dialog (R78).
    this.el.bmLink.onclick = (e) => {
      e.preventDefault();
      this.el.bmHint.hidden = false;
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

  // CRC: crc-OnboardingView.md | R85
  // The crank handle left a panel standing on this page on purpose (R80), for a
  // player who backed out of the console tab. By now it has finished and cannot
  // retract it -- the page it drew on was never its own -- so the app clears it.
  // Otherwise a connected session sits behind an instruction to do something
  // already done.
  hide() {
    this.el.gate.hidden = true;
    document.getElementById('ipfs-crank')?.remove();
    document.body.style.paddingTop = '';
  }
}
