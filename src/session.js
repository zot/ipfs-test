// CRC: crc-Session.md | Seq: seq-session.md#1.1 | R59, R60, R61, R62
//
// The URL is the session's identity. No ?room -> host; ?room=<name> -> guest.
// A host mints a random room and rewrites the address bar so the page you are on
// becomes the invite. A guest's room rides in the URL untouched, so it survives
// the onboarding detour for free -- the URL is only read, never navigated away.

// R59: the room name IS the capability -- the pubsub topic is public, so the
// name is the only thing between a session and a stranger. 128 bits from the
// platform crypto source, never a counter or a timestamp.
const ROOM_BYTES = 16;

export class Session {
  // location/history/crypto are injected so the logic tests without a browser.
  constructor({ location = window.location, history = window.history, crypto = window.crypto } = {}) {
    this.location = location;
    this.history = history;
    this.crypto = crypto;
    this.role = 'host';
    this.room = null;
  }

  // CRC: crc-Session.md | Seq: seq-session.md#2.1 | R61, R62
  // A guest's room is read straight from the URL, which never changes during
  // onboarding, so re-reading after the detour yields the same room (R62).
  read() {
    const room = new URLSearchParams(this.location.search).get('room');
    this.role = room ? 'guest' : 'host';
    this.room = room || null;
    return { role: this.role, room: this.room };
  }

  // CRC: crc-Session.md | Seq: seq-session.md#1.2 | R59
  mint() {
    const bytes = new Uint8Array(ROOM_BYTES);
    this.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  // CRC: crc-Session.md | Seq: seq-session.md#1.3 | R60
  // Rewrites the address bar in place, so the page you are on becomes the link.
  start() {
    this.room = this.mint();
    const url = new URL(this.location.href);
    url.searchParams.set('room', this.room);
    this.history.replaceState(null, '', url.toString());
    return this.room;
  }

  // R60: what a host shares -- the on-screen URL, room included. Built from the
  // known room rather than trusting location to reflect the history rewrite.
  inviteUrl() {
    const url = new URL(this.location.href);
    if (this.room) url.searchParams.set('room', this.room);
    return url.toString();
  }
}
