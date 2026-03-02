// Error Level Analysis — JPEG recompression difference detection
import type { ELAResult } from '../../types/forensic';

export async function analyzeELA(
  imageData: ImageData,
  _originalFile: File
): Promise<ELAResult> {
  const { width, height, data: pixels } = imageData;

  // Recompress at quality 75 using canvas
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);

  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.75 });
  const bitmap = await createImageBitmap(blob);

  const canvas2 = new OffscreenCanvas(width, height);
  const ctx2 = canvas2.getContext('2d')!;
  ctx2.drawImage(bitmap, 0, 0);
  const recompressed = ctx2.getImageData(0, 0, width, height).data;

  // Compute difference
  const diffMap = new Uint8ClampedArray(width * height * 4);
  let totalError = 0;
  let maxError = 0;
  const scale = 10; // Amplify differences for visibility
  let suspiciousPixels = 0;
  const suspiciousThreshold = 50;

  for (let i = 0; i < pixels.length; i += 4) {
    const dr = Math.abs(pixels[i] - recompressed[i]);
    const dg = Math.abs(pixels[i + 1] - recompressed[i + 1]);
    const db = Math.abs(pixels[i + 2] - recompressed[i + 2]);
    const err = (dr + dg + db) / 3;

    totalError += err;
    if (err > maxError) maxError = err;

    const amplified = Math.min(255, err * scale);
    diffMap[i] = amplified;
    diffMap[i + 1] = amplified;
    diffMap[i + 2] = amplified;
    diffMap[i + 3] = 255;

    if (err > suspiciousThreshold) suspiciousPixels++;
  }

  const totalPixels = width * height;
  const meanError = totalError / totalPixels;
  const suspiciousRegions = Math.round((suspiciousPixels / totalPixels) * 100);

  const summary = `Error Level Analysis: mean error ${meanError.toFixed(2)}, max error ${maxError.toFixed(0)}. ` +
    `${suspiciousRegions}% of pixels show elevated error levels. ` +
    `${meanError < 5 ? 'Uniform error distribution — consistent with original camera JPEG. No signs of manipulation.' :
      meanError < 15 ? 'Moderate error variation — could indicate multiple save generations or minor edits.' :
      'High error variation — possible image manipulation or compositing detected.'}. ` +
    `For physical object photography, uniform ELA is expected and indicates authentic capture.`;

  return { diffMap, width, height, meanError, maxError, suspiciousRegions, summary };
}
