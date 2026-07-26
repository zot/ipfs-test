// CRC: crc-RoomLabel.md | R88, R89, R91
//
// A room's name is `<label>-<random>`. The random half is the capability; this
// module owns the other half, which exists purely so a human can tell one room
// from another. Several bare hex names in a chat history are indistinguishable,
// and that is the whole problem being solved here -- nothing in this file is
// ever trusted, and no security rests on it.
//
// Adjective-noun rather than two nouns: "quiet-harbor" reads as a name, while
// "harbor-otter" reads as a typo. The lists are short on purpose. Entropy is not
// their job, so the only things that matter are that the words are pronounceable
// aloud, hard to misspell, and inoffensive -- these end up in URLs people paste
// to their friends.

const ADJECTIVES = [
  'amber', 'ancient', 'autumn', 'azure', 'blazing', 'bold', 'brave', 'bright',
  'bronze', 'calm', 'candid', 'cheerful', 'clever', 'cobalt', 'cosmic', 'crimson',
  'crystal', 'curious', 'daring', 'deep', 'distant', 'dusty', 'eager', 'early',
  'eastern', 'elder', 'endless', 'fabled', 'faithful', 'fearless', 'fleeting',
  'floating', 'frosted', 'gallant', 'gentle', 'gilded', 'glacial', 'gleaming',
  'golden', 'grand', 'hallowed', 'hidden', 'honest', 'humble', 'ivory', 'jade',
  'jolly', 'keen', 'kindly', 'lively', 'lofty', 'lucid', 'lunar', 'marble',
  'merry', 'midnight', 'mighty', 'misty', 'modest', 'mossy', 'muted', 'noble',
  'northern', 'olive', 'patient', 'polar', 'proud', 'quiet', 'radiant', 'rapid',
  'restless', 'rising', 'roaming', 'rugged', 'rustic', 'sapphire', 'scarlet',
  'secret', 'serene', 'sheltered', 'silent', 'silver', 'slender', 'solar',
  'solemn', 'southern', 'spirited', 'stalwart', 'steady', 'stormy', 'sunlit',
  'swift', 'tawny', 'tender', 'thriving', 'tidal', 'tranquil', 'twilight',
  'valiant', 'velvet', 'verdant', 'vivid', 'wandering', 'warm', 'western',
  'whispering', 'wild', 'winter', 'wistful', 'woven', 'zealous',
];

const NOUNS = [
  'acorn', 'anchor', 'arbor', 'arrow', 'badger', 'basin', 'beacon', 'bison',
  'bramble', 'bridge', 'brook', 'canyon', 'cavern', 'cedar', 'chapel', 'cinder',
  'cliff', 'comet', 'compass', 'coral', 'cottage', 'creek', 'crown', 'dagger',
  'delta', 'dune', 'eagle', 'ember', 'falcon', 'fathom', 'fern', 'ferry',
  'finch', 'forge', 'fountain', 'garden', 'glacier', 'glade', 'gorge', 'grove',
  'harbor', 'harvest', 'hawk', 'headland', 'hearth', 'heron', 'hollow',
  'horizon', 'island', 'ivy', 'kestrel', 'lagoon', 'lantern', 'ledge',
  'lighthouse', 'lily', 'lodge', 'lookout', 'lynx', 'mantle', 'marsh', 'meadow',
  'mesa', 'mill', 'moor', 'mountain', 'nettle', 'oak', 'orchard', 'osprey',
  'otter', 'outpost', 'panther', 'pasture', 'pebble', 'pine', 'plateau', 'pond',
  'quarry', 'quill', 'quiver', 'rapids', 'raven', 'reef', 'ridge', 'river',
  'sanctum', 'sentinel', 'shale', 'shore', 'sparrow', 'spire', 'spring',
  'stable', 'station', 'summit', 'tavern', 'thicket', 'thorn', 'tide', 'timber',
  'torrent', 'tower', 'trail', 'tundra', 'valley', 'vault', 'vessel', 'village',
  'vine', 'warren', 'waterfall', 'willow', 'woodland',
];

// R91: the label ends up in a URL and in a pubsub topic, so it is reduced to
// something safe for both rather than trusted as typed. Diacritics are folded
// rather than replaced, so a host typing "café" gets `cafe` and not `caf-`.
// The trailing trim runs twice on purpose: the length cap can itself leave a
// hyphen dangling at the cut.
export function slugify(text, max = 24) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // combining marks left by NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
}

// R89: what the field arrives pre-filled with. Drawn from the same crypto source
// as the room itself -- not because this needs to be unguessable, but because
// reaching for Math.random here would leave two random sources in one flow and
// invite someone to use the wrong one for the half that matters.
export function suggestLabel({ crypto = globalThis.crypto } = {}) {
  const pick = (list) => {
    const n = new Uint32Array(1);
    crypto.getRandomValues(n);
    return list[n[0] % list.length];
  };
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}`;
}
