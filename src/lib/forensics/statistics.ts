// Statistical Moments — per-channel mean, variance, skewness, kurtosis
import type { StatisticalMoments, ChannelStats } from '../../types/forensic';

function computeChannelStats(values: number[]): ChannelStats {
  const n = values.length;
  let sum = 0, min = 255, max = 0;
  for (let i = 0; i < n; i++) {
    sum += values[i];
    if (values[i] < min) min = values[i];
    if (values[i] > max) max = values[i];
  }
  const mean = sum / n;

  let m2 = 0, m3 = 0, m4 = 0;
  for (let i = 0; i < n; i++) {
    const d = values[i] - mean;
    const d2 = d * d;
    m2 += d2;
    m3 += d2 * d;
    m4 += d2 * d2;
  }
  const variance = m2 / n;
  const stdDev = Math.sqrt(variance);
  const skewness = stdDev > 0 ? (m3 / n) / (stdDev * stdDev * stdDev) : 0;
  const kurtosis = stdDev > 0 ? (m4 / n) / (variance * variance) - 3 : 0;

  return { mean, variance, stdDev, skewness, kurtosis, min, max };
}

export function analyzeStatistics(pixels: Uint8ClampedArray, width: number, height: number): StatisticalMoments {
  const n = width * height;
  const rVals: number[] = new Array(n);
  const gVals: number[] = new Array(n);
  const bVals: number[] = new Array(n);
  const grayVals: number[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const j = i * 4;
    rVals[i] = pixels[j];
    gVals[i] = pixels[j + 1];
    bVals[i] = pixels[j + 2];
    grayVals[i] = pixels[j] * 0.299 + pixels[j + 1] * 0.587 + pixels[j + 2] * 0.114;
  }

  const channels = {
    r: computeChannelStats(rVals),
    g: computeChannelStats(gVals),
    b: computeChannelStats(bVals),
    gray: computeChannelStats(grayVals),
  };

  const gray = channels.gray;
  const brightnessLabel = gray.mean > 170 ? 'bright' : gray.mean > 85 ? 'mid-tone' : 'dark';
  const contrastLabel = gray.stdDev > 60 ? 'high contrast' : gray.stdDev > 30 ? 'moderate contrast' : 'low contrast';

  const summary = `Image is ${brightnessLabel} with ${contrastLabel} (mean: ${gray.mean.toFixed(1)}, σ: ${gray.stdDev.toFixed(1)}). ` +
    `Skewness ${gray.skewness.toFixed(2)} (${gray.skewness > 0.5 ? 'skewed toward dark tones' : gray.skewness < -0.5 ? 'skewed toward bright tones' : 'balanced distribution'}). ` +
    `Kurtosis ${gray.kurtosis.toFixed(2)} (${gray.kurtosis > 1 ? 'peaked distribution — concentrated tonal range' : gray.kurtosis < -1 ? 'flat distribution — wide tonal spread' : 'normal-like distribution'}). ` +
    `Dynamic range: ${gray.min}–${gray.max} (${gray.max - gray.min} levels used of 256).`;

  return { channels, summary };
}
