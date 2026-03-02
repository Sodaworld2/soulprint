// Cross-Image Consistency Analysis
import type { ImageAnalysis, CrossImageAnalysis } from '../../types/forensic';
import { matchAllPairs } from './matching';

function colorHistogramSimilarity(a: number[], b: number[]): number {
  // Bhattacharyya coefficient
  let sum = 0;
  const totalA = a.reduce((s, v) => s + v, 0) || 1;
  const totalB = b.reduce((s, v) => s + v, 0) || 1;
  for (let i = 0; i < a.length; i++) {
    sum += Math.sqrt((a[i] / totalA) * (b[i] / totalB));
  }
  return sum; // 0 = no similarity, 1 = identical
}

export function computeCrossAnalysis(analyses: ImageAnalysis[]): CrossImageAnalysis {
  if (analyses.length < 2) {
    return {
      colorConsistency: 1,
      noiseConsistency: 1,
      exifConsistency: 1,
      featureMatches: [],
      textureSignature: [],
      summary: 'Single image — cross-analysis requires multiple images.',
    };
  }

  // Color consistency: average pairwise histogram similarity
  let colorSim = 0, colorPairs = 0;
  for (let i = 0; i < analyses.length; i++) {
    for (let j = i + 1; j < analyses.length; j++) {
      const rSim = colorHistogramSimilarity(analyses[i].colorDNA.histogram.r, analyses[j].colorDNA.histogram.r);
      const gSim = colorHistogramSimilarity(analyses[i].colorDNA.histogram.g, analyses[j].colorDNA.histogram.g);
      const bSim = colorHistogramSimilarity(analyses[i].colorDNA.histogram.b, analyses[j].colorDNA.histogram.b);
      colorSim += (rSim + gSim + bSim) / 3;
      colorPairs++;
    }
  }
  const colorConsistency = colorPairs > 0 ? colorSim / colorPairs : 1;

  // Noise consistency: compare noise levels
  const noiseLevels = analyses.map((a) => a.noise.estimatedNoise);
  const noiseMean = noiseLevels.reduce((s, v) => s + v, 0) / noiseLevels.length;
  const noiseVar = noiseLevels.reduce((s, v) => s + (v - noiseMean) ** 2, 0) / noiseLevels.length;
  const noiseConsistency = noiseMean > 0 ? Math.max(0, 1 - Math.sqrt(noiseVar) / noiseMean) : 1;

  // EXIF consistency: check camera model and settings match
  const cameras = new Set(analyses.map((a) => `${a.exif.make || ''}|${a.exif.model || ''}`));
  const exifConsistency = cameras.size <= 1 ? 1 : Math.max(0, 1 - (cameras.size - 1) * 0.3);

  // Feature matching across pairs
  const featureMatches = matchAllPairs(
    analyses.map((a) => ({ id: a.imageId, descriptors: a.features.descriptors }))
  );

  // Texture signature: aggregate entropy grid values
  const textureSignature: number[] = [];
  if (analyses[0]?.entropy?.grid) {
    const rows = analyses[0].entropy.rows;
    const cols = analyses[0].entropy.cols;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const avg = analyses.reduce((s, a) => s + (a.entropy.grid[r]?.[c] ?? 0), 0) / analyses.length;
        textureSignature.push(avg);
      }
    }
  }

  const avgMatches = featureMatches.length > 0
    ? featureMatches.reduce((s, m) => s + m.matchCount, 0) / featureMatches.length
    : 0;

  const summary = `Cross-analysis of ${analyses.length} images: ` +
    `Color consistency ${(colorConsistency * 100).toFixed(0)}% — ${colorConsistency > 0.8 ? 'images share very similar color profiles (same subject/lighting)' : 'noticeable color variation across images'}. ` +
    `Noise consistency ${(noiseConsistency * 100).toFixed(0)}% — ${noiseConsistency > 0.8 ? 'uniform noise levels suggest same camera/conditions' : 'varying noise levels suggest different lighting or settings'}. ` +
    `EXIF consistency ${(exifConsistency * 100).toFixed(0)}% — ${exifConsistency === 1 ? 'all images from same device' : 'multiple devices detected'}. ` +
    `Average ${avgMatches.toFixed(0)} feature matches per image pair — ${avgMatches > 50 ? 'strong structural correspondence' : avgMatches > 10 ? 'moderate correspondence' : 'weak correspondence (different viewpoints)'}.`;

  return { colorConsistency, noiseConsistency, exifConsistency, featureMatches, textureSignature, summary };
}
