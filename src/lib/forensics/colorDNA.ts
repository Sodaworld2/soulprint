// Color DNA Analysis — RGB histograms, LAB profile, dominant colors, color temperature
import type { ColorDNA } from '../../types/forensic';

function rgbToLab(r: number, g: number, b: number): { l: number; a: number; b: number } {
  // Normalize to 0-1
  let rr = r / 255, gg = g / 255, bb = b / 255;
  // sRGB to linear
  rr = rr > 0.04045 ? Math.pow((rr + 0.055) / 1.055, 2.4) : rr / 12.92;
  gg = gg > 0.04045 ? Math.pow((gg + 0.055) / 1.055, 2.4) : gg / 12.92;
  bb = bb > 0.04045 ? Math.pow((bb + 0.055) / 1.055, 2.4) : bb / 12.92;
  // Linear RGB to XYZ (D65)
  let x = (rr * 0.4124564 + gg * 0.3575761 + bb * 0.1804375) / 0.95047;
  let y = (rr * 0.2126729 + gg * 0.7151522 + bb * 0.0721750);
  let z = (rr * 0.0193339 + gg * 0.1191920 + bb * 0.9503041) / 1.08883;
  // XYZ to LAB
  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  x = f(x); y = f(y); z = f(z);
  return { l: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

function estimateColorTemperature(avgR: number, avgG: number, avgB: number): number {
  // McCamy's approximation from chromaticity
  const X = 0.4124 * avgR + 0.3576 * avgG + 0.1805 * avgB;
  const Y = 0.2126 * avgR + 0.7152 * avgG + 0.0722 * avgB;
  const Z = 0.0193 * avgR + 0.1192 * avgG + 0.9505 * avgB;
  const sum = X + Y + Z;
  if (sum === 0) return 6500;
  const x = X / sum, y = Y / sum;
  const n = (x - 0.3320) / (0.1858 - y);
  const cct = 449 * n * n * n + 3525 * n * n + 6823.3 * n + 5520.33;
  return Math.round(Math.max(1000, Math.min(40000, cct)));
}

export function analyzeColorDNA(pixels: Uint8ClampedArray, width: number, height: number): ColorDNA {
  const histR = new Array(256).fill(0);
  const histG = new Array(256).fill(0);
  const histB = new Array(256).fill(0);

  let sumR = 0, sumG = 0, sumB = 0, sumS = 0;
  let sumL = 0, sumA = 0, sumLB = 0;
  const total = width * height;

  // Color quantization buckets (5-bit per channel = 32^3 = 32768 buckets)
  const colorBuckets = new Map<number, { r: number; g: number; b: number; count: number }>();

  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    histR[r]++;
    histG[g]++;
    histB[b]++;
    sumR += r; sumG += g; sumB += b;

    const hsv = rgbToHsv(r, g, b);
    sumS += hsv.s;

    // Sample LAB for every 4th pixel (perf)
    if ((i / 4) % 4 === 0) {
      const lab = rgbToLab(r, g, b);
      sumL += lab.l; sumA += lab.a; sumLB += lab.b;
    }

    // Quantize to 5 bits
    const qr = r >> 3, qg = g >> 3, qb = b >> 3;
    const key = (qr << 10) | (qg << 5) | qb;
    const existing = colorBuckets.get(key);
    if (existing) {
      existing.r += r; existing.g += g; existing.b += b; existing.count++;
    } else {
      colorBuckets.set(key, { r, g, b, count: 1 });
    }
  }

  // Top 5 dominant colors
  const sorted = [...colorBuckets.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  const dominantColors = sorted.map((c) => ({
    rgb: [Math.round(c.r / c.count), Math.round(c.g / c.count), Math.round(c.b / c.count)] as [number, number, number],
    percentage: (c.count / total) * 100,
  }));

  const avgR = sumR / total, avgG = sumG / total, avgB = sumB / total;
  const labSamples = Math.floor(total / 4);
  const labProfile = { l: sumL / labSamples, a: sumA / labSamples, b: sumLB / labSamples };
  const colorTemperature = estimateColorTemperature(avgR / 255, avgG / 255, avgB / 255);
  const saturationMean = sumS / total;

  // Generate summary
  const warmCool = colorTemperature > 5500 ? 'cool' : colorTemperature > 4000 ? 'neutral' : 'warm';
  const topColor = dominantColors[0];
  const summary = `Dominant color is RGB(${topColor.rgb.join(', ')}) covering ${topColor.percentage.toFixed(1)}% of the image. ` +
    `Color temperature is approximately ${colorTemperature}K (${warmCool} palette). ` +
    `Average saturation is ${(saturationMean * 100).toFixed(0)}%. ` +
    `LAB profile: L*=${labProfile.l.toFixed(1)}, a*=${labProfile.a.toFixed(1)}, b*=${labProfile.b.toFixed(1)}. ` +
    `This creates a unique color fingerprint for matching against other images of the same subject.`;

  return {
    histogram: { r: histR, g: histG, b: histB },
    labProfile,
    dominantColors,
    colorTemperature,
    saturationMean,
    summary,
  };
}
