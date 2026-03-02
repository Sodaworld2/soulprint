// Cross-Analysis Panel — consistency meters + feature match summary
import React from 'react';
import type { CrossImageAnalysis } from '../../types/forensic';

interface Props {
  cross: CrossImageAnalysis | null;
}

const Meter: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div>
    <div className="flex justify-between text-xs mb-1">
      <span className="text-slate-400">{label}</span>
      <span className="font-mono text-slate-300">{(value * 100).toFixed(0)}%</span>
    </div>
    <div className="w-full bg-slate-700 rounded-full h-2">
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${value * 100}%`, backgroundColor: color }}
      />
    </div>
  </div>
);

const CrossAnalysisPanel: React.FC<Props> = ({ cross }) => {
  if (!cross) {
    return <p className="text-sm text-slate-500 py-4">Cross-analysis will appear after processing multiple images.</p>;
  }

  const totalMatches = cross.featureMatches.reduce((s, m) => s + m.matchCount, 0);
  const avgDist = cross.featureMatches.length > 0
    ? cross.featureMatches.reduce((s, m) => s + m.avgDistance, 0) / cross.featureMatches.length
    : 0;

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-slate-200">Cross-Image Consistency</h4>

      <div className="space-y-3">
        <Meter label="Color Consistency" value={cross.colorConsistency} color="#a78bfa" />
        <Meter label="Noise Consistency" value={cross.noiseConsistency} color="#34d399" />
        <Meter label="EXIF Consistency" value={cross.exifConsistency} color="#60a5fa" />
      </div>

      <div className="border-t border-slate-700 pt-3">
        <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Feature Matching</h5>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-indigo-400">{totalMatches}</p>
            <p className="text-xs text-slate-400">Total Matches</p>
          </div>
          <div className="bg-slate-800 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-emerald-400">{cross.featureMatches.length}</p>
            <p className="text-xs text-slate-400">Image Pairs</p>
          </div>
        </div>
        {cross.featureMatches.length > 0 && (
          <p className="text-xs text-slate-400 mt-2">
            Avg match distance: {avgDist.toFixed(3)} — {avgDist < 0.3 ? 'very strong correspondence' : avgDist < 0.6 ? 'moderate correspondence' : 'weak correspondence'}
          </p>
        )}
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">{cross.summary}</p>
    </div>
  );
};

export default CrossAnalysisPanel;
