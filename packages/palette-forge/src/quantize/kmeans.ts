/**
 * Weighted k-means with k-means++ initialisation, over flat typed arrays.
 *
 * Everything is kept in `Float64Array`s rather than arrays of objects: the inner
 * assignment loop is O(points × k × iterations) and object property access there
 * dominates runtime. On a 160px sample this runs in single-digit milliseconds,
 * which is what lets the UI re-cluster live as you drag the colour-count slider.
 */

import { mulberry32 } from "./rng.js";
import type { SampledPixels } from "./sample.js";

export interface Cluster {
  /** Weighted mean position in the perceptual space. */
  center: [number, number, number];
  /** Weighted mean colour, sRGB 0 to 255. */
  meanRgb: [number, number, number];
  /**
   * The sampled colour closest to `center`. A colour that genuinely appears in
   * the image, unlike `meanRgb`.
   */
  medoidRgb: [number, number, number];
  /** Share of total weight, 0 to 1. */
  share: number;
}

export interface KMeansResult {
  clusters: Cluster[];
  iterations: number;
}

/** Squared distance between point `i` and centroid `j` in the flat arrays. */
function distSq(points: Float64Array, i: number, centers: Float64Array, j: number): number {
  const p = i * 3;
  const c = j * 3;
  const d0 = points[p]! - centers[c]!;
  const d1 = points[p + 1]! - centers[c + 1]!;
  const d2 = points[p + 2]! - centers[c + 2]!;
  return d0 * d0 + d1 * d1 + d2 * d2;
}

/**
 * k-means++ seeding: first centre uniformly at random, each subsequent centre
 * chosen with probability proportional to its squared distance from the nearest
 * existing centre. This is what stops two seeds landing in the same colour blob
 * and returning a palette with duplicate entries.
 */
function seed(sample: SampledPixels, k: number, random: () => number): Float64Array {
  const { coords, weights, count } = sample;
  const centers = new Float64Array(k * 3);

  // First centre: weighted random pick, so a dominant colour is likely to anchor.
  let target = random() * sample.totalWeight;
  let first = 0;
  for (let i = 0; i < count; i++) {
    target -= weights[i]!;
    if (target <= 0) {
      first = i;
      break;
    }
  }
  centers[0] = coords[first * 3]!;
  centers[1] = coords[first * 3 + 1]!;
  centers[2] = coords[first * 3 + 2]!;

  // Running nearest-centre distance for every point, updated as centres are added.
  const nearest = new Float64Array(count);
  for (let i = 0; i < count; i++) nearest[i] = distSq(coords, i, centers, 0);

  for (let c = 1; c < k; c++) {
    let total = 0;
    for (let i = 0; i < count; i++) total += nearest[i]! * weights[i]!;

    let pick = count - 1;
    if (total > 0) {
      let r = random() * total;
      for (let i = 0; i < count; i++) {
        r -= nearest[i]! * weights[i]!;
        if (r <= 0) {
          pick = i;
          break;
        }
      }
    } else {
      // Every point already coincides with a centre (fewer unique colours than
      // k). Duplicate centres get pruned after clustering.
      pick = Math.min(c, count - 1);
    }

    centers[c * 3] = coords[pick * 3]!;
    centers[c * 3 + 1] = coords[pick * 3 + 1]!;
    centers[c * 3 + 2] = coords[pick * 3 + 2]!;

    for (let i = 0; i < count; i++) {
      const d = distSq(coords, i, centers, c);
      if (d < nearest[i]!) nearest[i] = d;
    }
  }

  return centers;
}

export interface KMeansOptions {
  k: number;
  maxIterations: number;
  seed: number;
  /** Clusters below this share of total weight are dropped. */
  minShare: number;
}

