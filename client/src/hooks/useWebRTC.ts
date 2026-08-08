import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

interface PeerConnectionMap {
  [socketId: string]: RTCPeerConnection;
}

export interface StreamStats {
  width: number;
  height: number;
  frameRate: number;
}

export const useWebRTC = (channelId: string | null) => {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ [socketId: string]: { stream: MediaStream; username: string } }>({});
  const [presenterInfo, setPresenterInfo] = useState<{ username: string; socketId: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [streamStats, setStreamStats] = useState<StreamStats | null>(null);

  const peerConnectionsRef = useRef<PeerConnectionMap>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const presenterInfoRef = useRef<{ username: string; socketId: string } | null>(null);

  const STUN_SERVERS: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  };

  // Helper to apply high bitrate & low-latency parameters to video sender
  const applyHighBitrateEncoding = (sender: RTCRtpSender) => {
    try {
      if (sender.track?.kind === 'video' && sender.getParameters) {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }
        // Target 7 Mbps (7,000,000 bps) for high-quality 1080p 60fps screen share
        params.encodings[0].maxBitrate = 7000000;
        // Maintain smooth 60fps framerate for low latency
        params.degradationPreference = 'maintain-framerate';

        sender.setParameters(params).then(() => {
          console.log('🎥 [WebRTC] Set maxBitrate=7,000,000 bps (7 Mbps), degradationPreference="maintain-framerate"');
        }).catch((err) => {
          console.warn('🎥 [WebRTC] Bitrate setParameters warning:', err);
        });
      }
    } catch (e) {
      console.warn('🎥 [WebRTC] Failed setting maxBitrate parameter:', e);
    }
  };

  // Helper to create RTCPeerConnection for a specific target socket
  const createPeerConnection = useCallback((targetSocketId: string): RTCPeerConnection => {
    if (peerConnectionsRef.current[targetSocketId]) {
      return peerConnectionsRef.current[targetSocketId];
    }

    console.log(`🎥 [WebRTC] Creating RTCPeerConnection for target peer: ${targetSocketId}`);
    const pc = new RTCPeerConnection(STUN_SERVERS);
    peerConnectionsRef.current[targetSocketId] = pc;

    // Attach local stream tracks if presenting
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, localStreamRef.current!);
        if (track.kind === 'video') {
          applyHighBitrateEncoding(sender);
        }
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('webrtc:ice-candidate', {
          targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    // Track handler (receive remote video)
    pc.ontrack = (event) => {
      console.log(`🎥 [WebRTC] Received remote stream track from ${targetSocketId}:`, event.streams[0]);
      if (event.receiver && 'playoutDelayHint' in event.receiver) {
        (event.receiver as any).playoutDelayHint = 0; // Minimize playout buffering delay
      }

      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        const vTrack = stream.getVideoTracks()[0];
        if (vTrack) {
          const settings = vTrack.getSettings();
          setStreamStats({
            width: settings.width || 1920,
            height: settings.height || 1080,
            frameRate: Math.round(settings.frameRate || 60),
          });
        }

        setRemoteStreams((prev) => ({
          ...prev,
          [targetSocketId]: {
            stream,
            username: presenterInfoRef.current?.username || 'Peer Presenter',
          },
        }));
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`🎥 [WebRTC] ICE Connection State with ${targetSocketId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'closed') {
        pc.close();
        delete peerConnectionsRef.current[targetSocketId];
        setRemoteStreams((prev) => {
          const updated = { ...prev };
          delete updated[targetSocketId];
          return updated;
        });
      }
    };

    return pc;
  }, [socket]);

  // Cleanly teardown and stop screen sharing tracks
  const stopScreenShare = useCallback(() => {
    console.log('🎥 [WebRTC] Stopping local screen share stream');
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log(`🎥 [WebRTC] Stopped track: ${track.kind} (${track.label})`);
      });
      localStreamRef.current = null;
    }

    // Close peer connections and reset state
    Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
    peerConnectionsRef.current = {};

    setLocalStream(null);
    setIsSharing(false);
    setPresenterInfo(null);
    presenterInfoRef.current = null;
    setRemoteStreams({});
    setStreamStats(null);

    if (socket && channelId) {
      socket.emit('screen:stop', { channelId });
    }
  }, [socket, channelId]);

  // Request display media (1080p @ 60fps target with 7 Mbps bitrate & detail contentHint)
  const startScreenShare = useCallback(async () => {
    setErrorMsg(null);
    console.log('🎥 [WebRTC] Requesting getDisplayMedia with 1080p (1920x1080) @ 60fps target...');
    try {
      let stream: MediaStream;

      try {
        // High quality target: 1080p (1920x1080) @ 60fps
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 60, max: 60 },
          },
          audio: false,
        });
      } catch (err) {
        console.warn('🎥 [WebRTC] 1080p / 60fps constraint fallback triggered:', err);
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
      }

      console.log('🎥 [WebRTC] getDisplayMedia resolved with MediaStream:', stream);

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        // Set contentHint = 'detail' for maximum text/UI sharpness
        if ('contentHint' in videoTrack) {
          videoTrack.contentHint = 'detail';
          console.log('🎥 [WebRTC] Set videoTrack.contentHint = "detail" (Optimized for text/UI sharpness)');
        }

        // Measure actual captured resolution & frame rate from browser
        const settings = videoTrack.getSettings();
        const actualStats: StreamStats = {
          width: settings.width || 1920,
          height: settings.height || 1080,
          frameRate: Math.round(settings.frameRate || 60),
        };
        console.log('🎥 [WebRTC] Actual captured stream settings:', actualStats);
        setStreamStats(actualStats);
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsSharing(true);

      const info = { username: user?.username || 'You', socketId: socket?.id || '' };
      presenterInfoRef.current = info;
      setPresenterInfo(info);

      // Apply 7 Mbps bitrate setting to any existing peer senders
      Object.values(peerConnectionsRef.current).forEach((pc) => {
        const senders = pc.getSenders();
        senders.forEach((sender) => {
          if (sender.track?.kind === 'video') {
            applyHighBitrateEncoding(sender);
          }
        });
      });

      // Handle user clicking native browser "Stop Sharing" floating bar
      if (videoTrack) {
        videoTrack.onended = () => {
          console.log('🎥 [WebRTC] Native browser stop sharing clicked');
          stopScreenShare();
        };
      }

      if (socket && channelId) {
        socket.emit('screen:start', { channelId });
      }
    } catch (err: any) {
      console.error('🎥 [WebRTC] getDisplayMedia Permission Error:', err);
      if (err.name === 'NotAllowedError') {
        setErrorMsg('Screen sharing permission was denied by the browser.');
      } else {
        setErrorMsg('Failed to start screen share: ' + (err.message || 'Unknown error'));
      }
    }
  }, [socket, channelId, user, stopScreenShare]);

  // Handle voice channel join and socket signaling events
  useEffect(() => {
    if (!socket || !channelId) return;

    console.log(`🎥 [WebRTC] Joining voice room for channel ${channelId}`);
    socket.emit('voice:join', { channelId });

    // Handle existing peers in the room
    const handleVoicePeers = ({ existingSockets }: { existingSockets: string[] }) => {
      console.log('🎥 [WebRTC] Voice peers currently in room:', existingSockets);
    };

    // Handle new user joining room
    const handleUserJoined = ({ socketId, user: peerUser }: { socketId: string; user: { username: string } }) => {
      console.log(`🎥 [WebRTC] Peer ${peerUser.username} (${socketId}) joined room`);
      if (localStreamRef.current) {
        const pc = createPeerConnection(socketId);
        pc.createOffer().then((offer) => {
          pc.setLocalDescription(offer);
          socket.emit('webrtc:offer', { targetSocketId: socketId, offer });
        });
      }
    };

    // Handle incoming offer
    const handleOffer = async ({ senderSocketId, senderUser, offer }: { senderSocketId: string; senderUser: { username: string }; offer: any }) => {
      console.log(`🎥 [WebRTC] Received offer from ${senderUser.username} (${senderSocketId})`);
      presenterInfoRef.current = { username: senderUser.username, socketId: senderSocketId };
      setPresenterInfo(presenterInfoRef.current);

      const pc = createPeerConnection(senderSocketId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('webrtc:answer', { targetSocketId: senderSocketId, answer });
    };

    // Handle incoming answer
    const handleAnswer = async ({ senderSocketId, answer }: { senderSocketId: string; answer: any }) => {
      console.log(`🎥 [WebRTC] Received answer from ${senderSocketId}`);
      const pc = peerConnectionsRef.current[senderSocketId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    // Handle incoming ICE candidate
    const handleIceCandidate = async ({ senderSocketId, candidate }: { senderSocketId: string; candidate: any }) => {
      const pc = peerConnectionsRef.current[senderSocketId];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    // Handle screen share start/stop notifications
    const handleScreenStart = ({ presenterSocketId, presenterUser }: { presenterSocketId: string; presenterUser: { username: string } }) => {
      console.log(`🎥 [WebRTC] Screen share started by ${presenterUser.username}`);
      presenterInfoRef.current = { username: presenterUser.username, socketId: presenterSocketId };
      setPresenterInfo(presenterInfoRef.current);
    };

    const handleScreenStop = ({ presenterSocketId }: { presenterSocketId: string }) => {
      console.log(`🎥 [WebRTC] Screen share stopped by ${presenterSocketId}`);
      setRemoteStreams((prev) => {
        const updated = { ...prev };
        delete updated[presenterSocketId];
        return updated;
      });
      if (presenterInfoRef.current?.socketId === presenterSocketId) {
        presenterInfoRef.current = null;
        setPresenterInfo(null);
        setStreamStats(null);
      }
    };

    socket.on('voice:peers', handleVoicePeers);
    socket.on('voice:user-joined', handleUserJoined);
    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);
    socket.on('screen:start', handleScreenStart);
    socket.on('screen:stop', handleScreenStop);

    return () => {
      socket.emit('voice:leave', { channelId });
      socket.off('voice:peers', handleVoicePeers);
      socket.off('voice:user-joined', handleUserJoined);
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
      socket.off('screen:start', handleScreenStart);
      socket.off('screen:stop', handleScreenStop);

      stopScreenShare();
    };
  }, [socket, channelId, createPeerConnection, stopScreenShare]);

  return {
    isSharing,
    localStream,
    remoteStreams,
    presenterInfo,
    errorMsg,
    streamStats,
    startScreenShare,
    stopScreenShare,
  };
};
