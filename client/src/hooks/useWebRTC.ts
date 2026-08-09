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

export interface VoiceParticipant {
  socketId: string;
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  isMuted?: boolean;
  isDeafened?: boolean;
  isSpeaking?: boolean;
}

export const useWebRTC = (channelId: string | null) => {
  const { socket } = useSocket();
  const { user } = useAuth();

  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{ [socketId: string]: { stream: MediaStream; username: string } }>({});
  const [remoteAudioStreams, setRemoteAudioStreams] = useState<{ [socketId: string]: MediaStream }>({});
  const [presenterInfo, setPresenterInfo] = useState<{ username: string; socketId: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [streamStats, setStreamStats] = useState<StreamStats | null>(null);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);

  const peerConnectionsRef = useRef<PeerConnectionMap>({});
  const localStreamRef = useRef<MediaStream | null>(null);
  const localAudioStreamRef = useRef<MediaStream | null>(null);
  const presenterInfoRef = useRef<{ username: string; socketId: string } | null>(null);
  const roomPeersRef = useRef<string[]>([]);

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
        params.encodings[0].maxBitrate = 7000000;
        params.degradationPreference = 'maintain-framerate';

        sender.setParameters(params).then(() => {
          console.log('🎥 [WebRTC] Set maxBitrate=7,000,000 bps (7 Mbps)');
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

    // Attach local mic audio stream tracks if available
    if (localAudioStreamRef.current) {
      localAudioStreamRef.current.getAudioTracks().forEach((track) => {
        console.log(`🎙️ [WebRTC] Attaching mic audio track (${track.label}) to peer ${targetSocketId}`);
        pc.addTrack(track, localAudioStreamRef.current!);
      });
    }

    // Attach local screen share video stream tracks if presenting
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

    // Track handler (receive remote video & audio)
    pc.ontrack = (event) => {
      console.log(`🎥 [WebRTC] Received remote stream track (${event.track.kind}) from ${targetSocketId}:`, event.streams[0]);
      if (event.receiver && 'playoutDelayHint' in event.receiver) {
        (event.receiver as any).playoutDelayHint = 0;
      }

      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];

        // Handle remote microphone audio stream
        if (event.track.kind === 'audio') {
          console.log(`🔊 [WebRTC] Setting remote audio stream for peer ${targetSocketId}`);
          setRemoteAudioStreams((prev) => ({
            ...prev,
            [targetSocketId]: stream,
          }));
        }

        // Handle remote video stream for screen share
        if (event.track.kind === 'video') {
          console.log(`🎥 [WebRTC] Setting remote video screen share stream for peer ${targetSocketId}`);
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
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`🎥 [WebRTC] ICE Connection State with ${targetSocketId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'closed') {
        pc.close();
        delete peerConnectionsRef.current[targetSocketId];
        setRemoteAudioStreams((prev) => {
          const updated = { ...prev };
          delete updated[targetSocketId];
          return updated;
        });
        setRemoteStreams((prev) => {
          const updated = { ...prev };
          delete updated[targetSocketId];
          return updated;
        });
      }
    };

    return pc;
  }, [socket]);

  // Toggle local microphone audio track enabled state
  const setMicMutedState = useCallback((muted: boolean) => {
    if (localAudioStreamRef.current) {
      localAudioStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
        console.log(`🎙️ [WebRTC] Toggled mic track enabled = ${!muted} (${track.label})`);
      });
    }
  }, []);

  // Cleanly teardown and stop screen sharing tracks
  const stopScreenShare = useCallback(() => {
    console.log('🎥 [WebRTC] Stopping local screen share stream');
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    // Remove video senders from existing peer connections
    Object.keys(peerConnectionsRef.current).forEach(async (targetSocketId) => {
      const pc = peerConnectionsRef.current[targetSocketId];
      if (pc) {
        const senders = pc.getSenders();
        const videoSender = senders.find((s) => s.track?.kind === 'video');
        if (videoSender) {
          try {
            pc.removeTrack(videoSender);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket?.emit('webrtc:offer', { targetSocketId, offer });
          } catch (e) {
            console.warn('🎥 [WebRTC] Remove video track error:', e);
          }
        }
      }
    });

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

  // Request display media & broadcast video stream to all room peers with WebRTC offer renegotiation
  const startScreenShare = useCallback(async () => {
    setErrorMsg(null);
    console.log('🎥 [WebRTC] Requesting getDisplayMedia...');
    try {
      let stream: MediaStream;

      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 60, max: 60 },
          },
          audio: false,
        });
      } catch (err) {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
      }

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        if ('contentHint' in videoTrack) {
          videoTrack.contentHint = 'detail';
        }
        const settings = videoTrack.getSettings();
        const actualStats: StreamStats = {
          width: settings.width || 1920,
          height: settings.height || 1080,
          frameRate: Math.round(settings.frameRate || 60),
        };
        setStreamStats(actualStats);
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsSharing(true);

      const info = { username: user?.username || 'You', socketId: socket?.id || '' };
      presenterInfoRef.current = info;
      setPresenterInfo(info);

      // Attach/replace video track on all active peer connections and trigger SDP renegotiation
      roomPeersRef.current.forEach(async (targetSocketId) => {
        if (targetSocketId && targetSocketId !== socket?.id) {
          const pc = createPeerConnection(targetSocketId);
          if (videoTrack) {
            const senders = pc.getSenders();
            const existingVideoSender = senders.find((s) => s.track?.kind === 'video');

            if (existingVideoSender) {
              console.log(`🎥 [WebRTC] Replacing video track on existing sender for peer ${targetSocketId}`);
              await existingVideoSender.replaceTrack(videoTrack);
              applyHighBitrateEncoding(existingVideoSender);
            } else {
              console.log(`🎥 [WebRTC] Adding new video track to PC for peer ${targetSocketId}`);
              const sender = pc.addTrack(videoTrack, stream);
              applyHighBitrateEncoding(sender);
            }

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket?.emit('webrtc:offer', { targetSocketId, offer });
          }
        }
      });

      if (videoTrack) {
        videoTrack.onended = () => {
          stopScreenShare();
        };
      }

      if (socket && channelId) {
        socket.emit('screen:start', { channelId });
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setErrorMsg('Screen sharing permission was denied by the browser.');
      } else {
        setErrorMsg('Failed to start screen share: ' + (err.message || 'Unknown error'));
      }
    }
  }, [socket, channelId, user, createPeerConnection, stopScreenShare]);

  // Handle voice channel join and socket signaling events with prior mic audio acquisition
  useEffect(() => {
    if (!socket || !channelId) return;

    let isSubscribed = true;

    const joinVoiceChannel = async () => {
      // Acquire local mic stream FIRST before signaling room join
      try {
        console.log('🎙️ [WebRTC] Requesting getUserMedia({ audio: true })...');
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (isSubscribed) {
          localAudioStreamRef.current = micStream;
          console.log('🎙️ [WebRTC] Mic stream captured successfully:', micStream.getAudioTracks()[0]?.label);
        }
      } catch (err) {
        console.warn('🎙️ [WebRTC] Mic getUserMedia warning (permission denied or no mic device):', err);
      }

      if (!isSubscribed) return;

      console.log(`🎥 [WebRTC] Joining voice room for channel ${channelId}`);
      socket.emit('voice:join', {
        channelId,
        userProfile: {
          displayName: user?.displayName || user?.username,
          avatar: user?.avatar,
        },
      });
    };

    const handleVoicePeers = ({ peers, participants: initialParticipants }: { peers: string[]; participants?: VoiceParticipant[] }) => {
      console.log('🎥 [WebRTC] Voice peers currently in room:', peers);
      roomPeersRef.current = peers || [];
      if (initialParticipants) {
        setParticipants(initialParticipants);
      }

      // Establish WebRTC PeerConnections to all existing room peers with mic audio
      (peers || []).forEach((targetSocketId) => {
        if (targetSocketId && targetSocketId !== socket.id) {
          const pc = createPeerConnection(targetSocketId);
          pc.createOffer().then((offer) => {
            pc.setLocalDescription(offer);
            socket.emit('webrtc:offer', { targetSocketId, offer });
          });
        }
      });
    };

    const handleVoiceParticipants = (updatedParticipants: VoiceParticipant[]) => {
      setParticipants(updatedParticipants);
    };

    const handleVoiceStateUpdate = (update: { socketId: string; isMuted?: boolean; isDeafened?: boolean; isSpeaking?: boolean }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === update.socketId ? { ...p, ...update } : p))
      );
    };

    const handleUserJoined = ({ socketId, user: peerUser }: { socketId: string; user: { username: string; displayName?: string; avatar?: string } }) => {
      console.log(`🎥 [WebRTC] Peer ${peerUser.username} (${socketId}) joined room`);
      if (!roomPeersRef.current.includes(socketId)) {
        roomPeersRef.current.push(socketId);
      }

      const pc = createPeerConnection(socketId);
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
        socket.emit('webrtc:offer', { targetSocketId: socketId, offer });
      });
    };

    const handleUserLeft = ({ socketId }: { socketId: string }) => {
      console.log(`🎥 [WebRTC] Peer ${socketId} left room`);
      roomPeersRef.current = roomPeersRef.current.filter((id) => id !== socketId);
      if (peerConnectionsRef.current[socketId]) {
        peerConnectionsRef.current[socketId].close();
        delete peerConnectionsRef.current[socketId];
      }
      setRemoteAudioStreams((prev) => {
        const updated = { ...prev };
        delete updated[socketId];
        return updated;
      });
      setRemoteStreams((prev) => {
        const updated = { ...prev };
        delete updated[socketId];
        return updated;
      });
      if (presenterInfoRef.current?.socketId === socketId) {
        presenterInfoRef.current = null;
        setPresenterInfo(null);
        setStreamStats(null);
      }
    };

    const handleOffer = async ({ senderSocketId, senderUser, offer }: { senderSocketId: string; senderUser: { username: string }; offer: any }) => {
      console.log(`🎥 [WebRTC] Received offer from ${senderUser.username} (${senderSocketId})`);
      const pc = createPeerConnection(senderSocketId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('webrtc:answer', { targetSocketId: senderSocketId, answer });
    };

    const handleAnswer = async ({ senderSocketId, answer }: { senderSocketId: string; answer: any }) => {
      console.log(`🎥 [WebRTC] Received answer from ${senderSocketId}`);
      const pc = peerConnectionsRef.current[senderSocketId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const handleIceCandidate = async ({ senderSocketId, candidate }: { senderSocketId: string; candidate: any }) => {
      const pc = peerConnectionsRef.current[senderSocketId];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };

    const handleScreenStart = ({ presenterSocketId, presenterUser }: { presenterSocketId: string; presenterUser: { username: string } }) => {
      console.log(`🎥 [WebRTC] Screen share started by ${presenterUser.username} (${presenterSocketId})`);
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
    socket.on('voice:participants', handleVoiceParticipants);
    socket.on('voice:state-update', handleVoiceStateUpdate);
    socket.on('voice:user-joined', handleUserJoined);
    socket.on('voice:user-left', handleUserLeft);
    socket.on('webrtc:offer', handleOffer);
    socket.on('webrtc:answer', handleAnswer);
    socket.on('webrtc:ice-candidate', handleIceCandidate);
    socket.on('screen:start', handleScreenStart);
    socket.on('screen:stop', handleScreenStop);

    joinVoiceChannel();

    return () => {
      isSubscribed = false;
      socket.emit('voice:leave', { channelId });
      socket.off('voice:peers', handleVoicePeers);
      socket.off('voice:participants', handleVoiceParticipants);
      socket.off('voice:state-update', handleVoiceStateUpdate);
      socket.off('voice:user-joined', handleUserJoined);
      socket.off('voice:user-left', handleUserLeft);
      socket.off('webrtc:offer', handleOffer);
      socket.off('webrtc:answer', handleAnswer);
      socket.off('webrtc:ice-candidate', handleIceCandidate);
      socket.off('screen:start', handleScreenStart);
      socket.off('screen:stop', handleScreenStop);

      if (localAudioStreamRef.current) {
        localAudioStreamRef.current.getTracks().forEach((t) => t.stop());
        localAudioStreamRef.current = null;
      }

      stopScreenShare();
    };
  }, [socket, channelId, user, createPeerConnection, stopScreenShare]);

  return {
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
  };
};
