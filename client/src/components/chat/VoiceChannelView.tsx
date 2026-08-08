import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Channel } from '../../types';
import { useWebRTC } from '../../hooks/useWebRTC';
import { useSocket } from '../../context/SocketContext';
import { SoundboardModal } from '../voice/SoundboardModal';
import { playSoundEffect, setSoundboardVolume } from '../../utils/soundSynthesizer';
import {
  Monitor,
  MonitorOff,
  Maximize2,
  Volume2,
  Mic,
  MicOff,
  AlertCircle,
  RefreshCw,
  Radio,
} from 'lucide-react';

interface VoiceChannelViewProps {
  channel: Channel;
}

interface SoundToast {
  id: string;
  soundName: string;
  soundIcon: string;
  username: string;
}

export const VoiceChannelView: React.FC<VoiceChannelViewProps> = ({ channel }) => {
  const { socket } = useSocket();
  const {
    isSharing,
    localStream,
    remoteStreams,
    presenterInfo,
    errorMsg,
    streamStats,
    startScreenShare,
    stopScreenShare,
  } = useWebRTC(channel.id);

  const [isMuted, setIsMuted] = useState(false);
  const [isSoundboardOpen, setIsSoundboardOpen] = useState(false);
  const [soundVolume, setSoundVolumeState] = useState<number>(() => {
    const saved = localStorage.getItem('pulsecord_soundboard_volume');
    return saved !== null ? parseFloat(saved) : 0.8;
  });
  const [isSoundboardMuted, setIsSoundboardMuted] = useState(false);
  const [soundToast, setSoundToast] = useState<SoundToast | null>(null);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  const activeStream = isSharing ? localStream : Object.values(remoteStreams)[0]?.stream;
  const activePresenterName = isSharing ? 'You' : presenterInfo?.username || 'Peer Presenter';

  // Handle soundboard volume slider changes with real-time audio update & localStorage persistence
  const handleVolumeChange = (vol: number) => {
    setSoundVolumeState(vol);
    localStorage.setItem('pulsecord_soundboard_volume', String(vol));
    setSoundboardVolume(isSoundboardMuted ? 0 : vol);
  };

  const handleToggleMute = (muted: boolean) => {
    setIsSoundboardMuted(muted);
    setSoundboardVolume(muted ? 0 : soundVolume);
  };

  // Listen for real-time soundboard events from peers in the voice channel
  useEffect(() => {
    if (!socket) return;

    const handleSoundPlayed = (data: {
      soundId: string;
      soundName: string;
      soundIcon: string;
      soundUrl?: string;
      user: { id: string; username: string };
    }) => {
      console.log('🎵 [VoiceChannelView] Real-time sound played:', data);

      // Play sound audibly if not muted
      const effectiveVol = isSoundboardMuted ? 0 : soundVolume;
      if (effectiveVol > 0) {
        playSoundEffect(data.soundId, effectiveVol, data.soundUrl);
      }

      // Show visual notification toast
      setSoundToast({
        id: `${data.soundId}-${Date.now()}`,
        soundName: data.soundName,
        soundIcon: data.soundIcon,
        username: data.user.username,
      });

      setTimeout(() => setSoundToast(null), 3000);
    };

    socket.on('voice:sound-played', handleSoundPlayed);

    return () => {
      socket.off('voice:sound-played', handleSoundPlayed);
    };
  }, [socket, isSoundboardMuted, soundVolume]);

  const formatStatsLabel = () => {
    if (!streamStats) return '1080p @ 60fps Target';
    const resLabel = streamStats.height >= 1080 ? '1080p' : `${streamStats.height}p`;
    return `${resLabel} @ ${streamStats.frameRate}fps (${streamStats.width}x${streamStats.height})`;
  };

  const videoCallbackRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoElementRef.current = node;
      if (node && activeStream) {
        console.log('🎥 [VoiceChannelView] Callback ref attaching activeStream to <video>:', activeStream);
        node.srcObject = activeStream;
      }
    },
    [activeStream]
  );

  useEffect(() => {
    if (videoElementRef.current) {
      if (activeStream) {
        console.log('🎥 [VoiceChannelView] Effect attaching activeStream to <video>:', activeStream);
        videoElementRef.current.srcObject = activeStream;
      } else {
        videoElementRef.current.srcObject = null;
      }
    }
  }, [activeStream]);

  const toggleFullscreen = () => {
    if (videoElementRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoElementRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="flex-1 bg-cyber-chat flex flex-col h-full overflow-hidden select-none relative">
      {/* Real-time Soundboard Toast Notification Banner */}
      {soundToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-2xl bg-black/80 backdrop-blur-md border border-cyber-cyan/50 text-white text-xs font-bold shadow-2xl flex items-center space-x-2.5 animate-fade-in shadow-glow-cyan">
          <span className="text-xl animate-bounce">{soundToast.soundIcon}</span>
          <div>
            <span className="text-cyber-cyan font-extrabold">{soundToast.username}</span> played{' '}
            <span className="text-white font-extrabold">"{soundToast.soundName}"</span>
          </div>
        </div>
      )}

      {/* Voice Header */}
      <div className="h-14 border-b border-cyber-border px-6 flex items-center justify-between shadow-sm bg-cyber-chat/80 backdrop-blur-md z-10">
        <div className="flex items-center space-x-2.5">
          <Volume2 className="w-5 h-5 text-cyber-emerald" />
          <span className="font-extrabold text-white text-base">{channel.name}</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyber-emerald/20 text-cyber-emerald font-bold border border-cyber-emerald/30">
            Voice & Screen Share
          </span>
        </div>

        {/* Dynamic Quality Stats Label */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-cyber-cyan font-bold font-mono bg-cyber-cyan/10 border border-cyber-cyan/30 px-3 py-1 rounded-xl shadow-glow-cyan">
            ⚡ {formatStatsLabel()}
          </span>
        </div>
      </div>

      {/* Main Screen Share Video Stage */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center relative overflow-hidden bg-[#0a0b10]">
        {/* Error Permission Banner */}
        {errorMsg && (
          <div className="absolute top-4 left-4 right-4 z-20 p-3 rounded-2xl bg-cyber-rose/10 border border-cyber-rose/30 text-cyber-rose text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {activeStream ? (
          <div className="relative w-full max-w-5xl h-full flex flex-col items-center justify-center rounded-3xl overflow-hidden shadow-2xl border border-cyber-cyan/30 shadow-glow-cyan group bg-black">
            {/* Live Video Frame with callback ref */}
            <video
              ref={videoCallbackRef}
              autoPlay
              playsInline
              muted={isSharing}
              className="w-full h-full object-contain bg-black"
            />

            {/* Presenter Label Header */}
            <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 bg-black/70 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-xs font-bold text-white shadow-2xl">
              <span className="w-2.5 h-2.5 rounded-full bg-cyber-rose animate-pulse" />
              <span>{activePresenterName} is sharing their screen</span>
              <span className="text-[10px] text-cyber-cyan font-mono uppercase bg-cyber-cyan/10 border border-cyber-cyan/30 px-2 py-0.5 rounded-md">
                LIVE 7 Mbps • DETAIL
              </span>
            </div>

            {/* Video Controls Overlay */}
            <div className="absolute bottom-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2 bg-black/70 backdrop-blur-md p-2 rounded-2xl border border-white/10">
              <button
                onClick={toggleFullscreen}
                className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                title="Toggle Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Empty Stage Placeholder when no one is sharing */
          <div className="max-w-md text-center p-8 bg-cyber-panel/60 rounded-3xl border border-cyber-border shadow-2xl backdrop-blur-md">
            <div className="w-20 h-20 rounded-3xl bg-aurora-gradient text-white flex items-center justify-center mx-auto mb-4 shadow-glow-violet">
              <Monitor className="w-10 h-10" />
            </div>
            <h2 className="text-xl font-extrabold text-white mb-2">No Screen Share Active</h2>
            <p className="text-xs text-cyber-muted mb-6 leading-relaxed">
              Start sharing your screen, application window, or browser tab with everyone in <strong>#{channel.name}</strong>.
            </p>

            <button
              onClick={startScreenShare}
              className="px-6 py-3 bg-aurora-gradient hover:bg-aurora-hover text-white text-xs font-bold rounded-2xl shadow-glow-violet transition-all flex items-center justify-center space-x-2 mx-auto"
            >
              <Monitor className="w-4 h-4" />
              <span>Share Screen (1080p 60fps Target)</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Voice Call Toolbar Controls */}
      <div className="h-16 bg-cyber-panel px-6 border-t border-cyber-border flex items-center justify-between z-10">
        <div className="flex items-center space-x-2">
          {/* Mute Microphone Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3 rounded-2xl border transition-all ${
              isMuted
                ? 'bg-cyber-rose/10 border-cyber-rose text-cyber-rose'
                : 'bg-cyber-input border-cyber-border text-cyber-text hover:bg-cyber-hover'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Soundboard Panel Open Button */}
          <button
            onClick={() => setIsSoundboardOpen(true)}
            className="p-3 rounded-2xl border bg-cyber-input border-cyber-border text-cyber-cyan hover:bg-cyber-hover hover:border-cyber-cyan/50 transition-all flex items-center space-x-2"
            title="Open Soundboard"
          >
            <Radio className="w-5 h-5" />
            <span className="text-xs font-extrabold hidden sm:inline">Soundboard</span>
          </button>
        </div>

        {/* Presenter Share Screen Action Buttons */}
        <div className="flex items-center space-x-3">
          {isSharing ? (
            <>
              <button
                onClick={startScreenShare}
                className="px-4 py-2.5 bg-cyber-input hover:bg-cyber-hover text-cyber-text border border-cyber-border text-xs font-bold rounded-2xl shadow transition-colors flex items-center space-x-2"
                title="Switch Screen Source"
              >
                <RefreshCw className="w-4 h-4 text-cyber-cyan" />
                <span>Switch Screen</span>
              </button>

              <button
                onClick={stopScreenShare}
                className="px-5 py-2.5 bg-cyber-rose hover:bg-cyber-rose/80 text-white text-xs font-bold rounded-2xl shadow-lg transition-all flex items-center space-x-2"
              >
                <MonitorOff className="w-4 h-4" />
                <span>Stop Sharing</span>
              </button>
            </>
          ) : (
            <button
              onClick={startScreenShare}
              className="px-6 py-2.5 bg-aurora-gradient hover:bg-aurora-hover text-white text-xs font-bold rounded-2xl shadow-glow-violet transition-all flex items-center space-x-2"
            >
              <Monitor className="w-4 h-4" />
              <span>Share Screen</span>
            </button>
          )}
        </div>
      </div>

      {/* Soundboard Modal */}
      <SoundboardModal
        isOpen={isSoundboardOpen}
        onClose={() => setIsSoundboardOpen(false)}
        channelId={channel.id}
        socket={socket}
        soundVolume={soundVolume}
        setSoundVolume={handleVolumeChange}
        isMuted={isSoundboardMuted}
        setIsMuted={handleToggleMute}
      />
    </div>
  );
};
