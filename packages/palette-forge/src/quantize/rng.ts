/**
 * Deterministic PRNG.
 *
 * k-means++ needs randomness, but a palette tool that returns a different answer
 * every time you drop the same logo is a broken tool. You cannot diff it, cache
 * it, or write a test against it. Seeding a small explicit generator makes
 * extraction reproducible while keeping the seeding strategy's benefits.
 *
 * mulberry32: 32-bit state, passes gjrand's basic suites, ~2^32 period. Far more
 * than adequate for choosing cluster seeds.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
