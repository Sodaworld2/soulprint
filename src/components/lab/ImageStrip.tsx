// Image Strip — thumbnail row with status icons
import React from 'react';
import { CheckCircle, Loader, AlertCircle, Clock } from 'lucide-react';
import type { ForensicImage } from '../../types/forensic';

interface Props {
  images: ForensicImage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const ImageStrip: React.FC<Props> = ({ images, selectedId, onSelect }) => {
  if (images.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
      {images.map((img) => (
        <button
          key={img.id}
          onClick={() => onSelect(img.id)}
          className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all
            ${selectedId === img.id ? 'border-indigo-400 ring-2 ring-indigo-400/30' : 'border-slate-700 hover:border-slate-500'}`}
        >
          <img
            src={img.thumbnail}
            alt={img.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 right-0 p-0.5">
            {img.status === 'complete' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 bg-slate-900 rounded-full" />}
            {img.status === 'analyzing' && <Loader className="w-3.5 h-3.5 text-indigo-400 animate-spin" />}
            {img.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-400 bg-slate-900 rounded-full" />}
            {img.status === 'pending' && <Clock className="w-3.5 h-3.5 text-slate-500" />}
          </div>
        </button>
      ))}
    </div>
  );
};

export default ImageStrip;
