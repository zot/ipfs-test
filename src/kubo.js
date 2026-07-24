// CRC: crc-KuboClient.md | R20, R21, R23, R25, R26, R27, R28, R29, R35
//
// The only component that knows Kubo's RPC API exists. Above this boundary
// there are plain topic names and plain message text -- no base URL, no
// multibase, no multipart, no HTTP at all.
//
// R35: the seam. Anything implementing this shape can replace it:
//
//     selfId()                              -> Promise<string>
//     publish(topic, text)                  -> Promise<void>
//     subscribe(topic, {onMessage, onOpen, signal})
//                                           -> Promise<void>  (resolves at stream end)
//     peers(topic)                          -> Promise<string[]>
//
// A libp2p node running in the browser would satisfy the same shape without
// any daemon, allowlist, or HTTP. Room, ChatView and App are written against
// this list and nothing else.

import { encodeText, decodeToText } from './multibase.js';

export class KuboClient {
  // R21
  constructor(baseUrl = 'http://127.0.0.1:5001') {
    this.baseUrl = baseUrl;
  }

  // CRC: crc-KuboClient.md | R23
  // Every call is POST, including read-only ones -- a GET is answered 405.
  #url(path, args) {
    const u = new URL(`${this.baseUrl}/api/v0/${path}`);
    for (const a of args) u.searchParams.append('arg', a);
    return u;
  }

  async #post(path, args = [], init = {}) {
    const res = await fetch(this.#url(path, args), { method: 'POST', ...init });
    if (!res.ok) {
      throw new Error(`kubo ${path} failed: ${res.status} ${await res.text().catch(() => '')}`.trim());
    }
    return res;
  }

  // CRC: crc-KuboClient.md | Seq: seq-join.md#1.6 | R26
  // Doubles as the reachability probe: if this rejects, nothing else will work.
  async selfId() {
    const res = await this.#post('id');
    return (await res.json()).ID;
  }

  // CRC: crc-KuboClient.md | Seq: seq-message.md#1.7 | R28, R47
  // The payload is a multipart upload, not a raw body. Note that success here
  // means the daemon accepted the message, NOT that any peer received it --
  // with an unformed mesh this resolves cleanly and the message goes nowhere.
  async publish(topic, text) {
    const form = new FormData();
    form.append('file', new Blob([text], { type: 'application/octet-stream' }));
    await this.#post('pubsub/pub', [encodeText(topic)], { body: form });
  }

  // CRC: crc-KuboClient.md | Seq: seq-message.md#2.1 | R25, R27
  // The response never completes normally, so it is consumed as a stream of
  // newline-delimited JSON. Resolves only when the stream ends, which means
  // the subscription died -- Room treats that as a signal to reconnect.
  async subscribe(topic, { onMessage, onOpen, signal }) {
    const res = await this.#post('pubsub/sub', [encodeText(topic)], { signal });
    // Headers have arrived, so the daemon accepted the subscription. This is
    // the earliest honest moment to call the subscription live -- and it says
    // nothing yet about whether any peer is in the mesh.
    onOpen?.();
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      // Seq: seq-message.md#2.2 -- a message split across chunk boundaries must
      // not be dropped, so a partial trailing line stays buffered.
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        const msg = line && this.#decode(line);
        if (msg) onMessage(msg);
      }
    }
  }

  // Seq: seq-message.md#2.3
  #decode(line) {
    try {
      const o = JSON.parse(line);
      return { from: o.from, text: decodeToText(o.data), seqno: o.seqno };
    } catch {
      return null; // the daemon's own framing broke; skip the line, keep the stream
    }
  }

  // CRC: crc-KuboClient.md | Seq: seq-join.md#1.7 | R29
  async peers(topic) {
    const res = await this.#post('pubsub/peers', [encodeText(topic)]);
    return (await res.json()).Strings || [];
  }
}
