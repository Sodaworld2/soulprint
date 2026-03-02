// Sobel Edge Detection — gradient magnitude + direction histogram
import type { EdgeAnalysis } from '../../types/forensic';

export function analyzeEdges(pixels: Uint8ClampedArray, width: number, height: number): EdgeAnalysis {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const j = i * 4;
    gray[i] = pixels[j] * 0.299 + pixels[j + 1] * 0.587 + pixels[j + 2] * 0.114;
  }

  const magnitude = new Float32Array(width * height);
  const directionHistogram = new Array(36).fill(0); // 10-degree bins

  let maxMag = 0;
  let edgePixels = 0;
  const edgeThreshold = 30;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      // Sobel X
      const gx =
        -gray[(y - 1) * width + (x - 1)] + gray[(y - 1) * width + (x + 1)]
        - 2 * gray[y * width + (x - 1)] + 2 * gray[y * width + (x + 1)]
        - gray[(y + 1) * width + (x - 1)] + gray[(y + 1) * width + (x + 1)];

      // Sobel Y
      const gy =
        -gray[(y - 1) * width + (x - 1)] - 2 * gray[(y - 1) * width + x] - gray[(y - 1) * width + (x + 1)]
        + gray[(y + 1) * width + (x - 1)] + 2 * gray[(y + 1) * width + x] + gray[(y + 1) * width + (x + 1)];

      const mag = Math.sqrt(gx * gx + gy * gy);
      magnitude[y * width + x] = mag;
      if (mag > maxMag) maxMag = mag;

      if (mag > edgeThreshold) {
        edgePixels++;
        let angle = Math.atan2(gy, gx) * (180 / Math.PI);
        if (angle < 0) angle += 360;
        const bin = Math.min(35, Math.floor(angle / 10));
        directionHistogram[bin]++;
      }
    }
  }

  const totalPixels = (width - 2) * (height - 2);
  const edgeDensity = edgePixels / totalPixels;

  // Find dominant edge direction
  let dominantBin = 0;
  for (let i = 1; i < 36; i++) {
    if (directionHistogram[i] > directionHistogram[dominantBin]) dominantBin = i;
  }
  const dominantAngle = dominantBin * 10;

  const directionLabels: Record<number, string> = {
    0: 'horizontal', 45: 'diagonal (↗)', 90: 'vertical', 135: 'diagonal (↘)',
    180: 'horizontal', 225: 'diagonal (↙)', 270: 'vertical', 315: 'diagonal (↖)',
  };
  const nearestDir = Object.keys(directionLabels).reduce((prev, curr) =>
    Math.abs(Number(curr) - dominantAngle) < Math.abs(Number(prev) - dominantAngle) ? curr : prev
  );

  const summary = `Edge density is ${(edgeDensity * 100).toFixed(1)}% — ` +
    `${edgeDensity > 0.3 ? 'highly detailed surface with many contours' : edgeDensity > 0.15 ? 'moderate edge structure' : 'smooth surface with few edges'}. ` +
    `Dominant edge direction is ${directionLabels[Number(nearestDir)] || dominantAngle + '°'} (${dominantAngle}°). ` +
    `This edge signature helps identify the object's structural form and surface texture patterns.`;

  return { magnitude, directionHistogram, edgeDensity, width, height, summary };
}
