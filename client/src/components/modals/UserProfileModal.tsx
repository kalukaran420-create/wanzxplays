import React from 'react';
import { User, UserStatus } from '../../types';
import { X, MessageSquare, ShieldCheck, Calendar, Sparkles } from 'lucide-react';

interface UserProfileModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onStartDM?: (userId: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  isOpen,
  onClose,
  onStartDM,
}) => {
  if (!isOpen || !user) return null;

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'online': return 'bg-discord-green';
      case 'idle': return 'bg-discord-yellow';
      case 'dnd': return 'bg-discord-red';
      case 'offline': default: return 'bg-discord-gray';
    }
  };

  const getStatusText = (status: UserStatus) => {
    switch (status) {
      case 'online': return 'Online';
      case 'idle': return 'Idle';
      case 'dnd': return 'Do Not Disturb';
      case 'offline': default: return 'Offline';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-discord-floating rounded-2xl shadow-2xl overflow-hidden border border-white/10 relative">
        {/* Profile Header Banner */}
        <div className="h-28 bg-gradient-to-r from-discord-brand via-purple-600 to-indigo-700 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 text-white/80 hover:text-white rounded-full bg-black/30 backdrop-blur-sm transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar & Main Info */}
        <div className="px-6 pb-6 pt-0 relative">
          {/* Avatar Positioned Over Banner */}
          <div className="relative -top-12 inline-block mb-0">
            <img
              src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
              alt={user.username}
              className="w-24 h-24 rounded-full border-4 border-discord-floating object-cover bg-discord-secondary shadow-xl"
            />
            <span
              className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-discord-floating ${getStatusColor(
                user.status
              )}`}
            />
          </div>

          <div className="-mt-10">
            <h2 className="text-xl font-bold text-white flex items-center gap-1.5">
              <span>{user.displayName || user.username}</span>
              <Sparkles className="w-4 h-4 text-discord-brand" />
            </h2>
            <div className="text-xs font-medium text-discord-muted mb-3">@{user.username}</div>

            {/* Custom Status Card */}
            {user.customStatus && (
              <div className="bg-discord-tertiary/70 border border-white/5 p-2.5 rounded-xl text-xs text-discord-text mb-4 italic">
                "{user.customStatus}"
              </div>
            )}

            <div className="space-y-3 border-t border-white/5 pt-4 text-xs">
              {/* Status */}
              <div>
                <div className="text-[11px] font-bold text-discord-muted uppercase tracking-wider mb-1">
                  Status
                </div>
                <div className="flex items-center space-x-2 text-white font-medium">
                  <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(user.status)}`} />
                  <span>{getStatusText(user.status)}</span>
                </div>
              </div>

              {/* Joined Date */}
              <div>
                <div className="text-[11px] font-bold text-discord-muted uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <Calendar className="w-3 h-3 text-discord-muted" />
                  <span>Member Since</span>
                </div>
                <div className="text-discord-text">
                  {new Date(user.createdAt || Date.now()).toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>

              {/* Roles Badges */}
              <div>
                <div className="text-[11px] font-bold text-discord-muted uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-discord-brand" />
                  <span>Roles</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-discord-brand/20 border border-discord-brand/40 text-discord-brand text-[11px] font-semibold">
                    @everyone
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[11px] font-semibold">
                    Verified Member
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            {onStartDM && (
              <div className="mt-6 pt-3 border-t border-white/5">
                <button
                  onClick={() => {
                    onStartDM(user.id);
                    onClose();
                  }}
                  className="w-full py-2.5 bg-discord-brand hover:bg-discord-brand-hover text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send Message</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
