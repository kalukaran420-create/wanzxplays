import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Settings, Mic, MicOff, Volume2, VolumeX, Circle, ChevronUp, LogOut } from 'lucide-react';
import { UserStatus } from '../../types';

interface UserFooterProps {
  onOpenSettings?: () => void;
}

export const UserFooter: React.FC<UserFooterProps> = ({ onOpenSettings }) => {
  const { user, updateStatus, logout } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  if (!user) return null;

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'online': return 'bg-discord-green';
      case 'idle': return 'bg-discord-yellow';
      case 'dnd': return 'bg-discord-red';
      case 'offline': default: return 'bg-discord-gray';
    }
  };

  const handleStatusChange = (status: UserStatus) => {
    updateStatus(status);
    setShowStatusMenu(false);
  };

  return (
    <div className="relative bg-[#232428] px-2 py-1.5 flex items-center justify-between border-t border-black/20 text-discord-text">
      {/* Status Picker Menu */}
      {showStatusMenu && (
        <div className="absolute bottom-14 left-2 w-52 bg-discord-floating rounded-lg shadow-xl border border-white/10 p-1.5 z-50 animate-fade-in">
          <div className="text-[11px] font-bold text-discord-muted uppercase px-2 py-1">Set Status</div>
          <button
            onClick={() => handleStatusChange('online')}
            className="w-full flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-discord-brand hover:text-white text-xs text-left"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-discord-green" />
            <span>Online</span>
          </button>
          <button
            onClick={() => handleStatusChange('idle')}
            className="w-full flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-discord-brand hover:text-white text-xs text-left"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-discord-yellow" />
            <span>Idle</span>
          </button>
          <button
            onClick={() => handleStatusChange('dnd')}
            className="w-full flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-discord-brand hover:text-white text-xs text-left"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-discord-red" />
            <span>Do Not Disturb</span>
          </button>
          <button
            onClick={() => handleStatusChange('offline')}
            className="w-full flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-discord-brand hover:text-white text-xs text-left"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-discord-gray" />
            <span>Invisible / Offline</span>
          </button>
          <div className="h-px bg-white/10 my-1" />
          <button
            onClick={logout}
            className="w-full flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-discord-red hover:text-white text-xs text-left text-discord-red"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log Out</span>
          </button>
        </div>
      )}

      {/* User Info & Avatar */}
      <button
        onClick={() => setShowStatusMenu(!showStatusMenu)}
        className="flex items-center space-x-2 p-1 rounded-md hover:bg-white/5 transition-colors flex-1 min-w-0 mr-1 text-left"
      >
        <div className="relative flex-shrink-0">
          <img
            src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
            alt={user.username}
            className="w-8 h-8 rounded-full bg-discord-tertiary object-cover"
          />
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#232428] ${getStatusColor(
              user.status
            )}`}
          />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="font-semibold text-xs text-white truncate">{user.displayName || user.username}</div>
          <div className="text-[11px] text-discord-muted truncate">
            {user.customStatus || `@${user.username}`}
          </div>
        </div>
        <ChevronUp className="w-3.5 h-3.5 text-discord-muted flex-shrink-0 ml-auto" />
      </button>

      {/* Audio & Settings Buttons */}
      <div className="flex items-center space-x-0.5 text-discord-muted">
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`p-1.5 rounded hover:bg-white/10 hover:text-discord-text transition-colors ${
            isMuted ? 'text-discord-red' : ''
          }`}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        <button
          onClick={() => setIsDeafened(!isDeafened)}
          className={`p-1.5 rounded hover:bg-white/10 hover:text-discord-text transition-colors ${
            isDeafened ? 'text-discord-red' : ''
          }`}
          title={isDeafened ? 'Undeafen' : 'Deafen'}
        >
          {isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded hover:bg-white/10 hover:text-discord-text transition-colors"
          title="User Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
