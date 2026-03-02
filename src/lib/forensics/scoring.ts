// Soulprint Index Scoring — 0-100 overall with sub-scores
import type { ImageAnalysis, CrossImageAnalysis, SoulprintIndex } from '../../types/forensic';

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function computeSoulprintIndex(
  analyses: ImageAnalysis[],
  cross: CrossImageAnalysis
): SoulprintIndex {
  // Authenticity (0-100): Based on ELA consistency and noise uniformity
  const avgELA = analyses.reduce((s, a) => s + a.ela.meanError, 0) / analyses.length;
  const avgNoiseUniformity = analyses.reduce((s, a) => s + a.noise.uniformity, 0) / analyses.length;
  const authenticity = clamp(
    (avgELA < 5 ? 95 : avgELA < 10 ? 80 : avgELA < 20 ? 60 : 30) * 0.6 +
    avgNoiseUniformity * 100 * 0.4,
    0, 100
  );

  // Consistency (0-100): Cross-image agreement
  const consistency = clamp(
    cross.colorConsistency * 35 +
    cross.noiseConsistency * 25 +
    cross.exifConsistency * 20 +
    (cross.featureMatches.length > 0
      ? Math.min(1, cross.featureMatches.reduce((s, m) => s + m.matchCount, 0) / (cross.featureMatches.length * 50)) * 20
      : 10),
    0, 100
  );

  // Complexity (0-100): How rich and detailed is the subject
  const avgEntropy = analyses.reduce((s, a) => s + a.entropy.globalEntropy, 0) / analyses.length;
  const avgFeatures = analyses.reduce((s, a) => s + a.features.count, 0) / analyses.length;
  const avgEdgeDensity = analyses.reduce((s, a) => s + a.edges.edgeDensity, 0) / analyses.length;
  const complexity = clamp(
    (avgEntropy / 8) * 40 +
    Math.min(1, avgFeatures / 300) * 30 +
    Math.min(1, avgEdgeDensity / 0.3) * 30,
    0, 100
  );

  // Uniqueness (0-100): How distinctive is the fingerprint
  const avgSpectralEntropy = analyses.reduce((s, a) => s + a.fft.spectralEntropy, 0) / analyses.length;
  const colorDiversity = analyses.reduce((s, a) => s + a.colorDNA.dominantColors.length, 0) / analyses.length;
  const uniqueness = clamp(
    avgSpectralEntropy * 50 +
    (colorDiversity / 5) * 30 +
    Math.min(1, avgFeatures / 200) * 20,
    0, 100
  );

  // Material Quality (0-100): Signal quality of the source images
  const avgSNR = analyses.reduce((s, a) => s + a.noise.snr, 0) / analyses.length;
  const avgDynRange = analyses.reduce((s, a) => {
    const gray = a.statistics.channels.gray;
    return s + (gray.max - gray.min) / 255;
  }, 0) / analyses.length;
  const materialQuality = clamp(
    Math.min(1, avgSNR / 30) * 50 +
    avgDynRange * 30 +
    (analyses.length >= 10 ? 20 : analyses.length >= 5 ? 15 : 10),
    0, 100
  );

  // Overall: weighted average
  const overall = Math.round(
    authenticity * 0.25 +
    consistency * 0.25 +
    complexity * 0.20 +
    uniqueness * 0.15 +
    materialQuality * 0.15
  );

  const grade: SoulprintIndex['grade'] =
    overall >= 90 ? 'S' :
    overall >= 75 ? 'A' :
    overall >= 60 ? 'B' :
    overall >= 45 ? 'C' :
    overall >= 30 ? 'D' : 'F';

  const summary = `Soulprint Index: ${overall}/100 (Grade ${grade}). ` +
    `Authenticity ${Math.round(authenticity)}: ${authenticity > 80 ? 'images appear authentic and unmanipulated' : 'some authenticity concerns'}. ` +
    `Consistency ${Math.round(consistency)}: ${consistency > 80 ? 'strong cross-image agreement' : 'some variation across images'}. ` +
    `Complexity ${Math.round(complexity)}: ${complexity > 70 ? 'highly detailed subject with rich texture' : 'moderate detail level'}. ` +
    `Uniqueness ${Math.round(uniqueness)}: ${uniqueness > 70 ? 'distinctive visual fingerprint' : 'moderate distinguishability'}. ` +
    `Material Quality ${Math.round(materialQuality)}: ${materialQuality > 70 ? 'high-quality source imagery' : 'adequate source quality'}.`;

  return {
    overall,
    grade,
    subScores: {
      authenticity: Math.round(authenticity),
      consistency: Math.round(consistency),
      complexity: Math.round(complexity),
      uniqueness: Math.round(uniqueness),
      materialQuality: Math.round(materialQuality),
    },
    summary,
  };
}
