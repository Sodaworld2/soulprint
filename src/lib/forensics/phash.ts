// Perceptual Hash (dHash) — 9x8 difference hash producing 64-bit hex string

export function computePhash(pixels: Uint8ClampedArray, width: number, height: number): string {
  // Resize to 9x8 using area averaging
  const sw = 9, sh = 8;
  const gray = new Float32Array(sw * sh);

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const srcX0 = Math.floor((x / sw) * width);
      const srcX1 = Math.floor(((x + 1) / sw) * width);
      const srcY0 = Math.floor((y / sh) * height);
      const srcY1 = Math.floor(((y + 1) / sh) * height);

      let sum = 0, count = 0;
      for (let sy = srcY0; sy < srcY1; sy++) {
        for (let sx = srcX0; sx < srcX1; sx++) {
          const i = (sy * width + sx) * 4;
          // Grayscale: 0.299R + 0.587G + 0.114B
          sum += pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
          count++;
        }
      }
      gray[y * sw + x] = count > 0 ? sum / count : 0;
    }
  }

  // dHash: compare each pixel to its right neighbor (8x8 = 64 bits)
  let hash = '';
  for (let y = 0; y < sh; y++) {
    let byte = 0;
    for (let x = 0; x < 8; x++) {
      if (gray[y * sw + x] < gray[y * sw + x + 1]) {
        byte |= 1 << (7 - x);
      }
    }
    hash += byte.toString(16).padStart(2, '0');
  }

  return hash;
}

export function hammingDistance(a: string, b: string): number {
  let dist = 0;
  for (let i = 0; i < a.length; i += 2) {
    const byteA = parseInt(a.substring(i, i + 2), 16);
    const byteB = parseInt(b.substring(i, i + 2), 16);
    let xor = byteA ^ byteB;
    while (xor) { dist += xor & 1; xor >>= 1; }
  }
  return dist;
}

export function hashSimilarity(a: string, b: string): number {
  const dist = hammingDistance(a, b);
  return 1 - dist / 64;
}
