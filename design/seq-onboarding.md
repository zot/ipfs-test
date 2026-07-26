# Sequence: Guided onboarding to ready

Covers R64, R70, R71, R72, R74, R75.

localStorage says what the player did before, but the daemon decides. The gate
walks the fixes in order — install and run precede the permission step, whose
prompt needs a live daemon — checkpointing each so an interruption resumes.

```
1. Reach ready

1.1. GithubApp -> Onboarding        begin(role, room)
1.2. Onboarding -> localStorage     read prior progress (expectation, fast-path)
1.3. Onboarding -> Readiness        probe()
1.4. Readiness -> Onboarding        diagnosis
1.5. Onboarding -> OnboardingView   show the step for the unmet condition, marked current
1.6. Onboarding -> OnboardingView   cors step: open the daemon console, present the ConfigHelp bookmarklet to drag and click there
1.7. Onboarding -> OnboardingView   permission step: the loud primed control; on denied, the site-settings recovery
1.8. OnboardingView -> Onboarding   the player's attestation for a step
1.9. Onboarding -> localStorage     checkpoint the completed step
1.10. Onboarding -> Readiness       re-probe; verify against the daemon where the step's result can be checked
1.11. Onboarding -> GithubApp       ready -> proceed to the room
```
