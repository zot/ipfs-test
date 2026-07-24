// CRC: crc-Multibase.md | Seq: seq-message.md#1.6 | R24, R25
//
// Kubo's pubsub API refuses a plain topic string ("URL arg must be multibase
// encoded"), so topics go out encoded and payloads come back encoded. Only
// base64url-without-padding is implemented; its multibase prefix is `u`.

const PREFIX = 'u';

// R24
export function encodeText(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return PREFIX + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// R25
// Any prefix other than `u` is an error rather than a guess: decoding with the
// wrong base yields plausible garbage, which is worse than a clean failure.
export function decodeToBytes(str) {
  if (typeof str !== 'string' || str[0] !== PREFIX) {
    throw new Error(`unsupported multibase prefix: ${JSON.stringify(String(str).slice(0, 1))}`);
  }
  const b64 = str.slice(1).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

// R25
// Non-fatal decoding: another program may publish arbitrary bytes to a public
// topic, and that must yield replacement characters for Envelope to reject,
// not an exception that kills the subscription.
export function decodeToText(str) {
  return new TextDecoder().decode(decodeToBytes(str));
}
