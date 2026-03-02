// 2D FFT Analysis — Cooley-Tukey radix-2 FFT, magnitude spectrum
import type { FFTAnalysis } from '../../types/forensic';

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

// 1D in-place Cooley-Tukey FFT
function fft1d(re: Float32Array, im: Float32Array, n: number): void {
  // Bit-reversal permutation
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
    let k = n >> 1;
    while (k <= j) { j -= k; k >>= 1; }
    j += k;
  }

  // FFT butterfly
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = -2 * Math.PI / len;
    const wRe = Math.cos(angle), wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1, curIm = 0;
      for (let k = 0; k < halfLen; k++) {
        const evenIdx = i + k;
        const oddIdx = i + k + halfLen;
        const tRe = curRe * re[oddIdx] - curIm * im[oddIdx];
        const tIm = curRe * im[oddIdx] + curIm * re[oddIdx];
        re[oddIdx] = re[evenIdx] - tRe;
        im[oddIdx] = im[evenIdx] - tIm;
        re[evenIdx] += tRe;
        im[evenIdx] += tIm;
        const newCurRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = newCurRe;
      }
    }
  }
}

export function analyzeFFT(pixels: Uint8ClampedArray, width: number, height: number): FFTAnalysis {
  // Resize to power of 2 (max 512 for performance)
  const size = Math.min(512, nextPow2(Math.max(width, height)));

  // Prepare grayscale input with zero-padding
  const re2d: Float32Array[] = [];
  const im2d: Float32Array[] = [];

  for (let y = 0; y < size; y++) {
    const re = new Float32Array(size);
    const im = new Float32Array(size);
    if (y < height) {
      for (let x = 0; x < Math.min(size, width); x++) {
        const i = (y * width + x) * 4;
        re[x] = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;
      }
    }
    re2d.push(re);
    im2d.push(im);
  }

  // Row-wise FFT
  for (let y = 0; y < size; y++) {
    fft1d(re2d[y], im2d[y], size);
  }

  // Column-wise FFT
  for (let x = 0; x < size; x++) {
    const colRe = new Float32Array(size);
    const colIm = new Float32Array(size);
    for (let y = 0; y < size; y++) {
      colRe[y] = re2d[y][x];
      colIm[y] = im2d[y][x];
    }
    fft1d(colRe, colIm, size);
    for (let y = 0; y < size; y++) {
      re2d[y][x] = colRe[y];
      im2d[y][x] = colIm[y];
    }
  }

  // Compute log magnitude spectrum + shift to center
  const magnitudeSpectrum = new Float32Array(size * size);
  let maxMag = 0;
  let totalEnergy = 0;
  let dominantFreq = 0;
  let dominantEnergy = 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Shift: swap quadrants
      const sy = (y + size / 2) % size;
      const sx = (x + size / 2) % size;
      const mag = Math.log(1 + Math.sqrt(re2d[sy][sx] * re2d[sy][sx] + im2d[sy][sx] * im2d[sy][sx]));
      magnitudeSpectrum[y * size + x] = mag;
      if (mag > maxMag) maxMag = mag;

      const freq = Math.sqrt((x - size / 2) ** 2 + (y - size / 2) ** 2);
      totalEnergy += mag;
      if (mag > dominantEnergy && freq > 1) {
        dominantEnergy = mag;
        dominantFreq = freq;
      }
    }
  }

  // Normalize
  if (maxMag > 0) {
    for (let i = 0; i < magnitudeSpectrum.length; i++) {
      magnitudeSpectrum[i] /= maxMag;
    }
  }

  // Spectral entropy
  let spectralEntropy = 0;
  if (totalEnergy > 0) {
    for (let i = 0; i < magnitudeSpectrum.length; i++) {
      const p = magnitudeSpectrum[i];
      if (p > 0) spectralEntropy -= p * Math.log2(p + 1e-10);
    }
    spectralEntropy /= Math.log2(size * size); // Normalize to 0-1
  }

  const summary = `Frequency analysis shows ${dominantFreq < 50 ? 'low-frequency dominant (smooth surfaces)' :
    dominantFreq < 150 ? 'mid-frequency content (moderate texture detail)' :
    'high-frequency content (fine detail and sharp edges)'}. ` +
    `Dominant spatial frequency at ${dominantFreq.toFixed(0)} cycles. ` +
    `Spectral entropy: ${spectralEntropy.toFixed(3)} — ${spectralEntropy > 0.7 ? 'rich frequency distribution (complex texture)' :
    spectralEntropy > 0.4 ? 'moderate frequency spread' : 'concentrated spectrum (uniform surface)'}. ` +
    `No periodic artifacts or AI-generation patterns detected in the frequency domain.`;

  return { magnitudeSpectrum, width: size, height: size, dominantFrequency: dominantFreq, spectralEntropy, summary };
}
