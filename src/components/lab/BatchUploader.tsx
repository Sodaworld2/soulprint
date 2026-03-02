// Batch Uploader — drag-and-drop for 20+ images + optional GLB/OBJ 3D models
import React, { useCallback, useRef } from 'react';
import { Upload, Box } from 'lucide-react';

interface Props {
  onImagesSelected: (files: File[]) => void;
  onModelSelected: (file: File) => void;
  disabled?: boolean;
  imageCount: number;
}

const ACCEPT_IMAGES = '.jpg,.jpeg,.png,.webp,.tiff,.bmp';
const ACCEPT_MODELS = '.glb,.gltf,.obj';

const BatchUploader: React.FC<Props> = ({ onImagesSelected, onModelSelected, disabled, imageCount }) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files) as File[];
    const images = files.filter((f: File) => f.type.startsWith('image/'));
    const models = files.filter((f: File) => /\.(glb|gltf|obj)$/i.test(f.name));
    if (images.length > 0) onImagesSelected(images);
    if (models.length > 0 && models[0]) onModelSelected(models[0]);
  }, [disabled, onImagesSelected, onModelSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) onImagesSelected(files);
    e.target.value = '';
  }, [onImagesSelected]);

  const handleModelChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files[0]) onModelSelected(files[0]);
    e.target.value = '';
  }, [onModelSelected]);

  return (
    <div className="space-y-3">
      {/* Main drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !disabled && imageInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
          ${disabled ? 'border-slate-700 opacity-50 cursor-not-allowed' : 'border-indigo-500/40 hover:border-indigo-400 hover:bg-indigo-500/5'}`}
      >
        <Upload className="w-10 h-10 mx-auto mb-3 text-indigo-400" />
        <p className="text-lg font-medium text-slate-200">
          Drop photos here or click to browse
        </p>
        <p className="text-sm text-slate-400 mt-1">
          JPEG, PNG, WebP — upload 20+ for best results
        </p>
        {imageCount > 0 && (
          <p className="text-sm text-indigo-400 mt-2 font-medium">
            {imageCount} image{imageCount !== 1 ? 's' : ''} loaded
          </p>
        )}
        <input
          ref={imageInputRef}
          type="file"
          accept={ACCEPT_IMAGES}
          multiple
          onChange={handleImageChange}
          className="hidden"
        />
      </div>

      {/* 3D model upload */}
      <div
        onClick={() => !disabled && modelInputRef.current?.click()}
        className={`border border-slate-700 rounded-lg p-4 flex items-center gap-3 transition-all cursor-pointer
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-emerald-500/40 hover:bg-emerald-500/5'}`}
      >
        <Box className="w-6 h-6 text-emerald-400" />
        <div>
          <p className="text-sm font-medium text-slate-200">Upload 3D Scan (optional)</p>
          <p className="text-xs text-slate-400">GLB, GLTF, or OBJ from Polycam, LiDAR, etc.</p>
        </div>
        <input
          ref={modelInputRef}
          type="file"
          accept={ACCEPT_MODELS}
          onChange={handleModelChange}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default BatchUploader;
