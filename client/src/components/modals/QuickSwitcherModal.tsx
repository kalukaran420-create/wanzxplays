import React, { useState, useEffect } from 'react';
import { useServer } from '../../context/ServerContext';
import { Search, Hash, Volume2, X, Command } from 'lucide-react';
import { Channel } from '../../types';

interface QuickSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickSwitcherModal: React.FC<QuickSwitcherModalProps> = ({ isOpen, onClose }) => {
  const { activeServer, selectChannel } = useServer();
  const [query, setQuery] = useState('');

  // Key combination listener (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !activeServer) return null;

  const allChannels: Channel[] = activeServer.channels || [];
  const filteredChannels = allChannels.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-discord-secondary w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-white/10 relative flex flex-col">
        {/* Search Header */}
        <div className="p-4 border-b border-black/20 flex items-center space-x-3 bg-discord-tertiary">
          <Search className="w-5 h-5 text-discord-brand flex-shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Where would you like to go? (e.g. #general)"
            className="flex-1 bg-transparent text-white placeholder-discord-muted outline-none text-sm font-medium"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 text-discord-muted hover:text-white rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          <div className="text-[10px] font-bold text-discord-muted uppercase tracking-wider px-3 py-1">
            Channels in {activeServer.name}
          </div>

          {filteredChannels.length === 0 ? (
            <div className="p-6 text-center text-xs text-discord-muted">
              No channels match "{query}"
            </div>
          ) : (
            filteredChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => {
                  selectChannel(channel);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left hover:bg-discord-brand hover:text-white transition-colors group text-xs font-semibold"
              >
                <div className="flex items-center space-x-2 text-discord-text group-hover:text-white truncate">
                  {channel.type === 'VOICE' ? (
                    <Volume2 className="w-4 h-4 text-discord-muted group-hover:text-white flex-shrink-0" />
                  ) : (
                    <Hash className="w-4 h-4 text-discord-muted group-hover:text-white flex-shrink-0" />
                  )}
                  <span className="truncate">{channel.name}</span>
                </div>
                <span className="text-[10px] text-discord-muted group-hover:text-white/80 uppercase font-mono">
                  {channel.type}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 bg-discord-tertiary/60 border-t border-black/20 text-[11px] text-discord-muted flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Command className="w-3 h-3 text-discord-brand" />
            <span>Quick Switcher</span>
          </div>
          <span>Press ESC to exit</span>
        </div>
      </div>
    </div>
  );
};
