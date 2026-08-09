import React, { useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'danger' | 'primary';
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'danger',
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-cyber-chat border border-cyber-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative p-6 animate-scale-up"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-cyber-muted hover:text-white rounded-xl hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start space-x-4 mb-4">
          <div
            className={`p-3 rounded-2xl flex-shrink-0 ${
              confirmVariant === 'danger'
                ? 'bg-cyber-rose/15 text-cyber-rose'
                : 'bg-cyber-violet/15 text-cyber-cyan'
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
            <p className="text-xs text-cyber-muted leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-cyber-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-cyber-muted hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2 text-xs font-extrabold text-white rounded-xl transition-all shadow-glow ${
              confirmVariant === 'danger'
                ? 'bg-cyber-rose hover:bg-cyber-rose/80 shadow-glow-rose'
                : 'bg-aurora-gradient hover:opacity-90 shadow-glow-violet'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
