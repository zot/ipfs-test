# Sequence: Heal a dropped subscription

Covers requirements R16, R18.

The subscription's HTTP response never completes normally, so the stream
ending at all means something broke — the daemon restarted, or the connection
was cut. The one case that is not a fault is an abort the app itself
requested, which is why step 1.3 checks whether a leave is in progress before
reopening. Without that check, leaving a room would silently rejoin it.

```
1. Heal a dropped subscription

1.1. KuboClient -> Room        subscription stream ends or throws
1.2. Room -> App               status event: disconnected
1.3. Room                      stop if leave() aborted this subscription
1.4. Room                      wait the current backoff delay
1.5. Room -> KuboClient        subscribe(topic, onLine, abortSignal)
1.6. Room -> App               on success, reset backoff; status event: live
1.7. Room                      on failure, grow backoff up to its cap, wait again
```
