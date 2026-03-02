// Forensic Analysis Web Worker — runs all engines off the main thread
import * as Comlink from 'comlink';
import { analyzeColorDNA } from '../lib/forensics/colorDNA';
import { extractExif } from '../lib/forensics/exifExtractor';
import { computePhash } from '../lib/forensics/phash';
import { detectFeatures } from '../lib/forensics/features';
import { analyzeEdges } from '../lib/forensics/edges';
import { analyzeEntropy } from '../lib/forensics/entropy';
import { analyzeStatistics } from '../lib/forensics/statistics';
import { analyzeFFT } from '../lib/forensics/fft';
import { analyzeELA } from '../lib/forensics/ela';
import { analyzeNoise } from '../lib/forensics/noise';
import { computeCrossAnalysis } from '../lib/forensics/crossAnalysis';
import { computeSoulprintIndex } from '../lib/forensics/scoring';
import type { ImageAnalysis, CrossImageAnalysis, SoulprintIndex } from '../types/forensic';

type ProgressCallback = (stage: string, progress: number) => void;

const api = {
  async analyzeImage(
    file: File,
    imageId: string,
    onProgress?: ProgressCallback
  ): Promise<ImageAnalysis> {
    const report = (stage: string, pct: number) => onProgress?.(stage, pct);

    // Decode image to pixels
    report('Decoding image', 0);
    const bitmap = await createImageBitmap(file);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    const { data: pixels, width, height } = imageData;

    report('Color DNA', 10);
    const colorDNA = analyzeColorDNA(pixels, width, height);

    report('EXIF extraction', 20);
    const exif = await extractExif(file);

    report('Perceptual hash', 30);
    const phash = computePhash(pixels, width, height);

    report('Feature detection', 40);
    const features = detectFeatures(pixels, width, height);

    report('Edge analysis', 50);
    const edges = analyzeEdges(pixels, width, height);

    report('Entropy mapping', 60);
    const entropy = analyzeEntropy(pixels, width, height);

    report('Statistical analysis', 70);
    const statistics = analyzeStatistics(pixels, width, height);

    report('FFT analysis', 80);
    const fft = analyzeFFT(pixels, width, height);

    report('Error level analysis', 85);
    const ela = await analyzeELA(imageData, file);

    report('Noise profiling', 95);
    const noise = analyzeNoise(pixels, width, height);

    report('Complete', 100);

    return {
      imageId,
      timestamp: Date.now(),
      colorDNA,
      exif,
      phash,
      features,
      edges,
      entropy,
      statistics,
      fft,
      ela,
      noise,
    };
  },

  computeCrossAnalysis(analyses: ImageAnalysis[]): CrossImageAnalysis {
    return computeCrossAnalysis(analyses);
  },

  computeScore(analyses: ImageAnalysis[], cross: CrossImageAnalysis): SoulprintIndex {
    return computeSoulprintIndex(analyses, cross);
  },
};

Comlink.expose(api);

export type ForensicWorkerAPI = typeof api;
