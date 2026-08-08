import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useServer } from '../../context/ServerContext';
import { Settings, Mic, MicOff, Volume2, VolumeX, ChevronUp, LogOut, Monitor } from 'lucide-react';
import { UserStatus, Channel } from '../../types';

interface UserFooterProps {
  onOpenSettings?: () => void;
  connectedVoiceChannel?: Channel | null;
}

export const UserFooter: React.FC<UserFooterProps> = ({ onOpenSettings, connectedVoiceChannel }) => {
  const { user, updateStatus, logout } = useAuth();
  const { selectChannel } = useServer();
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  if (!user) return null;

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'online': return 'bg-cyber-emerald shadow-glow-emerald';
      case 'idle': return 'bg-cyber-amber';
      case 'dnd': return 'bg-cyber-rose';
      case 'offline': default: return 'bg-cyber-muted';
    }
  };

  const handleStatusChange = (status: UserStatus) => {
    updateStatus(status);
    setShowStatusMenu(false);
  };

  return (
    <div className="relative bg-[#0b0c13] px-3 py-2 flex items-center justify-between border-t border-cyber-border text-cyber-text z-20">
      {/* Status Picker Glass Menu */}
      {showStatusMenu && (
        <div className="absolute bottom-16 left-2 w-56 glass-panel rounded-2xl shadow-2xl p-2 z-50 animate-fade-in space-y-1">
          <div className="text-[11px] font-extrabold text-cyber-muted uppercase px-2 py-1 tracking-wider">Set Status</div>
          <button
            onClick={() => handleStatusChange('online')}
            className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-cyber-violet hover:text-white text-xs font-semibold text-left transition-all"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-emerald shadow-glow-emerald" />
            <span>Online</span>
          </button>
          <button
            onClick={() => handleStatusChange('idle')}
            className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-cyber-violet hover:text-white text-xs font-semibold text-left transition-all"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-amber" />
            <span>Idle</span>
          </button>
          <button
            onClick={() => handleStatusChange('dnd')}
            className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-cyber-violet hover:text-white text-xs font-semibold text-left transition-all"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-rose" />
            <span>Do Not Disturb</span>
          </button>
          <button
            onClick={() => handleStatusChange('offline')}
            className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-cyber-violet hover:text-white text-xs font-semibold text-left transition-all"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-muted" />
            <span>Invisible / Offline</span>
          </button>
          <div className="h-px bg-cyber-border my-1" />
          <button
            onClick={logout}
            className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-cyber-rose hover:text-white text-xs font-bold text-left text-cyber-rose transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out</span>
          </button>
        </div>
      )}

      {/* User Info & Avatar */}
      <button
        onClick={() => setShowStatusMenu(!showStatusMenu)}
        className="flex items-center space-x-2.5 p-1 rounded-xl hover:bg-white/5 transition-all duration-200 flex-1 min-w-0 mr-1 text-left group"
      >
        <div className="relative flex-shrink-0">
          <img
            src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
            alt={user.username}
            className="w-8 h-8 rounded-full bg-cyber-input object-cover border border-white/10 group-hover:border-cyber-cyan/40 transition-colors"
          />
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0b0c13] ${getStatusColor(
              user.status
            )}`}
          />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="font-bold text-xs text-white truncate group-hover:text-cyber-cyan transition-colors">
            {user.displayName || user.username}
          </div>
          <div className="text-[11px] text-cyber-muted truncate">
            {user.customStatus || `@${user.username}`}
          </div>
        </div>
        <ChevronUp className="w-3.5 h-3.5 text-cyber-muted flex-shrink-0 ml-auto group-hover:text-white transition-colors" />
      </button>

      {/* Controls */}
      <div className="flex items-center space-x-1 text-cyber-muted">
        {/* Share Screen Quick Button */}
        {connectedVoiceChannel && (
          <button
            onClick={() => selectChannel(connectedVoiceChannel)}
            className="p-1.5 rounded-xl bg-aurora-gradient text-white shadow-glow-violet hover:opacity-90 transition-all"
            title="Share Screen (1080p 60fps)"
          >
            <Monitor className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors ${
            isMuted ? 'text-cyber-rose bg-cyber-rose/10' : ''
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <button
          onClick={() => setIsDeafened(!isDeafened)}
          className={`p-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors ${
            isDeafened ? 'text-cyber-rose bg-cyber-rose/10' : ''
          }`}
          title={isDeafened ? 'Undeafen' : 'Deafen'}
        >
          {isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
          title="User Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
