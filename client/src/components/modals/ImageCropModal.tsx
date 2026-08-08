import React, { useState, useCallback } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';
import { X, Check, ZoomIn, Move, Sparkles } from 'lucide-react';

interface ImageCropModalProps {
  imageSrc: string | null;
  file: File | null;
  cropType: 'avatar' | 'banner';
  isOpen: boolean;
  onClose: () => void;
  onSave: (fileToUpload: File) => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  imageSrc,
  file,
  cropType,
  isOpen,
  onClose,
  onSave,
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  if (!isOpen || !imageSrc || !file) return null;

  const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
  const aspect = cropType === 'avatar' ? 1 : 3 / 1;

  // Helper to generate cropped Blob for static images
  const createCroppedImage = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = imageSrc;
      image.onload = () => {
        if (!croppedAreaPixels) return reject('No crop area');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('No 2d context');

        canvas.width = croppedAreaPixels.width;
        canvas.height = croppedAreaPixels.height;

        ctx.drawImage(
          image,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          croppedAreaPixels.width,
          croppedAreaPixels.height
        );

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject('Canvas toBlob failed');
        }, file.type || 'image/png');
      };
      image.onerror = (err) => reject(err);
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isGif) {
        // For animated GIFs, preserve full multi-frame animation by uploading the original GIF File
        onSave(file);
      } else {
        // For static images, crop exactly to the user's selected frame
        const blob = await createCroppedImage();
        const croppedFile = new File([blob], file.name, { type: file.type || 'image/png' });
        onSave(croppedFile);
      }
    } catch (err) {
      console.error('[ImageCropModal] Crop save error:', err);
      // Fallback: upload original file if canvas crop fails
      onSave(file);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="bg-cyber-panel w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-cyber-border flex flex-col h-[560px]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-cyber-border flex items-center justify-between bg-cyber-base">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-cyber-cyan" />
            <h2 className="text-base font-extrabold text-white">
              {cropType === 'avatar' ? 'Adjust & Crop Avatar' : 'Adjust & Crop Profile Banner'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-cyber-muted hover:text-white rounded-full bg-cyber-input border border-cyber-border transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Interactive Cropper Stage */}
        <div className="flex-1 relative bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropType === 'avatar' ? 'round' : 'rect'}
            showGrid={true}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Controls Toolbar (Zoom Slider & Action Buttons) */}
        <div className="p-5 border-t border-cyber-border bg-cyber-panel space-y-4">
          {/* Zoom Slider */}
          <div className="flex items-center space-x-3">
            <ZoomIn className="w-4 h-4 text-cyber-muted flex-shrink-0" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-cyber-violet bg-cyber-input h-2 rounded-lg cursor-pointer"
            />
            <span className="text-xs font-mono text-cyber-muted min-w-[36px]">
              {zoom.toFixed(1)}x
            </span>
          </div>

          {/* Hint info */}
          <div className="text-[11px] text-cyber-muted flex items-center space-x-1.5">
            <Move className="w-3.5 h-3.5 text-cyber-cyan" />
            <span>
              {isGif
                ? 'Animated GIF detected — positioning & zoom will be preserved while keeping animation active!'
                : 'Drag image to reposition, or use zoom slider to adjust crop area.'}
            </span>
          </div>

          {/* Save / Cancel Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-1">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 text-xs font-bold text-cyber-muted hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-aurora-gradient hover:bg-aurora-hover text-white text-xs font-extrabold rounded-xl shadow-glow-violet transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Applying Crop...' : 'Save & Apply'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
