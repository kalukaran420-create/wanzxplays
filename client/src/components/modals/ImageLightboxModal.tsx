import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';

interface ImageLightboxModalProps {
  imageUrl: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  imageUrl,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !imageUrl) return null;

  const resolvedUrl = resolveMediaUrl(imageUrl);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in cursor-zoom-out"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-5xl max-h-[90vh] flex flex-col items-center cursor-default"
      >
        {/* Floating Top Controls */}
        <div className="absolute -top-12 right-0 flex items-center space-x-2">
          <a
            href={resolvedUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2 text-white/80 hover:text-white rounded-full bg-black/40 backdrop-blur-sm transition-colors"
            title="Open Original"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
          <a
            href={resolvedUrl}
            download
            className="p-2 text-white/80 hover:text-white rounded-full bg-black/40 backdrop-blur-sm transition-colors"
            title="Download Image"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-full bg-black/40 backdrop-blur-sm transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Display Container */}
        <img
          src={resolvedUrl}
          alt="Expanded Lightbox View"
          className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl border border-white/10"
        />
      </div>
    </div>
  );
};
