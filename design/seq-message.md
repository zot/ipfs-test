# Sequence: Send and receive

Covers requirements R6, R7, R8, R10, R11, R12, R13, R24, R25, R27, R28, R30.

The two diagrams are one round trip, not two independent paths. A message
sent in diagram 1 arrives back through diagram 2 on this same node, because
the daemon delivers a node's own publishes to its own subscription. Nothing
in diagram 1 writes to the transcript; only step 2.9 does. That is the whole
reason a silent publish failure is visible.

```
1. Send a message

1.1. ChatView -> App           onSend(text)
1.2. ChatView                  clear the composer input immediately
1.3. App -> Room               send(text)
1.4. Room -> Envelope          create(nick, text) -> JSON with fresh id and timestamp
1.5. Room -> KuboClient        publish(topic, json)
1.6. KuboClient -> Multibase   encodeText(topic) -> u<base64url>
1.7. KuboClient -> daemon      POST /api/v0/pubsub/pub?arg=u<topic>, multipart body
1.8. Room -> App               on failure, raise; App restores text and shows error
```

```
2. Receive a message

2.1. daemon -> KuboClient      one NDJSON line on the open subscription
2.2. KuboClient                hold a partial trailing line until its remainder arrives
2.3. KuboClient -> Multibase   decodeToText(data) -> the published JSON
2.4. KuboClient -> Room        onLine({ from, text, seqno })
2.5. Room -> Envelope          parse(text); drop the message when null
2.6. Room                      drop when the envelope id is already seen, else record it
2.7. Room                      mine = (from equals selfPeerId)
2.8. Room -> App               message event
2.9. App -> ChatView           appendMessage via textContent, scroll to newest
```
