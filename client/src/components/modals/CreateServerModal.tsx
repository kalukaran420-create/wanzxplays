import React, { useState } from 'react';
import { useServer } from '../../context/ServerContext';
import { X, Server as ServerIcon } from 'lucide-react';

interface CreateServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenJoinServer?: () => void;
}

export const CreateServerModal: React.FC<CreateServerModalProps> = ({ isOpen, onClose, onOpenJoinServer }) => {
  const { createServer } = useServer();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      await createServer(name.trim(), description.trim() || undefined, icon.trim() || undefined);
      setName('');
      setDescription('');
      setIcon('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-discord-secondary w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-white/10 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-discord-muted hover:text-white rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-discord-brand/20 text-discord-brand flex items-center justify-center mx-auto mb-3">
            <ServerIcon className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Create Your Server</h2>
          <p className="text-xs text-discord-muted">
            Your server is where you and your friends hang out. Make yours and start talking.
          </p>
        </div>

        {error && (
          <div className="mx-6 mb-4 p-3 rounded-lg bg-discord-red/10 border border-discord-red/30 text-discord-red text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-discord-muted uppercase tracking-wider mb-2">
              Server Name <span className="text-discord-red">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-discord-tertiary text-discord-text rounded-md outline-none border border-black/20 focus:border-discord-brand text-sm"
              placeholder="e.g. My Cool Lounge"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-discord-muted uppercase tracking-wider mb-2">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-discord-tertiary text-discord-text rounded-md outline-none border border-black/20 focus:border-discord-brand text-sm"
              placeholder="What is this server about?"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-discord-muted uppercase tracking-wider mb-2">
              Server Icon Image URL
            </label>
            <input
              type="url"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full px-3.5 py-2 bg-discord-tertiary text-discord-text rounded-md outline-none border border-black/20 focus:border-discord-brand text-sm"
              placeholder="https://example.com/icon.png (Optional)"
            />
          </div>

          <div className="pt-3 flex justify-between items-center bg-discord-tertiary/50 -mx-6 -mb-6 p-4 border-t border-black/20">
            {onOpenJoinServer ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenJoinServer();
                }}
                className="text-xs font-semibold text-discord-brand hover:underline"
              >
                Have an invite? Join a server
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-semibold text-discord-text hover:underline"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-6 py-2.5 bg-discord-brand hover:bg-discord-brand-hover text-white text-xs font-bold rounded-md shadow transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
