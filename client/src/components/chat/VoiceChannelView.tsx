import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Channel } from '../../types';
import { useWebRTC } from '../../hooks/useWebRTC';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { SoundboardModal } from '../voice/SoundboardModal';
import { playSoundEffect, setSoundboardVolume } from '../../utils/soundSynthesizer';
import {
  Monitor,
  MonitorOff,
  Maximize2,
  Minimize2,
  Volume2,
  Mic,
  MicOff,
  AlertCircle,
  RefreshCw,
  Radio,
  Headphones,
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
  const { user } = useAuth();
  const {
    isSharing,
    localStream,
    remoteStreams,
    remoteAudioStreams,
    presenterInfo,
    errorMsg,
    streamStats,
    participants,
    setMicMutedState,
    startScreenShare,
    stopScreenShare,
  } = useWebRTC(channel.id);

  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isSoundboardOpen, setIsSoundboardOpen] = useState(false);
  const [soundVolume, setSoundVolumeState] = useState<number>(() => {
    const saved = localStorage.getItem('pulsecord_soundboard_volume');
    return saved !== null ? parseFloat(saved) : 0.8;
  });
  const [isSoundboardMuted, setIsSoundboardMuted] = useState(false);
  const [soundToast, setSoundToast] = useState<SoundToast | null>(null);
  const [isLocalSpeaking, setIsLocalSpeaking] = useState(false);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const remotePresenterObj = presenterInfo?.socketId
    ? remoteStreams[presenterInfo.socketId] || Object.values(remoteStreams)[0]
    : Object.values(remoteStreams)[0];

  const activeStream = isSharing ? localStream : remotePresenterObj?.stream;
  const isSomeonePresenting = isSharing || (!!activeStream && activeStream.getVideoTracks().length > 0);
  const activePresenterName = isSharing
    ? 'You'
    : presenterInfo?.username || remotePresenterObj?.username || 'Peer Presenter';

  // Toggle local mic audio track state in WebRTC & broadcast state update
  const handleToggleMicMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    setMicMutedState(newMuted);
  };

  // Handle soundboard volume slider changes
  const handleVolumeChange = (vol: number) => {
    setSoundVolumeState(vol);
    localStorage.setItem('pulsecord_soundboard_volume', String(vol));
    setSoundboardVolume(isSoundboardMuted ? 0 : vol);
  };

  const handleToggleSoundboardMute = (muted: boolean) => {
    setIsSoundboardMuted(muted);
    setSoundboardVolume(muted ? 0 : soundVolume);
  };

  // Real-time local mic volume audio analyzer for speaking detection
  useEffect(() => {
    if (!socket || !channel.id || isMuted || isDeafened) {
      setIsLocalSpeaking(false);
      socket?.emit('voice:state-update', { channelId: channel.id, isMuted, isDeafened, isSpeaking: false });
      return;
    }

    let micStream: MediaStream | null = null;
    let animId: number;
    let audioCtx: AudioContext | null = null;

    const startAudioAnalyser = async () => {
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        const source = audioCtx.createMediaStreamSource(micStream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const detectSpeaking = () => {
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const average = sum / dataArray.length;

          if (average > 10) {
            setIsLocalSpeaking(true);
            if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
            speakingTimeoutRef.current = setTimeout(() => {
              setIsLocalSpeaking(false);
            }, 350);
          }

          animId = requestAnimationFrame(detectSpeaking);
        };

        detectSpeaking();
      } catch (err) {
        console.warn('🎙️ [VoiceChannelView] Mic audio analyser unavailable:', err);
      }
    };

    startAudioAnalyser();

    return () => {
      if (animId) cancelAnimationFrame(animId);
      if (audioCtx) audioCtx.close();
      if (micStream) micStream.getTracks().forEach((t) => t.stop());
    };
  }, [socket, channel.id, isMuted, isDeafened]);

  // Sync mute, deafen & speaking state changes to socket room
  useEffect(() => {
    if (socket && channel.id) {
      socket.emit('voice:state-update', {
        channelId: channel.id,
        isMuted,
        isDeafened,
        isSpeaking: isLocalSpeaking,
      });
    }
  }, [socket, channel.id, isMuted, isDeafened, isLocalSpeaking]);

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
      const effectiveVol = isSoundboardMuted ? 0 : soundVolume;
      if (effectiveVol > 0) {
        playSoundEffect(data.soundId, effectiveVol, data.soundUrl);
      }

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

  const attachVideoStream = useCallback((node: HTMLVideoElement | null, stream: MediaStream | null) => {
    if (!node) return;
    if (stream) {
      if (node.srcObject !== stream) {
        node.srcObject = stream;
      }
      node.defaultMuted = true;
      node.muted = true;
      node.autoplay = true;
      node.playsInline = true;

      if (node.paused) {
        const playPromise = node.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            if (err.name !== 'AbortError') {
              console.warn('🎥 [VoiceChannelView] Video play warning:', err);
            }
          });
        }
      }

      // TEMP-DEBUG Diagnostics: DOM video element count
      console.log('🎥 [TEMP-DEBUG] Total <video> elements in DOM:', document.querySelectorAll('video').length);

      // TEMP-DEBUG Diagnostics: Computed CSS styles of video node and 3 parent levels
      try {
        let curr: HTMLElement | null = node;
        for (let depth = 0; depth <= 3 && curr; depth++) {
          const style = window.getComputedStyle(curr);
          console.log(`🎥 [TEMP-DEBUG STYLES] Depth ${depth} (${curr.tagName.toLowerCase()}.${curr.className}):`, {
            opacity: style.opacity,
            visibility: style.visibility,
            display: style.display,
            backgroundColor: style.backgroundColor,
            zIndex: style.zIndex,
            width: style.width,
            height: style.height,
          });
          curr = curr.parentElement;
        }
      } catch (err) {
        console.warn('🎥 [TEMP-DEBUG STYLES] Error checking styles:', err);
      }

      // TEMP-DEBUG Diagnostics: 5-second tick metric logger
      let intervalCount = 0;
      const intervalId = setInterval(() => {
        intervalCount++;
        const videoTrack = stream.getVideoTracks()[0];
        console.log(`🎥 [TEMP-DEBUG METRICS] Tick ${intervalCount}/5:`, {
          readyState: node.readyState,
          videoWidth: node.videoWidth,
          videoHeight: node.videoHeight,
          currentTime: node.currentTime,
          paused: node.paused,
          trackKind: videoTrack?.kind,
          trackReadyState: videoTrack?.readyState,
          trackEnabled: videoTrack?.enabled,
          trackMuted: videoTrack?.muted,
        });

        if (intervalCount >= 5) {
          clearInterval(intervalId);
        }
      }, 1000);
    } else {
      node.srcObject = null;
    }
  }, []);

  const videoCallbackRef = useCallback(
    (node: HTMLVideoElement | null) => {
      videoElementRef.current = node;
      attachVideoStream(node, activeStream || null);
    },
    [activeStream, attachVideoStream]
  );

  useEffect(() => {
    if (videoElementRef.current) {
      attachVideoStream(videoElementRef.current, activeStream || null);
    }
  }, [activeStream, attachVideoStream]);

  const toggleNativeFullscreen = () => {
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
      {/* Hidden HTML5 DOM Audio Elements for Remote Peer Microphone Playback */}
      {Object.entries(remoteAudioStreams).map(([peerSocketId, stream]) => (
        <audio
          key={peerSocketId}
          autoPlay
          playsInline
          muted={isDeafened}
          ref={(el) => {
            if (el && stream) {
              el.srcObject = stream;
              el.play().catch((err) => console.warn('🔊 [VoiceChannelView] DOM audio play error:', err));
            }
          }}
        />
      ))}

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
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyber-emerald/20 text-cyber-emerald font-bold border border-cyber-emerald/30 flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-cyber-emerald animate-ping" />
            <span>{participants.length} Connected</span>
          </span>
        </div>

        {/* Dynamic Quality Stats Label */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-cyber-cyan font-bold font-mono bg-cyber-cyan/10 border border-cyber-cyan/30 px-3 py-1 rounded-xl shadow-glow-cyan">
            ⚡ {formatStatsLabel()}
          </span>
        </div>
      </div>

      {/* Main Call Stage Area */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center relative overflow-hidden bg-[#0a0b10]">
        {/* Error Permission Banner */}
        {errorMsg && (
          <div className="absolute top-4 left-4 right-4 z-20 p-3 rounded-2xl bg-cyber-rose/10 border border-cyber-rose/30 text-cyber-rose text-xs font-semibold flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Screen Share Mode vs Participant Grid Mode */}
        {isSomeonePresenting ? (
          <div className="flex-1 w-full max-w-5xl flex flex-col items-center justify-center space-y-4 h-full min-h-[450px]">
            {/* Screen Share Stage with Viewer Maximize / Restore Controls */}
            <div
              className={`relative transition-all duration-300 ${
                isMaximized
                  ? 'fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4'
                  : 'relative w-full flex-1 min-h-[420px] aspect-video flex flex-col items-center justify-center rounded-3xl overflow-hidden shadow-2xl border border-cyber-cyan/30 shadow-glow-cyan group bg-black'
              }`}
            >
              {/* Live Video Frame with Static Key */}
              <video
                key="screen-share-video"
                ref={videoCallbackRef}
                autoPlay
                playsInline
                muted
                style={{ minHeight: '380px', width: '100%', height: '100%' }}
                className="w-full h-full min-h-[380px] object-contain bg-black rounded-2xl"
              />

              {/* Presenter Header Label */}
              <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 bg-black/70 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 text-xs font-bold text-white shadow-2xl">
                <span>
                  {isSharing ? 'You are sharing your screen' : `${activePresenterName} is sharing their screen`}
                </span>
                <span className="text-[10px] text-cyber-cyan font-mono uppercase bg-cyber-cyan/10 border border-cyber-cyan/30 px-2 py-0.5 rounded-md">
                  LIVE 7 Mbps • DETAIL
                </span>
              </div>

              {/* Viewer Maximize & Fullscreen Overlay Controls (Visible on Hover) */}
              <div className="absolute bottom-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2 bg-black/80 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-2xl">
                {/* Maximize / Restore View Button */}
                <button
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="px-3 py-1.5 text-white/90 hover:text-white rounded-xl hover:bg-white/10 transition-colors flex items-center space-x-1.5 text-xs font-extrabold"
                  title={isMaximized ? 'Restore View' : 'Maximize Screen Share'}
                >
                  {isMaximized ? (
                    <>
                      <Minimize2 className="w-4 h-4 text-cyber-cyan" />
                      <span>Restore View</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-4 h-4 text-cyber-cyan" />
                      <span>Maximize View</span>
                    </>
                  )}
                </button>

                {/* Native Fullscreen Button */}
                <button
                  onClick={toggleNativeFullscreen}
                  className="p-2 text-white/80 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                  title="Toggle Fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bottom Compact Participant Strip */}
            {!isMaximized && (
              <div className="w-full max-w-5xl flex items-center justify-center space-x-3 overflow-x-auto p-2.5 bg-cyber-panel/80 backdrop-blur-md rounded-2xl border border-cyber-border">
                {participants.map((p) => {
                  const isSelf = p.userId === user?.id || p.socketId === socket?.id;
                  const pMuted = isSelf ? isMuted : p.isMuted;
                  const pDeafened = isSelf ? isDeafened : p.isDeafened;
                  const pSpeaking = isSelf ? isLocalSpeaking : p.isSpeaking;

                  return (
                    <div
                      key={p.socketId}
                      className={`flex items-center space-x-2.5 px-3 py-1.5 rounded-xl border transition-all duration-200 ${
                        pSpeaking
                          ? 'bg-cyber-emerald/20 border-cyber-emerald shadow-glow-emerald'
                          : 'bg-black/40 border-white/10'
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.username)}`}
                          alt={p.username}
                          className={`w-8 h-8 rounded-full object-cover transition-all ${
                            pSpeaking ? 'ring-2 ring-cyber-emerald scale-105' : ''
                          }`}
                        />
                        {(pMuted || pDeafened) && (
                          <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-cyber-rose text-white border border-[#0a0b10]">
                            {pDeafened ? <Headphones className="w-2.5 h-2.5" /> : <MicOff className="w-2.5 h-2.5" />}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-xs font-extrabold text-white max-w-[80px] truncate">
                          {p.displayName || p.username}
                        </span>
                        {isSelf && (
                          <span className="text-[8px] bg-cyber-violet/30 text-cyber-violet px-1.5 py-0.2 rounded-full font-mono">
                            YOU
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Grid of Participant Tiles when no screen share is active */
          <div className="flex-1 w-full max-w-5xl flex items-center justify-center p-4">
            {participants.length === 0 ? (
              <div className="max-w-md text-center p-8 bg-cyber-panel/60 rounded-3xl border border-cyber-border shadow-2xl backdrop-blur-md">
                <div className="w-20 h-20 rounded-3xl bg-aurora-gradient text-white flex items-center justify-center mx-auto mb-4 shadow-glow-violet animate-pulse">
                  <Volume2 className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-extrabold text-white mb-2">Voice Lounge Connected</h2>
                <p className="text-xs text-cyber-muted mb-6 leading-relaxed">
                  Connecting your audio session to <strong>#{channel.name}</strong>...
                </p>
              </div>
            ) : (
              <div
                className={`grid gap-5 w-full max-w-5xl items-center justify-center ${
                  participants.length === 1
                    ? 'grid-cols-1 max-w-sm'
                    : participants.length === 2
                    ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl'
                    : participants.length <= 4
                    ? 'grid-cols-2 max-w-3xl'
                    : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-w-5xl'
                }`}
              >
                {participants.map((p) => {
                  const isSelf = p.userId === user?.id || p.socketId === socket?.id;
                  const pMuted = isSelf ? isMuted : p.isMuted;
                  const pDeafened = isSelf ? isDeafened : p.isDeafened;
                  const pSpeaking = isSelf ? isLocalSpeaking : p.isSpeaking;

                  return (
                    <div
                      key={p.socketId}
                      className={`bg-cyber-panel/80 border rounded-3xl p-6 flex flex-col items-center justify-center relative shadow-2xl backdrop-blur-md transition-all duration-300 ${
                        pSpeaking
                          ? 'border-cyber-emerald shadow-glow-emerald bg-cyber-emerald/5 scale-[1.02]'
                          : 'border-cyber-border/70 hover:border-cyber-cyan/40'
                      }`}
                    >
                      {/* Avatar with Speaking Ring */}
                      <div className="relative mb-3.5">
                        <img
                          src={p.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(p.username)}`}
                          alt={p.username}
                          className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover shadow-2xl transition-all duration-200 ${
                            pSpeaking
                              ? 'ring-4 ring-cyber-emerald ring-offset-4 ring-offset-[#0a0b10] shadow-glow-emerald scale-105'
                              : 'ring-2 ring-white/10'
                          }`}
                        />

                        {/* Muted / Deafened Icon Badge Overlay */}
                        {(pMuted || pDeafened) && (
                          <div
                            className="absolute bottom-0 right-0 p-2 rounded-full bg-cyber-rose text-white border-2 border-[#0a0b10] shadow-lg"
                            title={pDeafened ? 'Deafened' : 'Muted'}
                          >
                            {pDeafened ? <Headphones className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                          </div>
                        )}
                      </div>

                      {/* Username & Local Tag */}
                      <div className="flex items-center space-x-1.5 max-w-full">
                        <span className="text-sm font-extrabold text-white truncate max-w-[140px]">
                          {p.displayName || p.username}
                        </span>
                        {isSelf && (
                          <span className="text-[9px] bg-cyber-violet/30 text-cyber-violet px-2 py-0.5 rounded-full font-mono font-bold border border-cyber-violet/40">
                            YOU
                          </span>
                        )}
                      </div>

                      {/* Speaking Status Indicator Label */}
                      {pSpeaking && (
                        <span className="text-[10px] text-cyber-emerald font-extrabold flex items-center space-x-1 mt-1.5 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyber-emerald" />
                          <span>SPEAKING</span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Voice Call Control Bar */}
      <div className="h-16 bg-cyber-panel px-6 border-t border-cyber-border flex items-center justify-between z-10">
        <div className="flex items-center space-x-2">
          {/* Mute Microphone Button */}
          <button
            onClick={handleToggleMicMute}
            className={`p-3 rounded-2xl border transition-all ${
              isMuted
                ? 'bg-cyber-rose/10 border-cyber-rose text-cyber-rose'
                : 'bg-cyber-input border-cyber-border text-cyber-text hover:bg-cyber-hover'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Deafen Headphones Button */}
          <button
            onClick={() => setIsDeafened(!isDeafened)}
            className={`p-3 rounded-2xl border transition-all ${
              isDeafened
                ? 'bg-cyber-rose/10 border-cyber-rose text-cyber-rose'
                : 'bg-cyber-input border-cyber-border text-cyber-text hover:bg-cyber-hover'
            }`}
            title={isDeafened ? 'Undeafen' : 'Deafen'}
          >
            <Headphones className="w-5 h-5" />
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
        setIsMuted={handleToggleSoundboardMute}
      />
    </div>
  );
};
