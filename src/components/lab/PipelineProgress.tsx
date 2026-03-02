// Pipeline Progress — vertical step indicator with active/done states
import React from 'react';
import { CheckCircle, Loader, Circle } from 'lucide-react';
import type { PipelineState, PipelineStage } from '../../types/forensic';

const STAGES: { key: PipelineStage; label: string }[] = [
  { key: 'uploading', label: 'Loading Images' },
  { key: 'analyzing', label: 'Forensic Analysis' },
  { key: 'cross-analysis', label: 'Cross-Image Analysis' },
  { key: 'scoring', label: 'Soulprint Scoring' },
  { key: 'complete', label: 'Report Ready' },
];

interface Props {
  state: PipelineState;
}

const stageOrder = (stage: PipelineStage): number => {
  const idx = STAGES.findIndex((s) => s.key === stage);
  return idx >= 0 ? idx : -1;
};

const PipelineProgress: React.FC<Props> = ({ state }) => {
  const currentIdx = stageOrder(state.stage);

  return (
    <div className="space-y-1">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Pipeline</h3>
      {STAGES.map((s, i) => {
        const isDone = currentIdx > i || (state.stage === 'complete' && i <= currentIdx);
        const isActive = currentIdx === i && state.stage !== 'idle' && state.stage !== 'error';

        return (
          <div key={s.key} className="flex items-center gap-3 py-2">
            {isDone ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : isActive ? (
              <Loader className="w-5 h-5 text-indigo-400 animate-spin flex-shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-slate-600 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${isDone ? 'text-emerald-400' : isActive ? 'text-indigo-300' : 'text-slate-500'}`}>
                {s.label}
              </p>
              {isActive && state.currentEngine && (
                <p className="text-xs text-slate-400 truncate">{state.currentEngine}</p>
              )}
            </div>
            {isActive && (
              <span className="text-xs text-indigo-400 font-mono">{state.progress}%</span>
            )}
          </div>
        );
      })}

      {/* Image progress during analysis */}
      {state.stage === 'analyzing' && state.totalImages > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Image {state.currentImage + 1} of {state.totalImages}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${((state.currentImage + state.progress / 100) / state.totalImages) * 100}%` }}
            />
          </div>
        </div>
      )}

      {state.stage === 'error' && state.error && (
        <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg">
          <p className="text-sm text-rose-400">{state.error}</p>
        </div>
      )}
    </div>
  );
};

export default PipelineProgress;
