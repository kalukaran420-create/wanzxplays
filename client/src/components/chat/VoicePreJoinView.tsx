import React, { useEffect, useState } from 'react';
import { Channel } from '../../types';
import { useServer } from '../../context/ServerContext';
import { useSocket } from '../../context/SocketContext';
import { VoiceParticipant } from '../../hooks/useWebRTC';
import { Volume2, Users, Mic } from 'lucide-react';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';

interface VoicePreJoinViewProps {
  channel: Channel;
}

export const VoicePreJoinView: React.FC<VoicePreJoinViewProps> = ({ channel }) => {
  const { setConnectedVoiceChannel } = useServer();
  const { socket } = useSocket();
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);

  useEffect(() => {
    if (!socket) return;

    socket.emit('voice:get-room-summary');

    const handleRoomSummary = (summary: { [channelId: string]: VoiceParticipant[] }) => {
      if (summary && summary[channel.id]) {
        setParticipants(summary[channel.id]);
      } else {
        setParticipants([]);
      }
    };

    socket.on('voice:room-summary', handleRoomSummary);
    return () => {
      socket.off('voice:room-summary', handleRoomSummary);
    };
  }, [socket, channel.id]);

  const handleJoin = () => {
    setConnectedVoiceChannel(channel);
  };

  return (
    <div className="flex-1 min-w-0 bg-cyber-chat flex flex-col h-full overflow-hidden relative select-none">
      {/* Voice Pre-Join Channel Header */}
      <div className="h-14 border-b border-cyber-border px-6 flex items-center justify-between shadow-sm bg-cyber-chat/80 backdrop-blur-md z-10">
        <div className="flex items-center space-x-2.5 min-w-0">
          <Volume2 className="w-5 h-5 text-cyber-emerald flex-shrink-0" />
          <span className="font-extrabold text-white text-base truncate">{channel.name}</span>
          <span className="text-xs text-cyber-muted border-l border-cyber-border pl-3 truncate hidden md:inline">
            Voice Channel
          </span>
        </div>
      </div>

      {/* Pre-Join Stage Area */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center relative overflow-y-auto overflow-x-hidden bg-[#0a0b10]">
        <div className="w-full max-w-lg text-center p-8 bg-cyber-panel/80 rounded-3xl border border-cyber-border shadow-2xl backdrop-blur-md animate-fade-in flex flex-col items-center space-y-6">
          {/* Channel Icon Badge */}
          <div className="w-20 h-20 rounded-3xl bg-aurora-gradient text-white flex items-center justify-center shadow-glow-violet animate-pulse">
            <Volume2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-white tracking-wide mb-1">
              {channel.name}
            </h2>
            <p className="text-xs text-cyber-muted font-medium">
              Ready to connect to voice and share audio with your team?
            </p>
          </div>

          {/* Active Participants List */}
          <div className="w-full bg-cyber-base/60 rounded-2xl border border-cyber-border/60 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-cyber-muted px-1">
              <span className="flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-cyber-cyan" />
                <span>Connected Members</span>
              </span>
              <span className="text-cyber-cyan font-mono">{participants.length}</span>
            </div>

            {participants.length === 0 ? (
              <div className="py-4 text-xs text-cyber-muted font-medium italic">
                No one is currently in this voice channel. Be the first to join!
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1 max-h-40 overflow-y-auto custom-scrollbar">
                {participants.map((p) => (
                  <div
                    key={p.socketId}
                    className="flex items-center space-x-2.5 p-2 rounded-xl bg-cyber-chat/80 border border-cyber-border/40"
                  >
                    <img
                      src={
                        resolveMediaUrl(p.avatar) ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.username)}`
                      }
                      alt={p.username}
                      className="w-7 h-7 rounded-full object-cover bg-cyber-panel"
                    />
                    <span className="text-xs font-bold text-white truncate">
                      {p.displayName || p.username}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Join Voice Button */}
          <button
            onClick={handleJoin}
            className="w-full py-4 bg-aurora-gradient hover:opacity-90 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-glow-violet transition-all duration-300 flex items-center justify-center space-x-2.5 cursor-pointer transform hover:scale-[1.02]"
          >
            <Mic className="w-5 h-5" />
            <span>Join Voice Lounge</span>
          </button>
        </div>
      </div>
    </div>
  );
};
