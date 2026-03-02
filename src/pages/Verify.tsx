// Verify Page — Upload suspicious image, compare against all stored Soulprints
import React, { useState, useCallback, useRef } from 'react';
import { ShieldCheck, Upload, Loader, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { getAllPhashes, loadSoulprint } from '../lib/db';
import { computePhash, hashSimilarity } from '../lib/forensics/phash';
import { analyzeColorDNA } from '../lib/forensics/colorDNA';
import { detectFeatures } from '../lib/forensics/features';
import { matchDescriptors } from '../lib/forensics/matching';
import type { ComparisonResult } from '../types/forensic';

function colorHistogramSimilarity(a: number[], b: number[]): number {
  let sum = 0;
  const totalA = a.reduce((s, v) => s + v, 0) || 1;
  const totalB = b.reduce((s, v) => s + v, 0) || 1;
  for (let i = 0; i < a.length; i++) {
    sum += Math.sqrt((a[i] / totalA) * (b[i] / totalB));
  }
  return sum;
}

const Verify: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [results, setResults] = useState<ComparisonResult[]>([]);
  const [hasCompared, setHasCompared] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setResults([]);
    setHasCompared(false);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) handleFile(f);
  }, [handleFile]);

  const runComparison = useCallback(async () => {
    if (!file) return;
    setComparing(true);
    setResults([]);

    try {
      // Decode the uploaded image
      const bitmap = await createImageBitmap(file);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(bitmap, 0, 0);
      const { data: pixels, width, height } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);

      // Compute forensics on the uploaded image
      const queryHash = computePhash(pixels, width, height);
      const queryColor = analyzeColorDNA(pixels, width, height);
      const queryFeatures = detectFeatures(pixels, width, height);

      // Get all stored soulprints
      const stored = await getAllPhashes();
      const compResults: ComparisonResult[] = [];

      for (const sp of stored) {
        // Hash similarity (fast)
        let bestHashSim = 0;
        for (const storedHash of sp.phashes) {
          const sim = hashSimilarity(queryHash, storedHash);
          if (sim > bestHashSim) bestHashSim = sim;
        }

        // Load full report for deeper comparison if hash shows promise
        let featureCorrelation = 0;
        let colorSim = 0;

        if (bestHashSim > 0.5) {
          const report = await loadSoulprint(sp.soulprintId);
          if (report && report.analyses.length > 0) {
            // Color similarity against first analysis
            const storedColor = report.analyses[0].colorDNA;
            const rSim = colorHistogramSimilarity(queryColor.histogram.r, storedColor.histogram.r);
            const gSim = colorHistogramSimilarity(queryColor.histogram.g, storedColor.histogram.g);
            const bSim = colorHistogramSimilarity(queryColor.histogram.b, storedColor.histogram.b);
            colorSim = (rSim + gSim + bSim) / 3;

            // Feature matching against best image
            let bestMatches = 0;
            for (const analysis of report.analyses) {
              const matches = matchDescriptors(queryFeatures.descriptors, analysis.features.descriptors);
              if (matches.length > bestMatches) bestMatches = matches.length;
            }
            featureCorrelation = Math.min(1, bestMatches / 50);
          }
        }

        const overallSimilarity = bestHashSim * 0.4 + colorSim * 0.3 + featureCorrelation * 0.3;

        const verdict: ComparisonResult['verdict'] =
          overallSimilarity > 0.75 ? 'match' :
          overallSimilarity > 0.5 ? 'similar' : 'different';

        const summary = verdict === 'match'
          ? `Strong match detected. Hash similarity ${(bestHashSim * 100).toFixed(0)}%, color match ${(colorSim * 100).toFixed(0)}%, feature correlation ${(featureCorrelation * 100).toFixed(0)}%. This image very likely depicts the same subject as the registered Soulprint.`
          : verdict === 'similar'
          ? `Partial similarity found. Some visual characteristics match but not enough for a definitive match. Manual review recommended.`
          : `No significant match. This image does not appear to match the registered Soulprint.`;

        compResults.push({
          soulprintId: sp.soulprintId,
          soulprintName: sp.name,
          hashSimilarity: bestHashSim,
          featureCorrelation,
          colorSimilarity: colorSim,
          overallSimilarity,
          verdict,
          summary,
        });
      }

      // Sort by similarity
      compResults.sort((a, b) => b.overallSimilarity - a.overallSimilarity);
      setResults(compResults);
      setHasCompared(true);
    } catch (err) {
      console.error('Comparison failed:', err);
    } finally {
      setComparing(false);
    }
  }, [file]);

  const verdictConfig = {
    match: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', label: 'MATCH' },
    similar: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', label: 'SIMILAR' },
    different: { icon: XCircle, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30', label: 'NO MATCH' },
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-7 h-7 text-indigo-400" />
        <div>
          <h1 className="text-xl font-bold text-slate-100">Soulprint Verification</h1>
          <p className="text-xs text-slate-400">Upload a suspicious image to compare against all registered Soulprints</p>
        </div>
      </div>

      {/* Upload */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-indigo-500/40 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-500/5 transition-all"
      >
        {preview ? (
          <div className="flex items-center justify-center gap-6">
            <img src={preview} alt="Upload" className="w-32 h-32 object-contain rounded-lg" />
            <div className="text-left">
              <p className="text-sm font-medium text-slate-200">{file?.name}</p>
              <p className="text-xs text-slate-400 mt-1">Click or drop to replace</p>
            </div>
          </div>
        ) : (
          <>
            <Upload className="w-10 h-10 mx-auto mb-3 text-indigo-400" />
            <p className="text-lg font-medium text-slate-200">Drop a suspicious image here</p>
            <p className="text-sm text-slate-400 mt-1">Compare against all registered Soulprints</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          className="hidden"
        />
      </div>

      {/* Compare button */}
      {file && !comparing && (
        <button
          onClick={runComparison}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
        >
          <ShieldCheck className="w-5 h-5" />
          Compare Against Registered Soulprints
        </button>
      )}

      {comparing && (
        <div className="text-center py-8">
          <Loader className="w-8 h-8 mx-auto mb-3 text-indigo-400 animate-spin" />
          <p className="text-sm text-slate-400">Analyzing and comparing...</p>
        </div>
      )}

      {/* Results */}
      {hasCompared && results.length === 0 && (
        <div className="text-center py-8 bg-slate-800/50 rounded-xl border border-slate-700">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-slate-600" />
          <p className="text-sm text-slate-400">No registered Soulprints to compare against.</p>
          <p className="text-xs text-slate-500 mt-1">Register a Soulprint in the Forensic Lab first.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-300">
            Comparison Results ({results.length} Soulprint{results.length !== 1 ? 's' : ''} checked)
          </h3>
          {results.map((r) => {
            const config = verdictConfig[r.verdict];
            const Icon = config.icon;
            return (
              <div key={r.soulprintId} className={`rounded-xl border p-4 ${config.bg}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-6 h-6 ${config.color}`} />
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{r.soulprintName}</p>
                      <p className="text-xs text-slate-400 font-mono">{r.soulprintId}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${config.color}`}>
                    {config.label} — {(r.overallSimilarity * 100).toFixed(0)}%
                  </span>
                </div>

                {/* Sub-scores */}
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {[
                    { label: 'Hash Match', value: r.hashSimilarity },
                    { label: 'Color Match', value: r.colorSimilarity },
                    { label: 'Feature Match', value: r.featureCorrelation },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-slate-400">{s.label}</span>
                        <span className="text-slate-300 font-mono">{(s.value * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-1">
                        <div
                          className="h-1 rounded-full transition-all"
                          style={{
                            width: `${s.value * 100}%`,
                            backgroundColor: s.value > 0.75 ? '#34d399' : s.value > 0.5 ? '#fbbf24' : '#64748b',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-slate-400 mt-3 leading-relaxed">{r.summary}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Verify;
