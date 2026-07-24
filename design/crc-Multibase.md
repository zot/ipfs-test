# Multibase
**Requirements:** R24, R25

Encodes and decodes the multibase strings Kubo's pubsub API requires. Pure
functions over strings and bytes; knows nothing of HTTP, topics, or chat.

Only the base64url-without-padding variant is implemented, whose multibase
prefix is `u`. That is the variant this app emits, and the variant Kubo emits
back for pubsub payloads, sequence numbers, and topic lists. Any other prefix
is a decoding error rather than a silent misread — a wrong guess about the
base would produce plausible garbage, which is worse than a failure.

## Knows
- prefix: the single character `u`, identifying base64url-nopad

## Does
- encodeText: text → multibase string, UTF-8 encoded then base64url, `u`-prefixed
- decodeToBytes: multibase string → bytes; throws if the prefix is not `u`
- decodeToText: multibase string → text, decoding the bytes as UTF-8

## Collaborators
- none

## Sequences
- seq-message.md
