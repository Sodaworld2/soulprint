// Shannon Entropy Map — 8x8 grid of local entropy values
import type { EntropyMap } from '../../types/forensic';

function shannonEntropy(data: number[], bins: number = 256): number {
  const hist = new Array(bins).fill(0);
  for (const val of data) hist[Math.min(bins - 1, Math.floor(val))]++;
  const total = data.length;
  let entropy = 0;
  for (let i = 0; i < bins; i++) {
    if (hist[i] === 0) continue;
    const p = hist[i] / total;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export function analyzeEntropy(pixels: Uint8ClampedArray, width: number, height: number): EntropyMap {
  const rows = 8, cols = 8;
  const blockW = Math.floor(width / cols);
  const blockH = Math.floor(height / rows);
  const grid: number[][] = [];
  let totalEntropy = 0;
  let minE = Infinity, maxE = 0;

  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      const values: number[] = [];
      const startX = c * blockW, startY = r * blockH;
      for (let y = startY; y < startY + blockH && y < height; y++) {
        for (let x = startX; x < startX + blockW && x < width; x++) {
          const i = (y * width + x) * 4;
          // Grayscale
          values.push(pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114);
        }
      }
      const e = shannonEntropy(values);
      row.push(e);
      totalEntropy += e;
      if (e < minE) minE = e;
      if (e > maxE) maxE = e;
    }
    grid.push(row);
  }

  const globalEntropy = totalEntropy / (rows * cols);
  const entropyRange = maxE - minE;

  const summary = `Global entropy is ${globalEntropy.toFixed(2)} bits (max 8.0). ` +
    `${globalEntropy > 7 ? 'Very high information density — complex textures and patterns' :
      globalEntropy > 5 ? 'Moderate information content — mix of detailed and smooth regions' :
      'Low entropy — relatively uniform surface'}. ` +
    `Entropy range across blocks: ${minE.toFixed(2)} to ${maxE.toFixed(2)} (spread: ${entropyRange.toFixed(2)}). ` +
    `${entropyRange > 3 ? 'Large variation indicates distinct regions of detail and smoothness' :
      'Consistent entropy suggests uniform texture distribution'}.`;

  return { grid, globalEntropy, rows, cols, summary };
}
