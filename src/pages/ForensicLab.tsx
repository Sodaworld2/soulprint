// Forensic Lab — Main page for Soulprint forensic analysis
import React, { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Fingerprint, Play, Save, RotateCw } from 'lucide-react';
import BatchUploader from '../components/lab/BatchUploader';
import PipelineProgress from '../components/lab/PipelineProgress';
import ImageStrip from '../components/lab/ImageStrip';
import AnalysisPanels from '../components/lab/AnalysisPanels';
import CrossAnalysisPanel from '../components/lab/CrossAnalysisPanel';
import SoulprintScore from '../components/lab/SoulprintScore';
import PointCloudViewer from '../components/PointCloudViewer';
import * as Comlink from 'comlink';
import { getForensicWorker, terminateWorker } from '../lib/forensicWorkerClient';
import { saveSoulprint } from '../lib/db';
import type {
  ForensicImage, ImageAnalysis, CrossImageAnalysis,
  SoulprintIndex, PipelineState, SoulprintReport,
} from '../types/forensic';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

async function createThumbnail(file: File): Promise<{ thumbnail: string; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const maxDim = 128;
  const scale = Math.min(maxDim / bitmap.width, maxDim / bitmap.height, 1);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 });
  const reader = new FileReader();
  const dataUrl = await new Promise<string>((resolve) => {
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
  return { thumbnail: dataUrl, width: bitmap.width, height: bitmap.height };
}

const ForensicLab: React.FC = () => {
  const navigate = useNavigate();
  const [images, setImages] = useState<ForensicImage[]>([]);
  const [analyses, setAnalyses] = useState<Map<string, ImageAnalysis>>(new Map());
  const [crossAnalysis, setCrossAnalysis] = useState<CrossImageAnalysis | null>(null);
  const [soulprintIndex, setSoulprintIndex] = useState<SoulprintIndex | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [model3d, setModel3d] = useState<{ blob: Blob; filename: string } | null>(null);
  const [soulprintName, setSoulprintName] = useState('');
  const [pipeline, setPipeline] = useState<PipelineState>({
    stage: 'idle', currentImage: 0, totalImages: 0, currentEngine: '', progress: 0,
  });
  const [saving, setSaving] = useState(false);
  const runningRef = useRef(false);

  const handleImagesSelected = useCallback(async (files: File[]) => {
    const newImages: ForensicImage[] = [];
    for (const file of files) {
      const id = generateId();
      const { thumbnail, width, height } = await createThumbnail(file);
      newImages.push({ id, file, name: file.name, thumbnail, width, height, status: 'pending' });
    }
    setImages((prev) => {
      const updated = [...prev, ...newImages];
      if (!soulprintName && files[0]) {
        setSoulprintName(files[0].name.replace(/\.[^.]+$/, '') + ' — Soulprint');
      }
      return updated;
    });
    if (newImages[0] && !selectedImageId) setSelectedImageId(newImages[0].id);
  }, [selectedImageId, soulprintName]);

  const handleModelSelected = useCallback((file: File) => {
    setModel3d({ blob: file, filename: file.name });
  }, []);

  const runAnalysis = useCallback(async () => {
    if (images.length === 0 || runningRef.current) return;
    runningRef.current = true;
    const worker = getForensicWorker();
    const allAnalyses: ImageAnalysis[] = [];

    try {
      // Stage: analyzing
      setPipeline({ stage: 'analyzing', currentImage: 0, totalImages: images.length, currentEngine: '', progress: 0 });

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        setImages((prev) => prev.map((im) => im.id === img.id ? { ...im, status: 'analyzing' } : im));
        setPipeline((p) => ({ ...p, currentImage: i, currentEngine: 'Starting...' }));

        try {
          const result = await worker.analyzeImage(
            img.file,
            img.id,
            Comlink.proxy((stage: string, progress: number) => {
              setPipeline((p) => ({ ...p, currentEngine: stage, progress }));
            })
          );
          allAnalyses.push(result);
          setAnalyses((prev) => new Map(prev).set(img.id, result));
          setImages((prev) => prev.map((im) => im.id === img.id ? { ...im, status: 'complete', analysis: result } : im));
        } catch (err) {
          console.error(`Analysis failed for ${img.name}:`, err);
          setImages((prev) => prev.map((im) => im.id === img.id ? { ...im, status: 'error', error: String(err) } : im));
        }
      }

      // Stage: cross-analysis
      if (allAnalyses.length >= 2) {
        setPipeline({ stage: 'cross-analysis', currentImage: 0, totalImages: images.length, currentEngine: 'Computing cross-image consistency', progress: 50 });
        const cross = await worker.computeCrossAnalysis(allAnalyses);
        setCrossAnalysis(cross);

        // Stage: scoring
        setPipeline({ stage: 'scoring', currentImage: 0, totalImages: images.length, currentEngine: 'Computing Soulprint Index', progress: 75 });
        const score = await worker.computeScore(allAnalyses, cross);
        setSoulprintIndex(score);
      } else if (allAnalyses.length === 1) {
        // Single image — still compute basic cross analysis & score
        const cross = await worker.computeCrossAnalysis(allAnalyses);
        setCrossAnalysis(cross);
        const score = await worker.computeScore(allAnalyses, cross);
        setSoulprintIndex(score);
      }

      setPipeline({ stage: 'complete', currentImage: images.length, totalImages: images.length, currentEngine: 'Done', progress: 100 });
    } catch (err) {
      setPipeline({ stage: 'error', currentImage: 0, totalImages: images.length, currentEngine: '', progress: 0, error: String(err) });
    } finally {
      runningRef.current = false;
    }
  }, [images]);

  const handleSave = useCallback(async () => {
    if (!crossAnalysis || !soulprintIndex) return;
    setSaving(true);
    const id = generateId();
    const report: SoulprintReport = {
      id,
      name: soulprintName || 'Untitled Soulprint',
      createdAt: Date.now(),
      images,
      analyses: Array.from(analyses.values()),
      crossAnalysis,
      soulprintIndex,
      model3d: model3d || undefined,
      phashes: Array.from(analyses.values()).map((a: ImageAnalysis) => a.phash),
    };
    await saveSoulprint(report);
    setSaving(false);
    navigate(`/report/${id}`);
  }, [soulprintName, images, analyses, crossAnalysis, soulprintIndex, model3d, navigate]);

  const handleReset = useCallback(() => {
    setImages([]);
    setAnalyses(new Map());
    setCrossAnalysis(null);
    setSoulprintIndex(null);
    setSelectedImageId(null);
    setModel3d(null);
    setSoulprintName('');
    setPipeline({ stage: 'idle', currentImage: 0, totalImages: 0, currentEngine: '', progress: 0 });
    terminateWorker();
  }, []);

  const selectedAnalysis = selectedImageId ? analyses.get(selectedImageId) || null : null;
  const isRunning = pipeline.stage !== 'idle' && pipeline.stage !== 'complete' && pipeline.stage !== 'error';
  const isComplete = pipeline.stage === 'complete';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <Fingerprint className="w-7 h-7 text-indigo-400" />
          <div>
            <h1 className="text-xl font-bold text-slate-100">Soulprint Forensic Lab</h1>
            <p className="text-xs text-slate-400">Upload photos for deep forensic analysis and Soulprint registration</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isComplete && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Soulprint'}
            </button>
          )}
          {(isComplete || pipeline.stage === 'error') && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors"
            >
              <RotateCw className="w-4 h-4" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <div className="w-80 border-r border-slate-700 flex flex-col overflow-y-auto p-4 space-y-4 flex-shrink-0">
          <BatchUploader
            onImagesSelected={handleImagesSelected}
            onModelSelected={handleModelSelected}
            disabled={isRunning}
            imageCount={images.length}
          />

          {images.length > 0 && (
            <>
              {/* Name input */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">Soulprint Name</label>
                <input
                  type="text"
                  value={soulprintName}
                  onChange={(e) => setSoulprintName(e.target.value)}
                  placeholder="e.g., Bronze Statue — Studio"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  disabled={isRunning}
                />
              </div>

              {/* Run button */}
              {pipeline.stage === 'idle' && (
                <button
                  onClick={runAnalysis}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
                >
                  <Play className="w-5 h-5" />
                  Analyze {images.length} Image{images.length !== 1 ? 's' : ''}
                </button>
              )}

              <PipelineProgress state={pipeline} />
            </>
          )}

          {/* Score */}
          {(isComplete || soulprintIndex) && (
            <div className="border-t border-slate-700 pt-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Soulprint Index</h3>
              <SoulprintScore index={soulprintIndex} />
            </div>
          )}
        </div>

        {/* Right content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {images.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <Fingerprint className="w-16 h-16 mx-auto mb-4 text-slate-700" />
                <h2 className="text-xl font-semibold text-slate-300 mb-2">Ready for Forensic Analysis</h2>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Upload photos of your artwork, sculpture, or artifact. The forensic engine will analyze
                  color DNA, texture patterns, edge signatures, and more to create a unique Soulprint fingerprint.
                </p>
                <p className="text-xs text-slate-600 mt-3">
                  For best results, upload 10-20+ photos from different angles and lighting conditions.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Image strip */}
              <ImageStrip images={images} selectedId={selectedImageId} onSelect={setSelectedImageId} />

              {/* 3D viewer */}
              {model3d && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">3D Model: {model3d.filename}</h3>
                  <PointCloudViewer modelBlob={model3d.blob} filename={model3d.filename} />
                </div>
              )}

              {/* Per-image analysis panels */}
              {selectedAnalysis && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">
                    Analysis: {images.find((i) => i.id === selectedImageId)?.name}
                  </h3>
                  <AnalysisPanels analysis={selectedAnalysis} />
                </div>
              )}

              {/* Cross analysis */}
              {crossAnalysis && (
                <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                  <CrossAnalysisPanel cross={crossAnalysis} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForensicLab;
