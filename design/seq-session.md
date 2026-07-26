# Sequence: Arrive and share

Covers R59, R60, R61, R62.

The URL is the session's identity. A host mints a room and the address bar
becomes the invite; a guest's room rides in the URL, retained across onboarding
because the page is never navigated away from.

```
1. Host starts a session

1.1. GithubApp -> Session      read() — no ?room -> host
1.2. GithubApp -> Session      start() — mint a random ~128-bit room
1.3. Session -> history        rewrite the address bar to ?room=<name>
1.4. Session -> GithubApp      inviteUrl() — the on-screen URL, ready to share
```

```
2. Guest arrives

2.1. GithubApp -> Session      read() — ?room=<name> -> guest bound for <name>
2.2. GithubApp -> Onboarding   begin(guest, room) — room held in the URL across the detour
2.3. Onboarding -> GithubApp   ready
2.4. GithubApp -> Session      read() — room still in the URL, unchanged
2.5. GithubApp -> Room         join(room) — land in the intended room
```
