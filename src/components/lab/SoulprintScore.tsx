// Soulprint Score — canvas gauge + sub-score bars
import React, { useRef, useEffect } from 'react';
import type { SoulprintIndex } from '../../types/forensic';

interface Props {
  index: SoulprintIndex | null;
}

const gradeColors: Record<string, string> = {
  S: '#a78bfa', A: '#34d399', B: '#60a5fa', C: '#fbbf24', D: '#f97316', F: '#ef4444',
};

const SoulprintScore: React.FC<Props> = ({ index }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!index || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const size = 160;
    canvas.width = size * 2; // retina
    canvas.height = size * 2;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(2, 2);

    const cx = size / 2, cy = size / 2, r = 60;
    const startAngle = Math.PI * 0.75;
    const endAngle = Math.PI * 2.25;
    const scoreAngle = startAngle + (index.overall / 100) * (endAngle - startAngle);
    const color = gradeColors[index.grade] || '#6366f1';

    // Background arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Score arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, scoreAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Score text
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${index.overall}`, cx, cy - 4);

    // Grade
    ctx.fillStyle = color;
    ctx.font = 'bold 16px Inter, sans-serif';
    ctx.fillText(`Grade ${index.grade}`, cx, cy + 22);
  }, [index]);

  if (!index) {
    return (
      <div className="text-center py-8">
        <div className="w-32 h-32 mx-auto rounded-full border-4 border-slate-700 flex items-center justify-center">
          <span className="text-2xl text-slate-500">—</span>
        </div>
        <p className="text-sm text-slate-500 mt-3">Score pending analysis</p>
      </div>
    );
  }

  const subScores = [
    { label: 'Authenticity', value: index.subScores.authenticity, color: '#a78bfa' },
    { label: 'Consistency', value: index.subScores.consistency, color: '#34d399' },
    { label: 'Complexity', value: index.subScores.complexity, color: '#60a5fa' },
    { label: 'Uniqueness', value: index.subScores.uniqueness, color: '#fbbf24' },
    { label: 'Material Quality', value: index.subScores.materialQuality, color: '#f472b6' },
  ];

  return (
    <div>
      <div className="flex justify-center">
        <canvas ref={canvasRef} />
      </div>
      <div className="space-y-2 mt-2">
        {subScores.map((s) => (
          <div key={s.label}>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="text-slate-400">{s.label}</span>
              <span className="text-slate-300 font-mono">{s.value}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${s.value}%`, backgroundColor: s.color }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-3 leading-relaxed">{index.summary}</p>
    </div>
  );
};

export default SoulprintScore;
