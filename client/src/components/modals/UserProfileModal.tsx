import React, { useState, useEffect } from 'react';
import { User, UserStatus, Gift } from '../../types';
import { api } from '../../services/api';
import { SendGiftModal } from './SendGiftModal';
import { X, MessageSquare, ShieldCheck, Calendar, Sparkles, Gift as GiftIcon } from 'lucide-react';

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
  const [receivedGifts, setReceivedGifts] = useState<Gift[]>([]);
  const [isGiftModalOpen, setIsGiftModalOpen] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      api.get(`/gifts/user/${user.id}`).then((res) => {
        setReceivedGifts(res.data.gifts || []);
      }).catch((err) => console.error('Failed to fetch gifts:', err));
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case 'online': return 'bg-cyber-emerald shadow-glow-emerald';
      case 'idle': return 'bg-cyber-amber';
      case 'dnd': return 'bg-cyber-rose';
      case 'offline': default: return 'bg-cyber-muted';
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

  const accentBgStyle = user.profileColor ? { backgroundColor: user.profileColor } : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-sm bg-cyber-panel rounded-3xl shadow-2xl overflow-hidden border border-white/10 relative">
        {/* Profile Header Banner (Static image or Animated GIF) */}
        <div
          className="h-32 w-full bg-aurora-gradient relative overflow-hidden"
          style={accentBgStyle}
        >
          {user.banner && (
            <img
              src={user.banner}
              alt="User Banner"
              className="absolute inset-0 w-full h-full object-cover object-center block border-none outline-none"
            />
          )}

          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 text-white/80 hover:text-white rounded-full bg-black/40 backdrop-blur-md border border-white/10 transition-colors z-10"
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
              className={`w-24 h-24 rounded-full border-4 border-cyber-panel object-cover bg-cyber-input ${
                user.profileEffect === 'cyan_glow'
                  ? 'shadow-glow-cyan'
                  : user.profileEffect === 'pulse'
                  ? 'animate-pulse-glow'
                  : 'shadow-glow-violet'
              }`}
            />
            <span
              className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-cyber-panel ${getStatusColor(
                user.status
              )}`}
            />
          </div>

          <div className="-mt-10">
            <div className="flex items-center space-x-1.5">
              <h2 className="text-xl font-extrabold text-white truncate">
                {user.displayName || user.username}
              </h2>
              <Sparkles className="w-4 h-4 text-cyber-cyan flex-shrink-0" />
            </div>

            <div className="text-xs font-semibold text-cyber-muted mb-2">@{user.username}</div>

            {/* Custom Flair Tag */}
            {user.customTag && (
              <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-cyber-violet/20 border border-cyber-violet/40 text-cyber-violet text-[11px] font-bold mb-3">
                <span>{user.customTag}</span>
              </div>
            )}

            {/* Custom Status Card */}
            {user.customStatus && (
              <div className="bg-cyber-input/70 border border-white/5 p-2.5 rounded-2xl text-xs text-cyber-text mb-4 italic shadow-inner">
                "{user.customStatus}"
              </div>
            )}

            {/* Received Gifts Showcase */}
            {receivedGifts.length > 0 && (
              <div className="mb-4 bg-cyber-input/40 border border-cyber-border p-3 rounded-2xl">
                <div className="text-[11px] font-extrabold text-cyber-muted uppercase tracking-wider mb-2 flex items-center space-x-1">
                  <GiftIcon className="w-3.5 h-3.5 text-cyber-cyan" />
                  <span>Received Gifts ({receivedGifts.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {receivedGifts.map((gift) => (
                    <div
                      key={gift.id}
                      className="px-2.5 py-1 rounded-xl bg-cyber-violet/20 border border-cyber-violet/40 text-xs font-bold text-white flex items-center space-x-1"
                      title={`Gifted by @${gift.sender?.username || 'user'}`}
                    >
                      <span>{gift.giftIcon}</span>
                      <span>{gift.giftName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3 border-t border-cyber-border pt-4 text-xs">
              {/* Status */}
              <div>
                <div className="text-[11px] font-extrabold text-cyber-muted uppercase tracking-wider mb-1">
                  Status
                </div>
                <div className="flex items-center space-x-2 text-white font-semibold">
                  <span className={`w-2.5 h-2.5 rounded-full ${getStatusColor(user.status)}`} />
                  <span>{getStatusText(user.status)}</span>
                </div>
              </div>

              {/* Joined Date */}
              <div>
                <div className="text-[11px] font-extrabold text-cyber-muted uppercase tracking-wider mb-1 flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-cyber-muted" />
                  <span>Member Since</span>
                </div>
                <div className="text-cyber-text font-medium">
                  {new Date(user.createdAt || Date.now()).toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>

              {/* Roles Badges */}
              <div>
                <div className="text-[11px] font-extrabold text-cyber-muted uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyber-cyan" />
                  <span>Roles</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-cyber-violet/20 border border-cyber-violet/40 text-cyber-violet text-[11px] font-bold">
                    @everyone
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyber-emerald/20 border border-cyber-emerald/40 text-cyber-emerald text-[11px] font-bold">
                    Verified Nitro Member
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 pt-3 border-t border-cyber-border space-y-2">
              <button
                onClick={() => setIsGiftModalOpen(true)}
                className="w-full py-2.5 bg-aurora-gradient hover:bg-aurora-hover text-white text-xs font-bold rounded-2xl shadow-glow-violet transition-all flex items-center justify-center space-x-2"
              >
                <GiftIcon className="w-4 h-4" />
                <span>Send a Free Gift</span>
              </button>

              {onStartDM && (
                <button
                  onClick={() => {
                    onStartDM(user.id);
                    onClose();
                  }}
                  className="w-full py-2.5 bg-cyber-input hover:bg-cyber-hover text-cyber-text border border-cyber-border text-xs font-bold rounded-2xl transition-all flex items-center justify-center space-x-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send Direct Message</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <SendGiftModal
        receiver={user}
        isOpen={isGiftModalOpen}
        onClose={() => setIsGiftModalOpen(false)}
      />
    </div>
  );
};
