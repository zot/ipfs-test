# UI: Chat page

Covers requirements R1, R3, R9, R10, R14, R15, R16, R17.
References crc-ChatView.md.

One page, two states. Both states share the status bar, so daemon
connectivity is visible before joining as well as during a conversation.

## Join state

```
+--------------------------------------------------------------+
|  ipfs pubsub chat                    [*] daemon connected     |
|  node 12D3KooW...gRpjHZ                                       |
+--------------------------------------------------------------+
|                                                              |
|      nickname  [ bill                              ]         |
|      room      [ lobby                             ]         |
|                                                              |
|                                    [    join room    ]       |
|                                                              |
|      messages are public to everyone subscribed to the       |
|      room. nothing is stored; a refresh loses the chat.      |
|                                                              |
+--------------------------------------------------------------+
```

Both fields are prefilled from remembered preferences and both are required.
The standing note about publicity and impermanence sits here rather than in
the conversation, where it would be noise on every message.

## Conversation state

```
+--------------------------------------------------------------+
|  ipfs pubsub chat                    [*] connected - live     |
|  node 12D3KooW...gRpjHZ                                       |
+--------------------------------------------------------------+
|  room lobby            2 other nodes subscribed    [ leave ]  |
+--------------------------------------------------------------+
|                                                              |
|  bill  12D3KooW...gRpjHZ                            16:42:07  |
|  afternoon, daneel                                           |
|                                                              |
|                          16:42:19   daneel  12D3KooW...4tQm2  |
|                                            afternoon, bill   |
|                                                              |
|  bill  12D3KooW...gRpjHZ                            16:42:31  |
|  <b>not bold</b>                                             |
|                                                              |
+--------------------------------------------------------------+
|  [ type a message                              ] [  send  ]  |
+--------------------------------------------------------------+
```

Rows from this node align right, rows from other nodes align left — that is
the whole of the own-versus-other distinction, no colour required.

The peer ID sits next to every nickname, shortened head-and-tail, because the
nickname is freely chosen and unverified. Two people using "bill" are told
apart by the ID, which is the only attested part of the line.

The presence figure reads "N other nodes subscribed", never "N users": two
browser tabs on one daemon are one node, and an unqualified count would be
read as people.

The third row above shows escaping: text arriving with markup in it is
displayed as characters.

## Failure state

Covers R17, R50, R51, R52, R53.

```
+--------------------------------------------------------------+
|  ipfs pubsub probe                    [ ] daemon unreachable |
+--------------------------------------------------------------+
|  can't reach the kubo daemon at http://127.0.0.1:5001. the   |
|  usual cause is this page's origin isn't allowed to call it. |
|                                                              |
|  One-time fix - drag this to your bookmarks bar, then click  |
|  the bookmark:                                               |
|      [ Fix IPFS CORS ]                                       |
|  it opens your IPFS settings and walks you through the rest. |
|                                                              |
|  > Not working? Show every step, or configure by hand        |
+--------------------------------------------------------------+
```

The likely cause is named rather than left to the console, because a bare
"failed to fetch" is indistinguishable from a daemon that is not running. More
than named: the fix is generated and shown. The origin block is the page's own
`location.origin`, so it is exactly the string the daemon must allowlist for
*this* player — right gateway, right port — with a copy control so it need not
be retyped. Every generated value is set with `textContent`.

The quick path is a single line — drag the bookmarklet up, then click it —
and the bookmarklet narrates each remaining step as the player reaches it. The
full numbered sequence is kept, one action per step with the count stated
truthfully, but behind a "Not working?" disclosure, so it surfaces only when the
quick path doesn't. That honest sequence earned its place the hard way: an
earlier version called the fix "two steps" when it took five and buried the
pivotal one — click the bookmark on the other tab — in dim text beside a button,
and a player opened the daemon page and never clicked the bookmark. It is
retained for exactly that player; it is simply no longer the first thing
competing for the eye.

The marked step — step 3 in the full checklist behind the disclosure — is R53.
Opening the daemon page hands
focus to a different tab, so any instruction delivered as a modal is dismissed
and gone — that is the failure that was observed. A mark on the step survives
instead, and is still there whenever the player returns to this tab.

The by-hand alternative sits behind a disclosure. It is the fallback when the
bookmarklet cannot run — it works only on a page the API itself serves, and
IPFS Desktop's own menu opens the web UI on the gateway subdomain instead — so
it must stay reachable, but expanded it doubles the page and competes with the
path most players should take.

## Structure

Both states exist in `index.html` and are toggled by hidden attribute; only
message rows are created at runtime. Message text is set with `textContent`,
never `innerHTML` — see cross-cutting: untrusted input.
