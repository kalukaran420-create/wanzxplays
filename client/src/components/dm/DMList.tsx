import React, { useState, useEffect } from 'react';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import { DMConversation } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { UserFooter } from '../navigation/UserFooter';
import { MessageSquare, Users, Plus, UserCheck } from 'lucide-react';

interface DMListProps {
  activeConversation: DMConversation | null;
  onSelectConversation: (conv: DMConversation) => void;
  onOpenUserSettings: () => void;
}

export const DMList: React.FC<DMListProps> = ({
  activeConversation,
  onSelectConversation,
  onOpenUserSettings,
}) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<DMConversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/dms/conversations');
      setConversations(res.data.conversations);
    } catch (err) {
      console.error('Failed to fetch DM conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleStartDMWithSeed = async (targetUsername: string) => {
    try {
      // Find seed user profile
      const res = await api.get('/auth/me'); // Or search endpoint
      // Initiate DM conversation
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-60 bg-discord-secondary flex flex-col justify-between border-r border-black/20 select-none flex-shrink-0 overflow-x-hidden">
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-4">
        {/* Header Search button */}
        <div className="h-12 border-b border-black/20 -mx-2 -mt-2 px-4 flex items-center shadow-sm">
          <div className="w-full py-1.5 px-2 bg-discord-tertiary text-discord-muted rounded text-xs flex items-center space-x-2">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Find or start a conversation</span>
          </div>
        </div>

        <div>
          <div className="text-[11px] font-bold text-discord-muted uppercase tracking-wider px-2 mb-2 flex items-center justify-between">
            <span>Direct Messages</span>
          </div>

          <div className="space-y-0.5">
            {conversations.map((conv) => {
              const otherParticipant = conv.participants?.find((p) => p.userId !== user?.id)?.user;
              const isSelected = activeConversation?.id === conv.id;

              return (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv)}
                  className={`w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-md transition-colors text-left ${
                    isSelected
                      ? 'bg-discord-active text-white'
                      : 'text-discord-muted hover:bg-discord-hover hover:text-discord-text'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <img
                      src={resolveMediaUrl(otherParticipant?.avatar) || `https://api.dicebear.com/7.x/bottts/svg?seed=${otherParticipant?.username}`}
                      alt={otherParticipant?.username}
                      className="w-8 h-8 rounded-full bg-discord-tertiary object-cover"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-discord-secondary bg-discord-green" />
                  </div>
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="font-semibold text-xs text-white truncate">
                      {otherParticipant?.displayName || otherParticipant?.username || 'User'}
                    </div>
                    <div className="text-[11px] text-discord-muted truncate">
                      {conv.lastMessage?.content || 'Started a conversation'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <UserFooter onOpenSettings={onOpenUserSettings} />
    </div>
  );
};
