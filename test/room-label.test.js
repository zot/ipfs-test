// CRC: test-RoomLabel.md | R88, R89, R91
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify, suggestLabel } from '../src/room-label.js';

// A stub crypto that hands back values we choose, so word selection is checkable
// rather than merely plausible.
const fixedCrypto = (...values) => {
  let i = 0;
  return { getRandomValues: (arr) => { arr[0] = values[i++ % values.length]; return arr; } };
};

// R91: without the NFD fold, `café` slugs to `caf-`, which reads as a bug rather
// than a name -- and is exactly the sort of thing nobody notices until a player
// asks why their room is called that.
test('folds diacritics instead of replacing them', () => {
  assert.equal(slugify('  Café du Monde!! '), 'cafe-du-monde');
});

// R91: Session reads the empty string as "no label" and mints a bare random
// name. A hyphen or a stub returned here would produce a malformed room.
test('an unusable label yields the empty string', () => {
  for (const input of ['!!!', '', '   ', null, undefined]) {
    assert.equal(slugify(input), '', `for ${JSON.stringify(input)}`);
  }
});

// R91: the cap is applied after collapsing, so it can cut mid-run and strand a
// trailing hyphen. That is why the trim runs twice rather than once.
test('the length cap never leaves a dangling hyphen', () => {
  const slug = slugify('abcd efgh ijkl mnop qrst uvwx', 15);
  assert.ok(slug.length <= 15, `too long: ${slug}`);
  assert.doesNotMatch(slug, /^-|-$/, `dangling hyphen: ${slug}`);
});

// R89: the pre-filled name must itself be a valid label, or the very first room
// a host is offered would need slugifying before it could be used.
test('a suggested label survives slugify unchanged', () => {
  for (let i = 0; i < 50; i++) {
    const label = suggestLabel({ crypto: fixedCrypto(i * 7 + 1, i * 13 + 5) });
    assert.match(label, /^[a-z0-9]+-[a-z0-9]+$/, label);
    assert.equal(slugify(label), label, label);
  }
});

// R89: drawn from the injected source, so this flow holds one random source and
// not two -- the second being one someone could reach for by mistake for the
// half that actually matters.
test('suggestion draws from the injected crypto source', () => {
  const a = suggestLabel({ crypto: fixedCrypto(0, 0) });
  const b = suggestLabel({ crypto: fixedCrypto(0, 0) });
  assert.equal(a, b, 'same source values must give the same label');
  assert.notEqual(a, suggestLabel({ crypto: fixedCrypto(1, 1) }));
});
