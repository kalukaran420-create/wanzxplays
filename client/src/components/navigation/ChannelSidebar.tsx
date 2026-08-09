import React, { useState, useEffect, useRef } from 'react';
import { useServer } from '../../context/ServerContext';
import { useSocket } from '../../context/SocketContext';
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
  PhoneOff,
  Sparkles,
  MicOff,
} from 'lucide-react';
import { Channel } from '../../types';
import { VoiceParticipant } from '../../hooks/useWebRTC';

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
  const { socket } = useSocket();
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<{ [key: string]: boolean }>({});
  const [connectedVoiceChannel, setConnectedVoiceChannel] = useState<Channel | null>(null);
  const [voiceRoomsSummary, setVoiceRoomsSummary] = useState<{ [channelId: string]: VoiceParticipant[] }>({});

  useEffect(() => {
    if (!socket) return;

    // Fetch initial voice rooms summary
    socket.emit('voice:get-room-summary');

    const handleRoomSummary = (summary: { [channelId: string]: VoiceParticipant[] }) => {
      setVoiceRoomsSummary(summary || {});
    };

    socket.on('voice:room-summary', handleRoomSummary);

    return () => {
      socket.off('voice:room-summary', handleRoomSummary);
    };
  }, [socket]);

  const MIN_WIDTH = 180;
  const MAX_WIDTH = 480;
  const DEFAULT_WIDTH = 240;

  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem('pulsecord_sidebar_width');
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
        return parsed;
      }
    }
    return DEFAULT_WIDTH;
  });

  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: DEFAULT_WIDTH });

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { startX: e.clientX, startWidth: sidebarWidth };
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const deltaX = e.clientX - dragRef.current.startX;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, dragRef.current.startWidth + deltaX));
      setSidebarWidth(newWidth);
      localStorage.setItem('pulsecord_sidebar_width', newWidth.toString());
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  if (!activeServer) {
    return (
      <div
        style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px`, maxWidth: `${sidebarWidth}px` }}
        className="bg-cyber-panel flex flex-col justify-between border-r border-cyber-border text-cyber-muted p-4 text-xs font-semibold flex-shrink-0"
      >
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

  const categorizedChannelIds = new Set(
    (activeServer.categories || []).flatMap((cat) => (cat.channels || []).map((c) => c.id))
  );

  const uncategorizedChannels = activeServer.channels?.filter((c) => !categorizedChannelIds.has(c.id)) || [];
  const uncategorizedVoice = uncategorizedChannels.filter((c) => c.type === 'VOICE');
  const uncategorizedText = uncategorizedChannels.filter((c) => c.type === 'TEXT');

  const renderVoiceParticipantList = (channelId: string) => {
    const participantsList = voiceRoomsSummary[channelId] || [];
    if (participantsList.length === 0) return null;

    return (
      <div className="pl-6 pt-1 space-y-1">
        {participantsList.map((p) => (
          <div key={p.socketId} className="flex items-center space-x-2 py-0.5 px-1.5 rounded-lg hover:bg-white/5 transition-all">
            <div className="relative flex-shrink-0">
              <img
                src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.username)}`}
                alt={p.username}
                className={`w-4 h-4 rounded-full object-cover transition-all ${
                  p.isSpeaking ? 'ring-2 ring-cyber-emerald shadow-glow-emerald scale-105' : 'ring-1 ring-white/10'
                }`}
              />
              <div
                className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
                  p.isMuted ? 'bg-cyber-rose' : 'bg-cyber-emerald'
                }`}
              />
            </div>
            <span className="text-[11px] font-semibold text-cyber-muted hover:text-white truncate max-w-[110px]">
              {p.displayName || p.username}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      style={{ width: `${sidebarWidth}px`, minWidth: `${sidebarWidth}px`, maxWidth: `${sidebarWidth}px` }}
      className={`bg-cyber-panel flex flex-col h-full border-r border-cyber-border select-none relative z-10 flex-shrink-0 ${
        isResizing ? 'select-none' : ''
      }`}
    >
      {/* Active Drag Global Overlay */}
      {isResizing && (
        <div className="fixed inset-0 cursor-col-resize z-50 select-none" />
      )}

      {/* Draggable Resize Handle on Right Edge */}
      <div
        onMouseDown={startResizing}
        className={`absolute top-0 -right-1.5 w-3 h-full cursor-col-resize hover:bg-cyber-violet/60 transition-colors z-40 ${
          isResizing ? 'bg-cyber-violet' : ''
        }`}
        title="Drag to resize sidebar"
      />
      {/* Server Header Dropdown Menu */}
      <div className="relative border-b border-cyber-border">
        <button
          onClick={() => setShowServerMenu(!showServerMenu)}
          className="w-full h-14 px-4 flex items-center justify-between font-extrabold text-white hover:bg-cyber-hover transition-colors"
        >
          <div className="flex items-center space-x-2 min-w-0">
            <span className="truncate text-sm">{activeServer.name}</span>
            <Sparkles className="w-3.5 h-3.5 text-cyber-cyan flex-shrink-0" />
          </div>
          <ChevronDown className={`w-4 h-4 text-cyber-muted transition-transform duration-200 ${showServerMenu ? 'rotate-180' : ''}`} />
        </button>

        {showServerMenu && (
          <div className="absolute top-16 left-2 right-2 z-50 bg-cyber-chat border border-cyber-border rounded-2xl p-2 shadow-2xl space-y-1 animate-fade-in backdrop-blur-md">
            <button
              onClick={() => {
                setShowServerMenu(false);
                onOpenInviteModal();
              }}
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-cyber-cyan hover:bg-cyber-cyan/10 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite People</span>
            </button>
            <button
              onClick={() => {
                setShowServerMenu(false);
                onOpenServerSettings();
              }}
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-cyber-text hover:bg-cyber-hover transition-colors"
            >
              <Settings className="w-4 h-4 text-cyber-muted" />
              <span>Server Settings</span>
            </button>
            <button
              onClick={() => {
                setShowServerMenu(false);
                onOpenCreateCategory();
              }}
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-cyber-text hover:bg-cyber-hover transition-colors"
            >
              <Plus className="w-4 h-4 text-cyber-muted" />
              <span>Create Category</span>
            </button>
            <button
              onClick={() => {
                setShowServerMenu(false);
                onOpenCreateChannel();
              }}
              className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-bold text-cyber-text hover:bg-cyber-hover transition-colors"
            >
              <Plus className="w-4 h-4 text-cyber-muted" />
              <span>Create Channel</span>
            </button>
          </div>
        )}
      </div>

      {/* Channel Categories & Channels List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {activeServer.categories?.map((category) => {
          const isCollapsed = collapsedCategories[category.id];

          return (
            <div key={category.id} className="space-y-1">
              <div className="flex items-center justify-between text-cyber-muted hover:text-white px-2 py-1 group cursor-pointer">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className="flex items-center space-x-1.5 text-[11px] font-extrabold uppercase tracking-wider min-w-0"
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
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
                      <div key={channel.id} className="space-y-1">
                        <div
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

                        {/* Real-time Voice Participant List under Voice Channels */}
                        {isVoice && renderVoiceParticipantList(channel.id)}
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
                    <div key={channel.id} className="space-y-1">
                      <div
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

                      {renderVoiceParticipantList(channel.id)}
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

      {/* Connected Voice Channel Quick Control Banner */}
      {connectedVoiceChannel && (
        <div className="bg-cyber-emerald/10 border-t border-cyber-emerald/30 p-2.5 flex items-center justify-between">
          <div
            onClick={() => selectChannel(connectedVoiceChannel)}
            className="flex items-center space-x-2 min-w-0 cursor-pointer"
          >
            <Volume2 className="w-4 h-4 text-cyber-emerald animate-pulse flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-cyber-emerald font-extrabold uppercase">Voice Connected</div>
              <div className="text-xs font-bold text-white truncate">
                {activeServer.name} / {connectedVoiceChannel.name}
              </div>
            </div>
          </div>
          <button
            onClick={() => setConnectedVoiceChannel(null)}
            className="p-1.5 rounded-lg bg-cyber-rose/20 text-cyber-rose hover:bg-cyber-rose/30 transition-colors ml-2"
            title="Disconnect Voice"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* User Footer Panel */}
      <UserFooter
        onOpenSettings={onOpenUserSettings}
        connectedVoiceChannel={connectedVoiceChannel}
      />
    </div>
  );
};
