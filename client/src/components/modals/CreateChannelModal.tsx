import React, { useState } from 'react';
import { useServer } from '../../context/ServerContext';
import { X, Hash, Volume2 } from 'lucide-react';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategoryId?: string;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  isOpen,
  onClose,
  defaultCategoryId,
}) => {
  const { activeServer, createChannel } = useServer();
  const [name, setName] = useState('');
  const [type, setType] = useState<'TEXT' | 'VOICE'>('TEXT');
  const [topic, setTopic] = useState('');
  const [categoryId, setCategoryId] = useState(defaultCategoryId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !activeServer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      await createChannel(activeServer.id, name.trim(), type, categoryId || undefined, topic.trim() || undefined);
      setName('');
      setTopic('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create channel');
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

        <div className="p-6 pb-2">
          <h2 className="text-xl font-bold text-white mb-1">Create Channel</h2>
          <p className="text-xs text-discord-muted">in {activeServer.name}</p>
        </div>

        {error && (
          <div className="mx-6 mb-4 p-3 rounded-lg bg-discord-red/10 border border-discord-red/30 text-discord-red text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {/* Channel Type Selector */}
          <div>
            <label className="block text-xs font-bold text-discord-muted uppercase tracking-wider mb-2">
              Channel Type
            </label>

            <div className="space-y-2">
              <label
                onClick={() => setType('TEXT')}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                  type === 'TEXT'
                    ? 'bg-discord-brand/10 border-discord-brand text-white'
                    : 'bg-discord-tertiary border-white/5 text-discord-muted hover:bg-discord-hover'
                }`}
              >
                <Hash className="w-5 h-5 mr-3 text-discord-brand" />
                <div>
                  <div className="font-semibold text-xs text-white">Text Channel</div>
                  <div className="text-[11px] text-discord-muted">Post images, stickers, opinions, and code</div>
                </div>
              </label>

              <label
                onClick={() => setType('VOICE')}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                  type === 'VOICE'
                    ? 'bg-discord-brand/10 border-discord-brand text-white'
                    : 'bg-discord-tertiary border-white/5 text-discord-muted hover:bg-discord-hover'
                }`}
              >
                <Volume2 className="w-5 h-5 mr-3 text-discord-green" />
                <div>
                  <div className="font-semibold text-xs text-white">Voice Channel</div>
                  <div className="text-[11px] text-discord-muted">Hang out together with voice, video, and screen share</div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-discord-muted uppercase tracking-wider mb-2">
              Channel Name <span className="text-discord-red">*</span>
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-discord-muted font-bold text-sm">
                {type === 'TEXT' ? '#' : '🔊'}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full pl-8 pr-3.5 py-2 bg-discord-tertiary text-discord-text rounded-md outline-none border border-black/20 focus:border-discord-brand text-sm"
                placeholder="new-channel"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-discord-muted uppercase tracking-wider mb-2">
              Channel Topic
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3.5 py-2 bg-discord-tertiary text-discord-text rounded-md outline-none border border-black/20 focus:border-discord-brand text-sm"
              placeholder="Topic or guidelines for this channel"
            />
          </div>

          <div className="pt-3 flex justify-end space-x-3 bg-discord-tertiary/50 -mx-6 -mb-6 p-4 border-t border-black/20">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-discord-text hover:underline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-6 py-2 bg-discord-brand hover:bg-discord-brand-hover text-white text-xs font-bold rounded-md shadow transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
