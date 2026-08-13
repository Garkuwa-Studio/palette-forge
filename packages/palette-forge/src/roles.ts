/**
 * Inferring what each extracted colour is *for*.
 *
 * Clustering tells you which colours are present and how much of the image they
 * cover. It says nothing about which one is the brand colour and which is just
 * the background of the screenshot. These heuristics close that gap so the
 * emitters can produce named tokens (`--primary`) instead of `--color-3`.
 *
 * They are heuristics, and the UI is expected to let people override them.
 */

import type { OKLCH, RGB, Role } from "./types.js";

export interface RoleCandidate {
  rgb: RGB;
  oklch: OKLCH;
  share: number;
}

/** Below this OKLCH chroma a colour reads as grey rather than as a hue. */
const NEUTRAL_CHROMA = 0.035;

/** Lightness bounds outside which a colour is structural, not decorative. */
const INK_MAX_LIGHTNESS = 0.42;
const PAPER_MIN_LIGHTNESS = 0.82;

/**
 * How brand-carrying a colour is.
 *
 * Chroma dominates. A vivid colour covering 5% of a screenshot is far more
 * likely to be the brand than a beige covering 40%. Coverage still matters, so
 * it enters under a square root: enough to break ties between two equally vivid
 * colours, not enough to let background wash win outright.
 */
function brandScore(candidate: RoleCandidate): number {
  const [l, c] = candidate.oklch;
  // Colours pinned at the very top or bottom of the lightness range are
  // paper/ink, not accents, however saturated they measure.
  const usable = l > 0.12 && l < 0.95 ? 1 : 0.15;
  return c * Math.sqrt(candidate.share) * usable;
}

/**
 * Assign one role per candidate, returned in the same order as the input.
 *
 * Roles are exclusive: the colour chosen as `ink` cannot also be `primary`.
 * Assignment order is deliberate, structural roles (ink, paper) are claimed
 * first because a system without a readable text/background pair is broken in a
 * way that a system without an `accent` is not.
 */
export function assignRoles(candidates: RoleCandidate[]): Role[] {
  const roles = new Array<Role | undefined>(candidates.length).fill(undefined);
  if (candidates.length === 0) return [];

  const claim = (index: number, role: Role) => {
    if (index >= 0 && roles[index] === undefined) roles[index] = role;
  };

  const unclaimed = () =>
    candidates.map((c, i) => ({ ...c, i })).filter((c) => roles[c.i] === undefined);

  // --- ink: the darkest colour, provided it is actually dark enough to be text.
  const darkest = unclaimed().sort((a, b) => a.oklch[0] - b.oklch[0])[0];
  if (darkest && darkest.oklch[0] <= INK_MAX_LIGHTNESS) claim(darkest.i, "ink");

  // --- paper: the lightest colour, same reasoning inverted.
  const lightest = unclaimed().sort((a, b) => b.oklch[0] - a.oklch[0])[0];
  if (lightest && lightest.oklch[0] >= PAPER_MIN_LIGHTNESS) claim(lightest.i, "paper");

  // --- primary / accent: the two most brand-carrying chromatic colours.
  const chromatic = unclaimed()
    .filter((c) => c.oklch[1] >= NEUTRAL_CHROMA)
    .sort((a, b) => brandScore(b) - brandScore(a));

  if (chromatic[0]) claim(chromatic[0].i, "primary");
  if (chromatic[1]) claim(chromatic[1].i, "accent");

  // --- everything else splits on chroma.
  for (let i = 0; i < candidates.length; i++) {
    if (roles[i] !== undefined) continue;
    roles[i] = candidates[i]!.oklch[1] < NEUTRAL_CHROMA ? "neutral" : "support";
  }

  return roles as Role[];
}

/**
 * Token-safe unique names from roles: `primary`, `support`, `support-2`, …
 *
 * The first holder of a role gets the bare name so the common case reads well in
 * generated CSS; collisions are suffixed rather than renamed, which keeps names
 * stable when an unrelated colour is added to the palette.
 */
export function nameSwatches(roles: Role[]): string[] {
  const seen = new Map<Role, number>();
  return roles.map((role) => {
    const n = (seen.get(role) ?? 0) + 1;
    seen.set(role, n);
    return n === 1 ? role : `${role}-${n}`;
  });
}
