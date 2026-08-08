import React, { useState } from 'react';
import { useServer } from '../../context/ServerContext';
import { UserFooter } from './UserFooter';
import {
  Hash,
  Volume2,
  ChevronDown,
  ChevronRight,
  Plus,
  Settings,
  UserPlus,
  Trash2,
  Mic,
  MicOff,
  PhoneOff,
} from 'lucide-react';
import { Channel } from '../../types';

interface ChannelSidebarProps {
  onOpenCreateChannel: (categoryId?: string) => void;
  onOpenCreateCategory: () => void;
  onOpenServerSettings: () => void;
  onOpenInviteModal: () => void;
  onOpenUserSettings: () => void;
}

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  onOpenCreateChannel,
  onOpenCreateCategory,
  onOpenServerSettings,
  onOpenInviteModal,
  onOpenUserSettings,
}) => {
  const { activeServer, activeChannel, selectChannel, deleteChannel } = useServer();
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<{ [key: string]: boolean }>({});
  const [connectedVoiceChannel, setConnectedVoiceChannel] = useState<Channel | null>(null);

  if (!activeServer) {
    return (
      <div className="w-60 bg-discord-secondary flex flex-col justify-between border-r border-black/20 text-discord-muted p-4 text-xs font-semibold">
        <span>No server selected</span>
      </div>
    );
  }

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleVoiceConnect = (channel: Channel) => {
    if (connectedVoiceChannel?.id === channel.id) {
      setConnectedVoiceChannel(null); // Disconnect
    } else {
      setConnectedVoiceChannel(channel); // Connect stub
    }
  };

  return (
    <div className="w-60 bg-discord-secondary flex flex-col justify-between border-r border-black/20 select-none flex-shrink-0 relative">
      {/* Top Server Header Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowServerMenu(!showServerMenu)}
          className="w-full h-12 px-4 border-b border-black/20 flex items-center justify-between font-bold text-white hover:bg-white/5 transition-colors text-sm shadow-sm"
        >
          <span className="truncate">{activeServer.name}</span>
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showServerMenu ? 'rotate-180' : ''}`} />
        </button>

        {/* Server Options Dropdown Menu */}
        {showServerMenu && (
          <div className="absolute top-14 left-2 right-2 bg-discord-floating rounded-lg shadow-2xl border border-white/10 p-1.5 z-40 animate-fade-in text-xs">
            <button
              onClick={() => {
                onOpenInviteModal();
                setShowServerMenu(false);
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded hover:bg-discord-brand hover:text-white text-discord-brand font-semibold transition-colors"
            >
              <span>Invite People</span>
              <UserPlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                onOpenCreateChannel();
                setShowServerMenu(false);
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded hover:bg-discord-brand hover:text-white text-discord-text font-medium transition-colors"
            >
              <span>Create Channel</span>
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                onOpenCreateCategory();
                setShowServerMenu(false);
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded hover:bg-discord-brand hover:text-white text-discord-text font-medium transition-colors"
            >
              <span>Create Category</span>
              <Plus className="w-4 h-4" />
            </button>
            <div className="h-px bg-white/10 my-1" />
            <button
              onClick={() => {
                onOpenServerSettings();
                setShowServerMenu(false);
              }}
              className="w-full flex items-center justify-between px-2.5 py-2 rounded hover:bg-discord-brand hover:text-white text-discord-text font-medium transition-colors"
            >
              <span>Server Settings</span>
              <Settings className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Channel Categories & Channels List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {activeServer.categories?.map((category) => {
          const isCollapsed = collapsedCategories[category.id];

          return (
            <div key={category.id} className="space-y-0.5">
              {/* Category Header */}
              <div className="flex items-center justify-between text-discord-muted hover:text-discord-text px-1 py-1 group cursor-pointer">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="flex items-center space-x-1 text-[11px] font-bold uppercase tracking-wider min-w-0"
                >
                  {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span className="truncate">{category.name}</span>
                </button>
                <button
                  onClick={() => onOpenCreateChannel(category.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white transition-opacity"
                  title="Create Channel"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Channels List under Category */}
              {!isCollapsed && (
                <div className="space-y-0.5 pl-1">
                  {category.channels?.map((channel) => {
                    const isSelected = activeChannel?.id === channel.id;
                    const isVoice = channel.type === 'VOICE';

                    return (
                      <div
                        key={channel.id}
                        onClick={() => {
                          if (isVoice) {
                            handleVoiceConnect(channel);
                          } else {
                            selectChannel(channel);
                          }
                        }}
                        className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-discord-active text-white'
                            : 'text-discord-muted hover:bg-discord-hover hover:text-discord-text'
                        }`}
                      >
                        <div className="flex items-center space-x-1.5 min-w-0 truncate">
                          {isVoice ? (
                            <Volume2 className="w-4 h-4 text-discord-muted flex-shrink-0" />
                          ) : (
                            <Hash className="w-4 h-4 text-discord-muted flex-shrink-0" />
                          )}
                          <span className="truncate">{channel.name}</span>
                        </div>

                        {/* Delete channel icon for admins/owners */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete channel #${channel.name}?`)) {
                              deleteChannel(channel.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-discord-muted hover:text-discord-red transition-opacity"
                          title="Delete Channel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* WebRTC Voice Channel Audio Connection Banner (Stub Preview) */}
      {connectedVoiceChannel && (
        <div className="bg-[#1e1f22] p-2 border-t border-black/20 text-xs flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-discord-green font-bold flex items-center space-x-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-discord-green animate-ping" />
              <span>Voice Connected</span>
            </div>
            <div className="text-discord-muted text-[11px] truncate">
              {activeServer.name} / {connectedVoiceChannel.name}
            </div>
          </div>

          <button
            onClick={() => setConnectedVoiceChannel(null)}
            className="p-1.5 bg-discord-red hover:bg-discord-red/80 text-white rounded-full transition-colors"
            title="Disconnect Voice"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Bottom User Controls Bar */}
      <UserFooter onOpenSettings={onOpenUserSettings} />
    </div>
  );
};
