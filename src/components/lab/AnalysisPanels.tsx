// Analysis Panels — Canvas visualizations for each forensic analysis type
// Every panel includes a plain-English summary
import React, { useRef, useEffect } from 'react';
import type { ImageAnalysis } from '../../types/forensic';

interface Props {
  analysis: ImageAnalysis | null;
}

// --- Canvas helper ---
function useCanvas(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  deps: unknown[]
) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = 2;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    draw(ctx, w, h);
  }, deps);
  return ref;
}

// --- Panel wrapper ---
const Panel: React.FC<{ title: string; tag: string; summary: string; children: React.ReactNode }> = ({
  title, tag, summary, children,
}) => (
  <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
    <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
      <h4 className="text-sm font-semibold text-slate-200">{title}</h4>
      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider
        ${tag === 'CORE' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-600/30 text-slate-400'}`}>
        {tag}
      </span>
    </div>
    <div className="p-4">{children}</div>
    <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-900/30">
      <p className="text-xs text-slate-400 leading-relaxed">{summary}</p>
    </div>
  </div>
);

// === COLOR DNA ===
const ColorDNAPanel: React.FC<{ analysis: ImageAnalysis }> = ({ analysis }) => {
  const { colorDNA } = analysis;

  const histRef = useCanvas((ctx, w, h) => {
    const maxVal = Math.max(...colorDNA.histogram.r, ...colorDNA.histogram.g, ...colorDNA.histogram.b, 1);
    const barW = w / 256;
    const channels = [
      { data: colorDNA.histogram.r, color: 'rgba(239,68,68,0.5)' },
      { data: colorDNA.histogram.g, color: 'rgba(34,197,94,0.5)' },
      { data: colorDNA.histogram.b, color: 'rgba(59,130,246,0.5)' },
    ];
    for (const ch of channels) {
      ctx.fillStyle = ch.color;
      for (let i = 0; i < 256; i++) {
        const barH = (ch.data[i] / maxVal) * h;
        ctx.fillRect(i * barW, h - barH, barW, barH);
      }
    }
  }, [colorDNA]);

  return (
    <Panel title="Color DNA" tag="CORE" summary={colorDNA.summary}>
      <canvas ref={histRef} className="w-full h-32 rounded" style={{ background: '#0f172a' }} />
      <div className="flex gap-2 mt-3">
        {colorDNA.dominantColors.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div
              className="w-5 h-5 rounded-sm border border-slate-600"
              style={{ backgroundColor: `rgb(${c.rgb.join(',')})` }}
            />
            <span className="text-[10px] text-slate-400 font-mono">{c.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 text-xs text-slate-400">
        <div>Temp: <span className="text-slate-200 font-mono">{colorDNA.colorTemperature}K</span></div>
        <div>Sat: <span className="text-slate-200 font-mono">{(colorDNA.saturationMean * 100).toFixed(0)}%</span></div>
        <div>L*: <span className="text-slate-200 font-mono">{colorDNA.labProfile.l.toFixed(1)}</span></div>
      </div>
    </Panel>
  );
};

// === EXIF ===
const ExifPanel: React.FC<{ analysis: ImageAnalysis }> = ({ analysis }) => {
  const { exif } = analysis;
  const fields = [
    exif.make && ['Camera', `${exif.make} ${exif.model || ''}`],
    exif.dateTime && ['Date', exif.dateTime],
    exif.focalLength && ['Focal Length', `${exif.focalLength}mm`],
    exif.aperture && ['Aperture', `f/${exif.aperture}`],
    exif.iso && ['ISO', `${exif.iso}`],
    exif.exposureTime && ['Exposure', exif.exposureTime],
    exif.gps && ['GPS', `${exif.gps.lat.toFixed(4)}, ${exif.gps.lon.toFixed(4)}`],
  ].filter(Boolean) as [string, string][];

  return (
    <Panel title="EXIF Metadata" tag="CORE" summary={exif.summary}>
      {fields.length > 0 ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
          {fields.map(([k, v]) => (
            <React.Fragment key={k}>
              <span className="text-slate-400">{k}</span>
              <span className="text-slate-200 font-mono truncate">{v}</span>
            </React.Fragment>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No EXIF metadata available</p>
      )}
    </Panel>
  );
};

// === PERCEPTUAL HASH ===
const PhashPanel: React.FC<{ analysis: ImageAnalysis }> = ({ analysis }) => {
  const ref = useCanvas((ctx, w, h) => {
    // Visualize hash as 8x8 grid
    const hash = analysis.phash;
    const cellW = w / 8, cellH = h / 8;
    for (let i = 0; i < 8; i++) {
      const byte = parseInt(hash.substring(i * 2, i * 2 + 2), 16);
      for (let j = 0; j < 8; j++) {
        const bit = (byte >> (7 - j)) & 1;
        ctx.fillStyle = bit ? '#6366f1' : '#1e293b';
        ctx.fillRect(j * cellW, i * cellH, cellW - 1, cellH - 1);
      }
    }
  }, [analysis.phash]);

  return (
    <Panel title="Perceptual Hash" tag="CORE" summary={`dHash fingerprint: ${analysis.phash}. This compact 64-bit hash captures the structural essence of the image. Even if the image is resized, slightly cropped, or color-shifted, this hash will remain similar — enabling fast matching against other images of the same subject.`}>
      <canvas ref={ref} className="w-full h-24 rounded" style={{ background: '#0f172a' }} />
      <p className="text-xs font-mono text-indigo-300 mt-2 break-all">{analysis.phash}</p>
    </Panel>
  );
};

// === FEATURES ===
const FeaturesPanel: React.FC<{ analysis: ImageAnalysis }> = ({ analysis }) => {
  const { features } = analysis;
  const ref = useCanvas((ctx, w, h) => {
    // Plot feature points
    const maxX = Math.max(...features.corners.map((c) => c.x), 1);
    const maxY = Math.max(...features.corners.map((c) => c.y), 1);
    const maxStr = Math.max(...features.corners.map((c) => c.strength), 1);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);
    for (const corner of features.corners) {
      const x = (corner.x / maxX) * w;
      const y = (corner.y / maxY) * h;
      const r = 1.5 + (corner.strength / maxStr) * 3;
      const alpha = 0.3 + (corner.strength / maxStr) * 0.7;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99,102,241,${alpha})`;
      ctx.fill();
    }
  }, [features]);

  return (
    <Panel title="Feature Points" tag="CORE" summary={features.summary}>
      <canvas ref={ref} className="w-full h-32 rounded" />
      <div className="flex gap-4 mt-2 text-xs text-slate-400">
        <span>Corners: <span className="text-slate-200 font-mono">{features.count}</span></span>
        <span>Strongest: <span className="text-slate-200 font-mono">{features.corners[0]?.strength?.toFixed(0) ?? '—'}</span></span>
      </div>
    </Panel>
  );
};

// === EDGES ===
const EdgesPanel: React.FC<{ analysis: ImageAnalysis }> = ({ analysis }) => {
  const { edges } = analysis;
  const dirRef = useCanvas((ctx, w, h) => {
    // Direction histogram as polar-ish bar chart
    const maxVal = Math.max(...edges.directionHistogram, 1);
    const barW = w / 36;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 36; i++) {
      const barH = (edges.directionHistogram[i] / maxVal) * (h - 10);
      const hue = (i * 10) % 360;
      ctx.fillStyle = `hsl(${hue}, 60%, 55%)`;
      ctx.fillRect(i * barW + 1, h - barH, barW - 2, barH);
    }
  }, [edges]);

  return (
    <Panel title="Edge Analysis" tag="CORE" summary={edges.summary}>
      <canvas ref={dirRef} className="w-full h-24 rounded" />
      <div className="flex gap-4 mt-2 text-xs text-slate-400">
        <span>Density: <span className="text-slate-200 font-mono">{(edges.edgeDensity * 100).toFixed(1)}%</span></span>
      </div>
    </Panel>
  );
};

// === ENTROPY ===
const EntropyPanel: React.FC<{ analysis: ImageAnalysis }> = ({ analysis }) => {
  const { entropy } = analysis;
  const ref = useCanvas((ctx, w, h) => {
    const cellW = w / entropy.cols, cellH = h / entropy.rows;
    for (let r = 0; r < entropy.rows; r++) {
      for (let c = 0; c < entropy.cols; c++) {
        const val = entropy.grid[r][c] / 8; // normalize to 0-1
        const intensity = Math.round(val * 255);
        ctx.fillStyle = `rgb(${intensity * 0.4}, ${intensity * 0.5}, ${intensity})`;
        ctx.fillRect(c * cellW, r * cellH, cellW - 1, cellH - 1);
      }
    }
  }, [entropy]);

  return (
    <Panel title="Entropy Map" tag="CORE" summary={entropy.summary}>
      <canvas ref={ref} className="w-full h-24 rounded" style={{ background: '#0f172a' }} />
      <div className="text-xs text-slate-400 mt-2">
        Global entropy: <span className="text-slate-200 font-mono">{entropy.globalEntropy.toFixed(2)}</span> / 8.0 bits
      </div>
    </Panel>
  );
};

// === STATISTICS ===
const StatsPanel: React.FC<{ analysis: ImageAnalysis }> = ({ analysis }) => {
  const { statistics } = analysis;
  const channels = [
    { key: 'R', stats: statistics.channels.r, color: '#ef4444' },
    { key: 'G', stats: statistics.channels.g, color: '#22c55e' },
    { key: 'B', stats: statistics.channels.b, color: '#3b82f6' },
    { key: 'Gray', stats: statistics.channels.gray, color: '#94a3b8' },
  ];

  return (
    <Panel title="Statistical Moments" tag="CORE" summary={statistics.summary}>
      <div className="grid grid-cols-4 gap-2 text-[10px]">
        <div className="text-slate-500"></div>
        {channels.map((c) => (
          <div key={c.key} className="text-center font-semibold" style={{ color: c.color }}>{c.key}</div>
        ))}
        {['mean', 'stdDev', 'skewness', 'kurtosis'].map((metric) => (
          <React.Fragment key={metric}>
            <div className="text-slate-400 capitalize">{metric === 'stdDev' ? 'σ' : metric}</div>
            {channels.map((c) => (
              <div key={c.key} className="text-center font-mono text-slate-300">
                {(c.stats as any)[metric]?.toFixed(1)}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>
    </Panel>
  );
};

// === FFT ===
const FFTPanel: React.FC<{ analysis: ImageAnalysis }> = ({ analysis }) => {
  const { fft } = analysis;
  const ref = useCanvas((ctx, w, h) => {
    // Render magnitude spectrum as heatmap
    const scaleX = fft.width / w, scaleY = fft.height / h;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sx = Math.floor(x * scaleX), sy = Math.floor(y * scaleY);
        const val = fft.magnitudeSpectrum[sy * fft.width + sx] || 0;
        const v = Math.round(val * 255);
        ctx.fillStyle = `rgb(${v * 0.3}, ${v * 0.6}, ${v})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [fft]);

  return (
    <Panel title="FFT Frequency Analysis" tag="ADVANCED" summary={fft.summary}>
      <canvas ref={ref} className="w-full h-32 rounded" style={{ background: '#0f172a' }} />
      <div className="flex gap-4 mt-2 text-xs text-slate-400">
        <span>Dominant freq: <span className="text-slate-200 font-mono">{fft.dominantFrequency.toFixed(0)}</span></span>
        <span>Spectral entropy: <span className="text-slate-200 font-mono">{fft.spectralEntropy.toFixed(3)}</span></span>
      </div>
    </Panel>
  );
};

// === ELA ===
const ELAPanel: React.FC<{ analysis: ImageAnalysis }> = ({ analysis }) => {
  const { ela } = analysis;
  const ref = useCanvas((ctx, w, h) => {
    // Render ELA diff map
    if (!ela.diffMap || ela.diffMap.length === 0) return;
    const imgData = new ImageData(new Uint8ClampedArray(ela.diffMap), ela.width, ela.height);
    const tmpCanvas = new OffscreenCanvas(ela.width, ela.height);
    const tmpCtx = tmpCanvas.getContext('2d')!;
    tmpCtx.putImageData(imgData, 0, 0);
    ctx.drawImage(tmpCanvas, 0, 0, w, h);
  }, [ela]);

  return (
    <Panel title="Error Level Analysis" tag="ADVANCED" summary={ela.summary}>
      <canvas ref={ref} className="w-full h-32 rounded" style={{ background: '#0f172a' }} />
      <div className="flex gap-4 mt-2 text-xs text-slate-400">
        <span>Mean error: <span className="text-slate-200 font-mono">{ela.meanError.toFixed(2)}</span></span>
        <span>Suspicious: <span className="text-slate-200 font-mono">{ela.suspiciousRegions}%</span></span>
      </div>
    </Panel>
  );
};

// === NOISE ===
const NoisePanel: React.FC<{ analysis: ImageAnalysis }> = ({ analysis }) => {
  const { noise } = analysis;
  return (
    <Panel title="Noise Profile" tag="ADVANCED" summary={noise.summary}>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-indigo-400">{noise.estimatedNoise.toFixed(1)}</p>
          <p className="text-[10px] text-slate-400">Noise σ</p>
        </div>
        <div className="bg-slate-900 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-emerald-400">{noise.snr.toFixed(1)}</p>
          <p className="text-[10px] text-slate-400">SNR</p>
        </div>
        <div className="bg-slate-900 rounded-lg p-3 text-center">
          <p className="text-xl font-bold text-amber-400">{(noise.uniformity * 100).toFixed(0)}%</p>
          <p className="text-[10px] text-slate-400">Uniformity</p>
        </div>
      </div>
    </Panel>
  );
};

// === MAIN EXPORT ===
const AnalysisPanels: React.FC<Props> = ({ analysis }) => {
  if (!analysis) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500">Select an image to view its forensic analysis</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ColorDNAPanel analysis={analysis} />
      <ExifPanel analysis={analysis} />
      <PhashPanel analysis={analysis} />
      <FeaturesPanel analysis={analysis} />
      <EdgesPanel analysis={analysis} />
      <EntropyPanel analysis={analysis} />
      <StatsPanel analysis={analysis} />
      <FFTPanel analysis={analysis} />
      <ELAPanel analysis={analysis} />
      <NoisePanel analysis={analysis} />
    </div>
  );
};

export default AnalysisPanels;
