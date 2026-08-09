import React, { useState } from 'react';
import { useServer } from '../../context/ServerContext';
import { X, Compass } from 'lucide-react';

interface JoinServerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JoinServerModal: React.FC<JoinServerModalProps> = ({ isOpen, onClose }) => {
  const { joinServer } = useServer();
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = inviteCode.trim();
    if (!raw) return;

    // Handle full invite URLs as well as raw invite codes
    const code = raw.includes('/join/') ? raw.split('/join/').pop()?.trim() || raw : raw;

    setLoading(true);
    setError('');

    try {
      await joinServer(code);
      setInviteCode('');
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid invite code');
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
            <Compass className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">Join a Server</h2>
          <p className="text-xs text-discord-muted">
            Enter an invite code below to join an existing community.
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
              Invite Code <span className="text-discord-red">*</span>
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-discord-tertiary text-discord-text rounded-md outline-none border border-black/20 focus:border-discord-brand text-sm font-mono"
              placeholder="e.g. DEVHUB123"
            />
          </div>

          <div className="pt-3 flex justify-between items-center bg-discord-tertiary/50 -mx-6 -mb-6 p-4 border-t border-black/20">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-semibold text-discord-text hover:underline"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={loading || !inviteCode.trim()}
              className="px-6 py-2.5 bg-discord-brand hover:bg-discord-brand-hover text-white text-xs font-bold rounded-md shadow transition-colors disabled:opacity-50"
            >
              {loading ? 'Joining...' : 'Join Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
