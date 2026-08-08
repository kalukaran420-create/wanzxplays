import React, { useState } from 'react';
import { User } from '../../types';
import { api } from '../../services/api';
import { X, Gift as GiftIcon, Sparkles } from 'lucide-react';

interface SendGiftModalProps {
  receiver: User | null;
  channelId?: string;
  isOpen: boolean;
  onClose: () => void;
}

const FREE_GIFTS = [
  { type: 'party_popper', name: 'Party Popper', icon: '🎉', desc: 'Celebrate in style!' },
  { type: 'rocket', name: 'Galactic Rocket', icon: '🚀', desc: 'To infinity and beyond!' },
  { type: 'crown', name: 'Crown of Glory', icon: '👑', desc: 'Fit for royalty!' },
  { type: 'star', name: 'Stellar Star', icon: '⭐', desc: 'You shine bright!' },
  { type: 'diamond', name: 'Diamond Badge', icon: '💎', desc: 'Pure elegance!' },
];

export const SendGiftModal: React.FC<SendGiftModalProps> = ({
  receiver,
  channelId,
  isOpen,
  onClose,
}) => {
  const [selectedGift, setSelectedGift] = useState(FREE_GIFTS[0]);
  const [loading, setLoading] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen || !receiver) return null;

  const handleSendGift = async () => {
    setLoading(true);
    try {
      await api.post('/gifts/send', {
        receiverId: receiver.id,
        giftType: selectedGift.type,
        giftName: selectedGift.name,
        giftIcon: selectedGift.icon,
        channelId,
      });
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Failed to send gift:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-md bg-cyber-panel rounded-3xl shadow-2xl overflow-hidden border border-cyber-border p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-cyber-muted hover:text-white rounded-full bg-cyber-input border border-cyber-border transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-aurora-gradient flex items-center justify-center mx-auto mb-3 shadow-glow-violet">
            <GiftIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-extrabold text-white">Send a Free Gift to {receiver.displayName || receiver.username}!</h2>
          <p className="text-xs text-cyber-muted mt-1">Cosmetic Nitro perk — 100% free for all users!</p>
        </div>

        {sentSuccess ? (
          <div className="py-8 text-center space-y-2 animate-fade-in">
            <div className="text-5xl animate-bounce">{selectedGift.icon}</div>
            <div className="text-lg font-extrabold text-cyber-emerald">Gift Sent Successfully!</div>
            <p className="text-xs text-cyber-muted">
              {receiver.displayName || receiver.username} received a {selectedGift.name}!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1">
              {FREE_GIFTS.map((gift) => (
                <div
                  key={gift.type}
                  onClick={() => setSelectedGift(gift)}
                  className={`p-3 rounded-2xl border cursor-pointer flex items-center space-x-3.5 transition-all ${
                    selectedGift.type === gift.type
                      ? 'bg-cyber-violet/20 border-cyber-violet shadow-glow-violet'
                      : 'bg-cyber-input border-cyber-border hover:bg-cyber-hover'
                  }`}
                >
                  <span className="text-3xl flex-shrink-0">{gift.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white">{gift.name}</div>
                    <div className="text-xs text-cyber-muted">{gift.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleSendGift}
              disabled={loading}
              className="w-full py-3 bg-aurora-gradient hover:bg-aurora-hover text-white text-xs font-extrabold rounded-2xl shadow-glow-violet transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Sending Gift...' : `Send ${selectedGift.name} (${selectedGift.icon})`}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
