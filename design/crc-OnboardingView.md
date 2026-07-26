# OnboardingView
**Requirements:** R50, R51, R52, R53, R73, R75

The only component that touches the DOM for the readiness gate. Like ChatView,
it renders values handed to it and reports the player's intent through
callbacks; it knows nothing of Kubo, permissions, or the flow's order.

The gate is a sequence of single actions, one shown at a time, and one step can
be marked as the current one so a player who left the tab to carry a step out
sees where they stopped on return (R53). Two moments need care: the CORS step
leads with the drag-and-click bookmarklet, with the honest full checklist and
the by-hand snippets behind a disclosure (R52, R50, R51); and the permission
step is a loud, primed control whose label warns — before the browser's prompt
appears — that the browser is about to ask to reach the player's own IPFS node,
not to send notifications (R73).

## Knows
- elements: the step list, the bookmarklet panel, the by-hand snippets, the loud
  permission control, the recovery pointer
- current step: which one carries the mark (R53)

## Does
- showStep: reveal the step for the unmet condition, marking it current (R53, R75)
- showBookmarklet: render the ConfigHelp bookmarklet to drag, plus the disclosed
  checklist and origin-keyed by-hand snippets with a copy control (R50, R51, R52)
- showPermission: render the loud primed control and its warning; on denied,
  render the site-settings recovery pointer (R73)
- report: hand the player's attestations ("installed", "pubsub on", "done") back
  through callbacks

## Collaborators
- none — receives plain values, returns intent through callbacks (driven by
  Onboarding)

## Sequences
- seq-onboarding.md
