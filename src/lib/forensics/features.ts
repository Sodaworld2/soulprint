// Harris Corner Detection + Patch Descriptors
import type { FeaturePoints } from '../../types/forensic';

function toGrayscale(pixels: Uint8ClampedArray, w: number, h: number): Float32Array {
  const gray = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const j = i * 4;
    gray[i] = pixels[j] * 0.299 + pixels[j + 1] * 0.587 + pixels[j + 2] * 0.114;
  }
  return gray;
}

function gaussianBlur3x3(src: Float32Array, w: number, h: number): Float32Array {
  const dst = new Float32Array(w * h);
  const k = [1/16, 2/16, 1/16, 2/16, 4/16, 2/16, 1/16, 2/16, 1/16];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let v = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          v += src[(y + ky) * w + (x + kx)] * k[(ky + 1) * 3 + (kx + 1)];
        }
      }
      dst[y * w + x] = v;
    }
  }
  return dst;
}

export function detectFeatures(pixels: Uint8ClampedArray, width: number, height: number): FeaturePoints {
  const gray = toGrayscale(pixels, width, height);
  const blurred = gaussianBlur3x3(gray, width, height);

  // Compute gradients (Sobel)
  const Ix = new Float32Array(width * height);
  const Iy = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      Ix[y * width + x] =
        -blurred[(y - 1) * width + (x - 1)] + blurred[(y - 1) * width + (x + 1)]
        -2 * blurred[y * width + (x - 1)] + 2 * blurred[y * width + (x + 1)]
        -blurred[(y + 1) * width + (x - 1)] + blurred[(y + 1) * width + (x + 1)];
      Iy[y * width + x] =
        -blurred[(y - 1) * width + (x - 1)] - 2 * blurred[(y - 1) * width + x] - blurred[(y - 1) * width + (x + 1)]
        +blurred[(y + 1) * width + (x - 1)] + 2 * blurred[(y + 1) * width + x] + blurred[(y + 1) * width + (x + 1)];
    }
  }

  // Harris response
  const k = 0.04;
  const windowSize = 3;
  const half = Math.floor(windowSize / 2);
  const response = new Float32Array(width * height);

  for (let y = half + 1; y < height - half - 1; y++) {
    for (let x = half + 1; x < width - half - 1; x++) {
      let sumIx2 = 0, sumIy2 = 0, sumIxIy = 0;
      for (let wy = -half; wy <= half; wy++) {
        for (let wx = -half; wx <= half; wx++) {
          const idx = (y + wy) * width + (x + wx);
          sumIx2 += Ix[idx] * Ix[idx];
          sumIy2 += Iy[idx] * Iy[idx];
          sumIxIy += Ix[idx] * Iy[idx];
        }
      }
      const det = sumIx2 * sumIy2 - sumIxIy * sumIxIy;
      const trace = sumIx2 + sumIy2;
      response[y * width + x] = det - k * trace * trace;
    }
  }

  // Non-maximum suppression + threshold
  const corners: Array<{ x: number; y: number; strength: number }> = [];
  const threshold = 1000;
  const nmsRadius = 5;

  for (let y = nmsRadius; y < height - nmsRadius; y++) {
    for (let x = nmsRadius; x < width - nmsRadius; x++) {
      const val = response[y * width + x];
      if (val < threshold) continue;
      let isMax = true;
      for (let dy = -nmsRadius; dy <= nmsRadius && isMax; dy++) {
        for (let dx = -nmsRadius; dx <= nmsRadius && isMax; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (response[(y + dy) * width + (x + dx)] > val) isMax = false;
        }
      }
      if (isMax) corners.push({ x, y, strength: val });
    }
  }

  // Sort by strength, keep top 500
  corners.sort((a, b) => b.strength - a.strength);
  const topCorners = corners.slice(0, 500);

  // Extract 8x8 patch descriptors (normalized)
  const descriptors: Float32Array[] = [];
  const patchSize = 8;
  const patchHalf = patchSize / 2;

  for (const corner of topCorners) {
    if (corner.x < patchHalf || corner.x >= width - patchHalf ||
        corner.y < patchHalf || corner.y >= height - patchHalf) {
      descriptors.push(new Float32Array(64));
      continue;
    }
    const desc = new Float32Array(64);
    let mean = 0;
    for (let py = 0; py < patchSize; py++) {
      for (let px = 0; px < patchSize; px++) {
        const val = gray[(corner.y - patchHalf + py) * width + (corner.x - patchHalf + px)];
        desc[py * patchSize + px] = val;
        mean += val;
      }
    }
    mean /= 64;
    let norm = 0;
    for (let i = 0; i < 64; i++) {
      desc[i] -= mean;
      norm += desc[i] * desc[i];
    }
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < 64; i++) desc[i] /= norm;
    descriptors.push(desc);
  }

  const summary = `Detected ${topCorners.length} Harris corners. ` +
    `Strongest feature at (${topCorners[0]?.x ?? 0}, ${topCorners[0]?.y ?? 0}) with strength ${topCorners[0]?.strength?.toFixed(0) ?? 0}. ` +
    `Features are concentrated ${topCorners.length > 100 ? 'densely' : 'sparsely'} across the image, ` +
    `indicating ${topCorners.length > 200 ? 'high detail and texture richness' : 'moderate surface complexity'}.`;

  return { corners: topCorners, descriptors, count: topCorners.length, summary };
}
