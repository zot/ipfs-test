# Onboarding
**Requirements:** R54, R64, R70, R71, R72, R74, R75

Walks a player from wherever they are to a ready daemon, in order, checkpointing
each step so an interruption resumes rather than restarts. It holds the flow
state; Readiness decides what is wrong, OnboardingView renders it, ConfigHelp
supplies the bookmarklet.

localStorage records prior progress as expectation and fast-path, but the daemon
is the arbiter — every claimed step is re-probed, and one that can be checked
against the daemon is checked rather than merely trusted (R70). The two grants —
daemon-side CORS and browser-side permission — are presented as distinct steps
and never conflated (R71). The order is fixed: install and run precede the
permission step, because its prompt cannot appear without a live daemon (R75).

## Knows
- progress: which steps are done, mirrored to localStorage for resume (R70)
- role and room: passed to the room once ready (from Session)

## Does
- begin: read prior progress, probe, and show the step for the first unmet
  condition (R64)
- cors step: open the daemon's own console page and present the ConfigHelp
  bookmarklet to drag and click there — never the app page (R72); the by-hand
  fallback and its background re-probe are R50–R54 (R54)
- permission step: drive the loud primed control; on denied, switch to the
  site-settings recovery and, on Chrome, advance on the permission's change
  event (R74)
- checkpoint: record each completed step and re-probe after it (R70, R75)
- ordering: enforce install-and-run before the permission step (R75)

## Collaborators
- Readiness: asked what is unmet, after every step
- OnboardingView: told what to render; reports the player's attestations
- ConfigHelp: supplies the bookmarklet and the by-hand snippets
- GithubApp: told when ready, with role and room

## Sequences
- seq-onboarding.md
