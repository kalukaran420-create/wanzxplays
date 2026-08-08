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
  Monitor,
  PhoneOff,
  Sparkles,
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
      <div className="w-60 bg-cyber-panel flex flex-col justify-between border-r border-cyber-border text-cyber-muted p-4 text-xs font-semibold">
        <span>No server selected</span>
      </div>
    );
  }

  const toggleCategory = (catId: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const handleVoiceConnect = (channel: Channel) => {
    selectChannel(channel);
    if (connectedVoiceChannel?.id !== channel.id) {
      setConnectedVoiceChannel(channel);
    }
  };

  // Collect IDs of channels already inside explicit categories
  const categorizedChannelIds = new Set(
    activeServer.categories?.flatMap((cat) => cat.channels?.map((c) => c.id) || []) || []
  );

  // Find channels that are not inside any explicit category
  const uncategorizedChannels = activeServer.channels?.filter((c) => !categorizedChannelIds.has(c.id)) || [];
  const uncategorizedText = uncategorizedChannels.filter((c) => c.type === 'TEXT');
  const uncategorizedVoice = uncategorizedChannels.filter((c) => c.type === 'VOICE');

  return (
    <div className="w-60 bg-cyber-panel flex flex-col justify-between border-r border-cyber-border select-none flex-shrink-0 relative z-10">
      {/* Top Server Header Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowServerMenu(!showServerMenu)}
          className="w-full h-14 px-4 border-b border-cyber-border flex items-center justify-between font-bold text-white hover:bg-white/5 transition-all duration-200 text-sm shadow-sm"
        >
          <span className="truncate flex items-center space-x-1.5">
            <Sparkles className="w-4 h-4 text-cyber-cyan" />
            <span>{activeServer.name}</span>
          </span>
          <ChevronDown className={`w-4 h-4 text-cyber-muted transition-transform duration-200 ${showServerMenu ? 'rotate-180 text-white' : ''}`} />
        </button>

        {/* Server Options Glass Dropdown */}
        {showServerMenu && (
          <div className="absolute top-16 left-2 right-2 glass-panel rounded-2xl shadow-2xl p-2 z-50 animate-fade-in text-xs space-y-1">
            <button
              onClick={() => {
                onOpenInviteModal();
                setShowServerMenu(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-cyber-violet hover:text-white text-cyber-cyan font-bold transition-all duration-200"
            >
              <span>Invite People</span>
              <UserPlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                onOpenCreateChannel();
                setShowServerMenu(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-cyber-hover text-cyber-text font-medium transition-all duration-200"
            >
              <span>Create Channel</span>
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                onOpenCreateCategory();
                setShowServerMenu(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-cyber-hover text-cyber-text font-medium transition-all duration-200"
            >
              <span>Create Category</span>
              <Plus className="w-4 h-4" />
            </button>
            <div className="h-px bg-cyber-border my-1" />
            <button
              onClick={() => {
                onOpenServerSettings();
                setShowServerMenu(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-cyber-hover text-cyber-text font-medium transition-all duration-200"
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
            <div key={category.id} className="space-y-1">
              {/* Category Header */}
              <div className="flex items-center justify-between text-cyber-muted hover:text-white px-2 py-1 group cursor-pointer">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="flex items-center space-x-1.5 text-[11px] font-extrabold uppercase tracking-wider min-w-0"
                >
                  {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span className="truncate">{category.name}</span>
                </button>
                <button
                  onClick={() => onOpenCreateChannel(category.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded-lg text-cyber-muted hover:text-white transition-all duration-200"
                  title="Create Channel"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Channels List under Category */}
              {!isCollapsed && (
                <div className="space-y-1 pl-1">
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
                        className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 ${
                          isSelected
                            ? 'bg-cyber-cyan/10 text-white border border-cyber-cyan/30 shadow-glow-cyan'
                            : 'text-cyber-muted hover:bg-cyber-hover hover:text-cyber-text'
                        }`}
                      >
                        <div className="flex items-center space-x-2 min-w-0 truncate">
                          {isVoice ? (
                            <Volume2 className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-cyber-cyan' : 'text-cyber-emerald'}`} />
                          ) : (
                            <Hash className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-cyber-cyan' : 'text-cyber-muted'}`} />
                          )}
                          <span className="truncate">{channel.name}</span>
                        </div>

                        {/* Delete channel icon */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete channel #${channel.name}?`)) {
                              deleteChannel(channel.id);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-cyber-muted hover:text-cyber-rose hover:bg-cyber-rose/10 rounded-md transition-all"
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

        {/* Uncategorized Voice Channels Section */}
        {uncategorizedVoice.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-cyber-muted hover:text-white px-2 py-1 group cursor-pointer">
              <button
                onClick={() => toggleCategory('uncategorized_voice')}
                className="flex items-center space-x-1.5 text-[11px] font-extrabold uppercase tracking-wider min-w-0"
              >
                {collapsedCategories['uncategorized_voice'] ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <span className="truncate">VOICE CHANNELS</span>
              </button>
              <button
                onClick={() => onOpenCreateChannel()}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded-lg text-cyber-muted hover:text-white transition-all duration-200"
                title="Create Channel"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {!collapsedCategories['uncategorized_voice'] && (
              <div className="space-y-1 pl-1">
                {uncategorizedVoice.map((channel) => {
                  const isSelected = activeChannel?.id === channel.id;
                  return (
                    <div
                      key={channel.id}
                      onClick={() => handleVoiceConnect(channel)}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'bg-cyber-cyan/10 text-white border border-cyber-cyan/30 shadow-glow-cyan'
                          : 'text-cyber-muted hover:bg-cyber-hover hover:text-cyber-text'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0 truncate">
                        <Volume2 className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-cyber-cyan' : 'text-cyber-emerald'}`} />
                        <span className="truncate">{channel.name}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete channel #${channel.name}?`)) {
                            deleteChannel(channel.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-cyber-muted hover:text-cyber-rose hover:bg-cyber-rose/10 rounded-md transition-all"
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
        )}

        {/* Uncategorized Text Channels Section */}
        {uncategorizedText.length > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-cyber-muted hover:text-white px-2 py-1 group cursor-pointer">
              <button
                onClick={() => toggleCategory('uncategorized_text')}
                className="flex items-center space-x-1.5 text-[11px] font-extrabold uppercase tracking-wider min-w-0"
              >
                {collapsedCategories['uncategorized_text'] ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <span className="truncate">TEXT CHANNELS</span>
              </button>
              <button
                onClick={() => onOpenCreateChannel()}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded-lg text-cyber-muted hover:text-white transition-all duration-200"
                title="Create Channel"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {!collapsedCategories['uncategorized_text'] && (
              <div className="space-y-1 pl-1">
                {uncategorizedText.map((channel) => {
                  const isSelected = activeChannel?.id === channel.id;
                  return (
                    <div
                      key={channel.id}
                      onClick={() => selectChannel(channel)}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'bg-cyber-cyan/10 text-white border border-cyber-cyan/30 shadow-glow-cyan'
                          : 'text-cyber-muted hover:bg-cyber-hover hover:text-cyber-text'
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0 truncate">
                        <Hash className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-cyber-cyan' : 'text-cyber-muted'}`} />
                        <span className="truncate">{channel.name}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete channel #${channel.name}?`)) {
                            deleteChannel(channel.id);
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-cyber-muted hover:text-cyber-rose hover:bg-cyber-rose/10 rounded-md transition-all"
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
        )}
      </div>

      {/* WebRTC Voice Active Connection Bar */}
      {connectedVoiceChannel && (
        <div className="bg-cyber-input px-3 py-2.5 border-t border-cyber-border text-xs flex items-center justify-between shadow-xl">
          <div
            onClick={() => selectChannel(connectedVoiceChannel)}
            className="min-w-0 cursor-pointer hover:underline"
          >
            <div className="text-cyber-emerald font-bold flex items-center space-x-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-cyber-emerald animate-ping" />
              <span>Voice Connected</span>
            </div>
            <div className="text-cyber-muted text-[11px] truncate">
              {activeServer.name} / {connectedVoiceChannel.name}
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Share Screen Quick Action Button */}
            <button
              onClick={() => selectChannel(connectedVoiceChannel)}
              className="p-2 bg-aurora-gradient hover:bg-aurora-hover text-white rounded-xl shadow-glow-violet transition-all duration-200"
              title="Share Screen (1080p 60fps)"
            >
              <Monitor className="w-4 h-4" />
            </button>

            {/* Disconnect Voice */}
            <button
              onClick={() => setConnectedVoiceChannel(null)}
              className="p-2 bg-cyber-rose/20 text-cyber-rose hover:bg-cyber-rose hover:text-white rounded-xl transition-all duration-200 border border-cyber-rose/30"
              title="Disconnect Voice"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Bottom User Controls Bar */}
      <UserFooter
        connectedVoiceChannel={connectedVoiceChannel}
        onOpenSettings={onOpenUserSettings}
      />
    </div>
  );
};
