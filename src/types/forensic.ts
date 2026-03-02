// Soulprint Forensic Lab — Type Definitions

export interface ForensicImage {
  id: string;
  file: File;
  name: string;
  thumbnail: string; // data URL
  width: number;
  height: number;
  status: 'pending' | 'analyzing' | 'complete' | 'error';
  analysis?: ImageAnalysis;
  error?: string;
}

export interface ImageAnalysis {
  imageId: string;
  timestamp: number;
  colorDNA: ColorDNA;
  exif: ExifData;
  phash: string; // 64-bit hex
  features: FeaturePoints;
  edges: EdgeAnalysis;
  entropy: EntropyMap;
  statistics: StatisticalMoments;
  fft: FFTAnalysis;
  ela: ELAResult;
  noise: NoiseProfile;
}

export interface ColorDNA {
  histogram: { r: number[]; g: number[]; b: number[] }; // 256 bins each
  labProfile: { l: number; a: number; b: number }; // average LAB
  dominantColors: Array<{ rgb: [number, number, number]; percentage: number }>;
  colorTemperature: number; // Kelvin estimate
  saturationMean: number;
  summary: string;
}

export interface ExifData {
  make?: string;
  model?: string;
  dateTime?: string;
  focalLength?: number;
  aperture?: number;
  iso?: number;
  exposureTime?: string;
  gps?: { lat: number; lon: number };
  software?: string;
  imageWidth?: number;
  imageHeight?: number;
  orientation?: number;
  raw: Record<string, unknown>;
  summary: string;
}

export interface FeaturePoints {
  corners: Array<{ x: number; y: number; strength: number }>;
  descriptors: Float32Array[];
  count: number;
  summary: string;
}

export interface EdgeAnalysis {
  magnitude: Float32Array; // flattened gradient magnitude
  directionHistogram: number[]; // 36 bins (0-360 degrees)
  edgeDensity: number; // 0-1
  width: number;
  height: number;
  summary: string;
}

export interface EntropyMap {
  grid: number[][]; // rows x cols of local entropy values
  globalEntropy: number;
  rows: number;
  cols: number;
  summary: string;
}

export interface StatisticalMoments {
  channels: {
    r: ChannelStats;
    g: ChannelStats;
    b: ChannelStats;
    gray: ChannelStats;
  };
  summary: string;
}

export interface ChannelStats {
  mean: number;
  variance: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
  min: number;
  max: number;
}

export interface FFTAnalysis {
  magnitudeSpectrum: Float32Array; // flattened 2D magnitude
  width: number;
  height: number;
  dominantFrequency: number;
  spectralEntropy: number;
  summary: string;
}

export interface ELAResult {
  diffMap: Uint8ClampedArray; // difference image RGBA
  width: number;
  height: number;
  meanError: number;
  maxError: number;
  suspiciousRegions: number;
  summary: string;
}

export interface NoiseProfile {
  estimatedNoise: number; // stddev of noise
  snr: number; // signal-to-noise ratio
  uniformity: number; // 0-1, how uniform the noise is
  summary: string;
}

export interface CrossImageAnalysis {
  colorConsistency: number; // 0-1
  noiseConsistency: number; // 0-1
  exifConsistency: number; // 0-1
  featureMatches: Array<{
    imageA: string;
    imageB: string;
    matchCount: number;
    avgDistance: number;
  }>;
  textureSignature: number[];
  summary: string;
}

export interface SoulprintIndex {
  overall: number; // 0-100
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  subScores: {
    authenticity: number;
    consistency: number;
    complexity: number;
    uniqueness: number;
    materialQuality: number;
  };
  summary: string;
}

export interface SoulprintReport {
  id: string;
  name: string;
  createdAt: number;
  images: ForensicImage[];
  analyses: ImageAnalysis[];
  crossAnalysis: CrossImageAnalysis;
  soulprintIndex: SoulprintIndex;
  model3d?: { blob: Blob; filename: string };
  phashes: string[];
}

export type PipelineStage =
  | 'idle'
  | 'uploading'
  | 'analyzing'
  | 'cross-analysis'
  | 'scoring'
  | 'complete'
  | 'error';

export interface PipelineState {
  stage: PipelineStage;
  currentImage: number;
  totalImages: number;
  currentEngine: string;
  progress: number; // 0-100
  error?: string;
}

export interface ComparisonResult {
  soulprintId: string;
  soulprintName: string;
  hashSimilarity: number; // 0-1
  featureCorrelation: number; // 0-1
  colorSimilarity: number; // 0-1
  overallSimilarity: number; // 0-1
  verdict: 'match' | 'similar' | 'different';
  summary: string;
}
