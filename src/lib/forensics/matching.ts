// Feature Matching — brute-force descriptor matching with Lowe's ratio test

export interface FeatureMatch {
  idxA: number;
  idxB: number;
  distance: number;
}

function descriptorDistance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

export function matchDescriptors(
  descA: Float32Array[],
  descB: Float32Array[],
  ratioThreshold: number = 0.75
): FeatureMatch[] {
  const matches: FeatureMatch[] = [];

  for (let i = 0; i < descA.length; i++) {
    let best = Infinity, secondBest = Infinity;
    let bestIdx = -1;

    for (let j = 0; j < descB.length; j++) {
      const d = descriptorDistance(descA[i], descB[j]);
      if (d < best) {
        secondBest = best;
        best = d;
        bestIdx = j;
      } else if (d < secondBest) {
        secondBest = d;
      }
    }

    // Lowe's ratio test
    if (secondBest > 0 && best / secondBest < ratioThreshold) {
      matches.push({ idxA: i, idxB: bestIdx, distance: best });
    }
  }

  return matches;
}

export function matchAllPairs(
  images: Array<{ id: string; descriptors: Float32Array[] }>
): Array<{ imageA: string; imageB: string; matchCount: number; avgDistance: number }> {
  const results: Array<{ imageA: string; imageB: string; matchCount: number; avgDistance: number }> = [];

  for (let i = 0; i < images.length; i++) {
    for (let j = i + 1; j < images.length; j++) {
      const matches = matchDescriptors(images[i].descriptors, images[j].descriptors);
      const avgDist = matches.length > 0
        ? matches.reduce((s, m) => s + m.distance, 0) / matches.length
        : 1;
      results.push({
        imageA: images[i].id,
        imageB: images[j].id,
        matchCount: matches.length,
        avgDistance: avgDist,
      });
    }
  }

  return results;
}