export function kmeans(sample: SampledPixels, options: KMeansOptions): KMeansResult {
  const { coords, rgb, weights, count, totalWeight } = sample;
  const k = Math.min(options.k, count);

  if (count === 0 || k === 0) return { clusters: [], iterations: 0 };

  const random = mulberry32(options.seed);
  let centers = seed(sample, k, random);
  const assignment = new Int32Array(count).fill(-1);

  let iterations = 0;
  for (let iter = 0; iter < options.maxIterations; iter++) {
    iterations = iter + 1;
    let moved = false;

    for (let i = 0; i < count; i++) {
      let best = 0;
      let bestDist = Infinity;
      for (let j = 0; j < k; j++) {
        const d = distSq(coords, i, centers, j);
        if (d < bestDist) {
          bestDist = d;
          best = j;
        }
      }
      if (assignment[i] !== best) {
        assignment[i] = best;
        moved = true;
      }
    }

    // Lloyd update: each centre moves to the weighted mean of its members.
    const sums = new Float64Array(k * 3);
    const rgbSums = new Float64Array(k * 3);
    const massed = new Float64Array(k);

    for (let i = 0; i < count; i++) {
      const j = assignment[i]!;
      const w = weights[i]!;
      const p = i * 3;
      const o = j * 3;
      sums[o] = sums[o]! + coords[p]! * w;
      sums[o + 1] = sums[o + 1]! + coords[p + 1]! * w;
      sums[o + 2] = sums[o + 2]! + coords[p + 2]! * w;
      rgbSums[o] = rgbSums[o]! + rgb[p]! * w;
      rgbSums[o + 1] = rgbSums[o + 1]! + rgb[p + 1]! * w;
      rgbSums[o + 2] = rgbSums[o + 2]! + rgb[p + 2]! * w;
      massed[j] = massed[j]! + w;
    }

    const next = new Float64Array(k * 3);
    for (let j = 0; j < k; j++) {
      const o = j * 3;
      if (massed[j]! > 0) {
        next[o] = sums[o]! / massed[j]!;
        next[o + 1] = sums[o + 1]! / massed[j]!;
        next[o + 2] = sums[o + 2]! / massed[j]!;
      } else {
        // Empty cluster: leave it where it was rather than reseeding, so the
        // result stays deterministic. It gets pruned by `minShare` below.
        next[o] = centers[o]!;
        next[o + 1] = centers[o + 1]!;
        next[o + 2] = centers[o + 2]!;
      }
    }
    centers = next;

    // Converged, assignments are stable, so further iterations are no-ops.
    if (!moved && iter > 0) break;
  }

  // Final pass: masses, mean colours, and the medoid of each cluster.
  const massed = new Float64Array(k);
  const rgbSums = new Float64Array(k * 3);
  const medoidIndex = new Int32Array(k).fill(-1);
  const medoidDist = new Float64Array(k).fill(Infinity);

  for (let i = 0; i < count; i++) {
    const j = assignment[i]!;
    const w = weights[i]!;
    const p = i * 3;
    const o = j * 3;
    rgbSums[o] = rgbSums[o]! + rgb[p]! * w;
    rgbSums[o + 1] = rgbSums[o + 1]! + rgb[p + 1]! * w;
    rgbSums[o + 2] = rgbSums[o + 2]! + rgb[p + 2]! * w;
    massed[j] = massed[j]! + w;

    const d = distSq(coords, i, centers, j);
    if (d < medoidDist[j]!) {
      medoidDist[j] = d;
      medoidIndex[j] = i;
    }
  }

  const clusters: Cluster[] = [];
  for (let j = 0; j < k; j++) {
    const mass = massed[j]!;
    const share = totalWeight > 0 ? mass / totalWeight : 0;
    if (mass === 0 || share < options.minShare) continue;

    const o = j * 3;
    const mi = medoidIndex[j]!;
    clusters.push({
      center: [centers[o]!, centers[o + 1]!, centers[o + 2]!],
      meanRgb: [rgbSums[o]! / mass, rgbSums[o + 1]! / mass, rgbSums[o + 2]! / mass],
      medoidRgb:
        mi >= 0
          ? [rgb[mi * 3]!, rgb[mi * 3 + 1]!, rgb[mi * 3 + 2]!]
          : [rgbSums[o]! / mass, rgbSums[o + 1]! / mass, rgbSums[o + 2]! / mass],
      share,
    });
  }

  clusters.sort((a, b) => b.share - a.share);
  return { clusters, iterations };
}
