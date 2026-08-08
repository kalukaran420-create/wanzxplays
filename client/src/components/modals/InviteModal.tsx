import React, { useState } from 'react';
import { useServer } from '../../context/ServerContext';
import { X, Copy, Check, UserPlus } from 'lucide-react';

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ isOpen, onClose }) => {
  const { activeServer } = useServer();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !activeServer) return null;

  const inviteLink = `${window.location.origin}/join/${activeServer.inviteCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeServer.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
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

        <div className="p-6">
          <div className="flex items-center space-x-2 text-discord-brand mb-2">
            <UserPlus className="w-6 h-6" />
            <h2 className="text-xl font-bold text-white">Invite friends to {activeServer.name}</h2>
          </div>
          <p className="text-xs text-discord-muted mb-4">
            Share this invite code with your friends to give them access to this server.
          </p>

          <div>
            <label className="block text-xs font-bold text-discord-muted uppercase tracking-wider mb-2">
              Server Invite Code
            </label>
            <div className="flex items-center space-x-2 bg-discord-tertiary p-1.5 rounded-lg border border-black/20">
              <input
                type="text"
                readOnly
                value={activeServer.inviteCode}
                className="flex-1 bg-transparent px-2 py-1 text-sm font-mono text-white outline-none select-all"
              />
              <button
                onClick={handleCopy}
                className={`px-4 py-2 text-xs font-bold rounded-md transition-all flex items-center space-x-1.5 ${
                  copied
                    ? 'bg-discord-green text-white'
                    : 'bg-discord-brand hover:bg-discord-brand-hover text-white shadow'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
