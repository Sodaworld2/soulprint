// Forensic Report — Full printable report for a completed Soulprint
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Fingerprint, ArrowLeft, Calendar, Image, Shield, Loader } from 'lucide-react';
import { loadSoulprint } from '../lib/db';
import AnalysisPanels from '../components/lab/AnalysisPanels';
import CrossAnalysisPanel from '../components/lab/CrossAnalysisPanel';
import SoulprintScore from '../components/lab/SoulprintScore';
import PointCloudViewer from '../components/PointCloudViewer';
import type { SoulprintReport } from '../types/forensic';

const ForensicReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [report, setReport] = useState<SoulprintReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);

  useEffect(() => {
    if (!id) return;
    loadSoulprint(id).then((r) => {
      setReport(r);
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-3 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-300">Soulprint Not Found</h2>
          <p className="text-sm text-slate-500 mt-1">This report may have been deleted.</p>
          <Link to="/lab" className="text-indigo-400 hover:text-indigo-300 text-sm mt-3 inline-block">
            ← Back to Lab
          </Link>
        </div>
      </div>
    );
  }

  const selectedAnalysis = report.analyses[selectedImageIdx] || null;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link to="/lab" className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300 mb-2">
            <ArrowLeft className="w-4 h-4" /> Back to Lab
          </Link>
          <div className="flex items-center gap-3">
            <Fingerprint className="w-8 h-8 text-indigo-400" />
            <div>
              <h1 className="text-2xl font-bold text-slate-100">{report.name}</h1>
              <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(report.createdAt).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Image className="w-3 h-3" />
                  {report.images.length} images
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Soulprint ID */}
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
        <p className="text-xs text-indigo-300 font-semibold uppercase tracking-wider mb-1">Soulprint ID</p>
        <p className="text-lg font-mono text-indigo-200 break-all">{report.id}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {report.phashes.map((h, i) => (
            <span key={i} className="text-[10px] font-mono bg-indigo-900/30 text-indigo-300 px-1.5 py-0.5 rounded">
              {h}
            </span>
          ))}
        </div>
      </div>

      {/* Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Soulprint Index</h3>
          <SoulprintScore index={report.soulprintIndex} />
        </div>
        <div className="md:col-span-2 bg-slate-800/50 rounded-xl border border-slate-700 p-6">
          <CrossAnalysisPanel cross={report.crossAnalysis} />
        </div>
      </div>

      {/* 3D Model */}
      {report.model3d && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-3">3D Scan: {report.model3d.filename}</h3>
          <PointCloudViewer modelBlob={report.model3d.blob} filename={report.model3d.filename} />
        </div>
      )}

      {/* Image selector */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 mb-3">Per-Image Analysis</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {report.images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setSelectedImageIdx(i)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all
                ${selectedImageIdx === i ? 'border-indigo-400 ring-2 ring-indigo-400/30' : 'border-slate-700 hover:border-slate-500'}`}
            >
              <img src={img.thumbnail} alt={img.name} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Showing: {report.images[selectedImageIdx]?.name}
        </p>
        <AnalysisPanels analysis={selectedAnalysis} />
      </div>
    </div>
  );
};

export default ForensicReportPage;
