# Sequence: Join a room

Covers requirements R2, R4, R5, R14.

Leaving before joining (step 1.3) is what makes room switching work without a
page reload: the old subscription is aborted, which is what unsubscribes at
the daemon, before a new one is opened.

```
1. Join a room

1.1. ChatView -> App           onJoin(nick, room)
1.2. App -> localStorage       persist nick and room as preferences
1.3. App -> Room               leave() — aborts any subscription already open
1.4. App -> Room               join(room)
1.5. Room -> KuboClient        subscribe(topic, onLine, abortSignal)
1.6. KuboClient -> daemon      POST /api/v0/pubsub/sub?arg=u<topic>
1.7. Room -> KuboClient        peers(topic), then repeatedly on an interval
1.8. Room -> App               status event: subscription live
1.9. App -> ChatView           showConversation()
```
