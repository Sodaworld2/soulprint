// Noise Profile Analysis — wavelet-based noise estimation, SNR
import type { NoiseProfile } from '../../types/forensic';

export function analyzeNoise(pixels: Uint8ClampedArray, width: number, height: number): NoiseProfile {
  // Convert to grayscale
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const j = i * 4;
    gray[i] = pixels[j] * 0.299 + pixels[j + 1] * 0.587 + pixels[j + 2] * 0.114;
  }

  // Estimate noise using median absolute deviation of Haar wavelet HH subband
  // HH subband = high-pass horizontal + high-pass vertical (captures noise)
  const hw = Math.floor(width / 2);
  const hh = Math.floor(height / 2);
  const hhCoeffs: number[] = [];

  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < hw; x++) {
      const y2 = y * 2, x2 = x * 2;
      // Haar HH: (a - b - c + d) / 4
      const a = gray[y2 * width + x2];
      const b = gray[y2 * width + x2 + 1];
      const c = gray[(y2 + 1) * width + x2];
      const d = gray[(y2 + 1) * width + x2 + 1];
      hhCoeffs.push((a - b - c + d) / 4);
    }
  }

  // MAD estimator: σ = MAD / 0.6745
  const absCoeffs = hhCoeffs.map(Math.abs).sort((a, b) => a - b);
  const median = absCoeffs[Math.floor(absCoeffs.length / 2)];
  const estimatedNoise = median / 0.6745;

  // Compute signal level (standard deviation of the image)
  let mean = 0;
  for (let i = 0; i < gray.length; i++) mean += gray[i];
  mean /= gray.length;
  let variance = 0;
  for (let i = 0; i < gray.length; i++) variance += (gray[i] - mean) * (gray[i] - mean);
  variance /= gray.length;
  const signalStd = Math.sqrt(variance);

  const snr = estimatedNoise > 0 ? signalStd / estimatedNoise : 999;

  // Uniformity: measure noise consistency across quadrants
  const quadrants: number[][] = [[], [], [], []];
  for (let i = 0; i < hhCoeffs.length; i++) {
    const x = i % hw, y = Math.floor(i / hw);
    const q = (y < hh / 2 ? 0 : 2) + (x < hw / 2 ? 0 : 1);
    quadrants[q].push(Math.abs(hhCoeffs[i]));
  }
  const qMedians = quadrants.map((q) => {
    q.sort((a, b) => a - b);
    return q[Math.floor(q.length / 2)] / 0.6745;
  });
  const qMean = qMedians.reduce((a, b) => a + b, 0) / 4;
  const qVar = qMedians.reduce((a, b) => a + (b - qMean) ** 2, 0) / 4;
  const uniformity = qMean > 0 ? Math.max(0, 1 - Math.sqrt(qVar) / qMean) : 1;

  const summary = `Estimated noise level: σ=${estimatedNoise.toFixed(2)} (${estimatedNoise < 3 ? 'very clean image' :
    estimatedNoise < 8 ? 'low noise — good lighting conditions' :
    estimatedNoise < 15 ? 'moderate noise — typical for indoor/mixed lighting' :
    'high noise — low light or high ISO'}). ` +
    `Signal-to-noise ratio: ${snr.toFixed(1)}dB. ` +
    `Noise uniformity: ${(uniformity * 100).toFixed(0)}% — ${uniformity > 0.85 ? 'consistent noise pattern across image (authentic sensor noise)' :
    'uneven noise distribution (may indicate compositing or processing)'}.`;

  return { estimatedNoise, snr, uniformity, summary };
}
