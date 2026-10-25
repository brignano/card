// Single source of truth for everything the card, vCard, QR and live modules need.
// Plain (uncolored) values live here; chalk styling is applied at render time.

export const profile = {
  firstName: 'Anthony',
  lastName: 'Brignano',
  fullName: 'Anthony Brignano',
  handle: '@brignano',
  username: 'brignano',
  title: 'Senior Staff Software Engineer',
  org: 'The Hartford',
  email: 'hi@brignano.io',
  website: 'https://brignano.io',
  resume: 'https://brignano.io/resume',
  github: 'https://github.com/brignano',
  linkedin: 'https://linkedin.com/in/brignano',
} as const;

// A list the compiler knows has at least one element, so `pick` can never be
// handed something it has no safe answer for.
export type NonEmpty<T> = readonly [T, ...T[]];

// Rotating taglines — one is picked per run so repeat visitors see variety.
export const taglines: NonEmpty<string> = [
  'My inbox is always open. Ask a question or just say hi — I read everything.',
  'Building reliable systems, mentoring engineers, and shipping things that last.',
  "If it's worth automating, it's worth a clean abstraction. Let's build.",
  'Self-hoster, spec-driven, and unreasonably fond of a tidy terminal.',
  'Good engineering is mostly good taste applied consistently. Say hello.',
];

// Small easter-egg facts, shown below the card.
export const funFacts: NonEmpty<string> = [
  'This card is open source — `npx brignano --help` shows every trick.',
  'Scan the contact QR with your phone to save my details instantly.',
];

// Only makes sense when the card actually shows the live GitHub line.
export const liveFact =
  'The live stats above are pulled fresh from GitHub (with a strict timeout).';

// Deterministic-enough pick without Math.random (kept simple + dependency-free).
// The `?? items[0]` fallback is unreachable for a NonEmpty list, but it keeps the
// return type honest under `noUncheckedIndexedAccess` without an assertion.
export function pick<T>(items: NonEmpty<T>, seed = Date.now()): T {
  const index = Math.floor(seed / 1000) % items.length;
  return items[index] ?? items[0];
}
