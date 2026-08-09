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
  const peerUsernamesRef = useRef<{ [socketId: string]: string }>({});
  const roomPeersRef = useRef<string[]>([]);
  const pendingIceCandidatesRef = useRef<{ [socketId: string]: RTCIceCandidateInit[] }>({});
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const STUN_SERVERS: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
  };

  // Helper to create RTCPeerConnection for a specific target socket
  const createPeerConnection = useCallback((targetSocketId: string): RTCPeerConnection => {
    if (peerConnectionsRef.current[targetSocketId]) {
      return peerConnectionsRef.current[targetSocketId];
    }

    const timestamp = new Date().toISOString();
    console.log(`🎥 [PC-DIAG] [${timestamp}] Creating RTCPeerConnection for target peer: ${targetSocketId}`);
    const pc = new RTCPeerConnection(STUN_SERVERS);
    peerConnectionsRef.current[targetSocketId] = pc;

    // Attach local mic audio stream tracks if available
    if (localAudioStreamRef.current) {
      localAudioStreamRef.current.getAudioTracks().forEach((track) => {
        pc.addTrack(track, localAudioStreamRef.current!);
      });
    }

    // Attach local screen share video stream tracks if presenting
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // ICE Candidate handler
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log(`[ICE-DEBUG] Candidate generated for target ${targetSocketId}:`, event.candidate.candidate);
        socket.emit('webrtc:ice-candidate', {
          targetSocketId,
          candidate: event.candidate,
        });
      } else if (!event.candidate) {
        console.log(`[ICE-DEBUG] Candidate gathering finished for target ${targetSocketId}`);
      }
    };

    // Track handler (receive remote video & audio)
    pc.ontrack = (event) => {
      console.log('TRACK RECEIVED:', event.track.kind, event.track.readyState, event.track.enabled, event.track.muted);
      if (event.receiver && 'playoutDelayHint' in event.receiver) {
        (event.receiver as any).playoutDelayHint = 0;
      }

      // Handle remote microphone audio stream
      if (event.track.kind === 'audio') {
        const audioStream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
        setRemoteAudioStreams((prev) => ({
          ...prev,
          [targetSocketId]: audioStream,
        }));
      }

      // Handle remote video stream for screen share
      if (event.track.kind === 'video') {
        // Monitor RECEIVER bytesReceived / packetsReceived / framesDecoded for 5 seconds
        let rTick = 0;
        const receiverStatsInterval = setInterval(async () => {
          rTick++;
          const stats = await pc.getStats();
          stats.forEach((report) => {
            if (report.type === 'inbound-rtp' && report.kind === 'video') {
              console.log(`🎥 [RTP-RECEIVER-STATS] Tick ${rTick}/5:`, {
                bytesReceived: report.bytesReceived,
                packetsReceived: report.packetsReceived,
                packetsLost: report.packetsLost,
                framesDecoded: report.framesDecoded,
                framesDropped: report.framesDropped,
                decoderImplementation: report.decoderImplementation,
                codecId: report.codecId,
              });
            }
          });
          if (rTick >= 5) clearInterval(receiverStatsInterval);
        }, 1000);

        const peerUsername = peerUsernamesRef.current[targetSocketId] || presenterInfoRef.current?.username || 'Peer Presenter';
        const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);

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
            username: peerUsername,
          },
        }));
      }
    };

    pc.oniceconnectionstatechange = () => {
      const timestamp = new Date().toISOString();
      console.log(`🎥 [PC-DIAG] [${timestamp}] ICE Connection State with ${targetSocketId}: ${pc.iceConnectionState}`);
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
      });
    }
  }, []);

  // Cleanly teardown and stop screen sharing tracks
  const stopScreenShare = useCallback(() => {
    console.log('🎥 [WebRTC Pipeline] Stopping local screen share stream');
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
            if (pc.signalingState === 'stable') {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              socket?.emit('webrtc:offer', {
                targetSocketId,
                senderUser: { id: userRef.current?.id, username: userRef.current?.username },
                offer,
              });
            }
          } catch (e) {
            console.warn('🎥 [WebRTC Pipeline] Remove video track error:', e);
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

  const stopScreenShareRef = useRef(stopScreenShare);
  useEffect(() => {
    stopScreenShareRef.current = stopScreenShare;
  }, [stopScreenShare]);

  // Request display media & broadcast video stream to all room peers with WebRTC offer renegotiation
  const startScreenShare = useCallback(async () => {
    setErrorMsg(null);
    console.log('🎥 [WebRTC Pipeline] Requesting getDisplayMedia...');
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

      const info = { username: userRef.current?.username || 'You', socketId: socket?.id || '' };
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
              await existingVideoSender.replaceTrack(videoTrack);
            } else {
              pc.addTrack(videoTrack, stream);
            }

            // Ensure sender transceiver direction is explicitly sendonly so answer doesn't silence video RTP
            const videoTransceiver = pc.getTransceivers().find((t) => t.sender.track?.kind === 'video');
            if (videoTransceiver) {
              videoTransceiver.direction = 'sendonly';
              console.log('🎥 [RTP-SENDER-DIAG] Transceiver direction:', videoTransceiver.direction, 'currentDirection:', videoTransceiver.currentDirection);
            }

            const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
            if (sender) {
              console.log('🎥 [RTP-SENDER-DIAG] Sender encodings:', sender.getParameters()?.encodings);
            }

            // Monitor SENDER bytesSent for 5 seconds
            let sTick = 0;
            const senderStatsInterval = setInterval(async () => {
              sTick++;
              const stats = await pc.getStats();
              stats.forEach((report) => {
                if (report.type === 'outbound-rtp' && report.kind === 'video') {
                  console.log(`🎥 [RTP-SENDER-STATS] Tick ${sTick}/5:`, {
                    bytesSent: report.bytesSent,
                    packetsSent: report.packetsSent,
                    framesEncoded: report.framesEncoded,
                    encoderImplementation: report.encoderImplementation,
                    codecId: report.codecId,
                    active: report.active,
                  });
                }
              });
              if (sTick >= 5) clearInterval(senderStatsInterval);
            }, 1000);

            if (pc.signalingState === 'stable') {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);
              console.log('🎥 [SDP-SENDER-OFFER] Video m-line:', offer.sdp?.split('m=video')[1]?.split('m=')[0]);
              socket?.emit('webrtc:offer', {
                targetSocketId,
                senderUser: { id: userRef.current?.id, username: userRef.current?.username },
                offer,
              });
            }
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
  }, [socket, channelId, createPeerConnection, stopScreenShare]);

  // Handle voice channel join and socket signaling events with prior mic audio acquisition
  useEffect(() => {
    if (!socket || !channelId) return;

    let isSubscribed = true;

    const joinVoiceChannel = async () => {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (isSubscribed) {
          localAudioStreamRef.current = micStream;
        }
      } catch (err) {
        console.warn('🎙️ [WebRTC Pipeline] Mic getUserMedia warning:', err);
      }

      if (!isSubscribed) return;

      socket.emit('voice:join', {
        channelId,
        userProfile: {
          displayName: userRef.current?.displayName || userRef.current?.username,
          avatar: userRef.current?.avatar,
        },
      });
    };

    const handleVoicePeers = ({ peers, participants: initialParticipants }: { peers: string[]; participants?: VoiceParticipant[] }) => {
      roomPeersRef.current = peers || [];
      if (initialParticipants) {
        setParticipants(initialParticipants);
        initialParticipants.forEach((p) => {
          if (p.socketId && p.username) {
            peerUsernamesRef.current[p.socketId] = p.username;
          }
        });
      }

      (peers || []).forEach((targetSocketId) => {
        if (targetSocketId && targetSocketId !== socket.id) {
          const pc = createPeerConnection(targetSocketId);
          if (pc.signalingState === 'stable') {
            pc.createOffer().then((offer) => {
              pc.setLocalDescription(offer);
              socket.emit('webrtc:offer', {
                targetSocketId,
                senderUser: { id: userRef.current?.id, username: userRef.current?.username },
                offer,
              });
            });
          }
        }
      });
    };

    const handleVoiceParticipants = (updatedParticipants: VoiceParticipant[]) => {
      setParticipants(updatedParticipants);
      updatedParticipants.forEach((p) => {
        if (p.socketId && p.username) {
          peerUsernamesRef.current[p.socketId] = p.username;
        }
      });
    };

    const handleVoiceStateUpdate = (update: { socketId: string; isMuted?: boolean; isDeafened?: boolean; isSpeaking?: boolean }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === update.socketId ? { ...p, ...update } : p))
      );
    };

    const handleUserJoined = ({ socketId, user: peerUser }: { socketId: string; user: { id: string; username: string; displayName?: string; avatar?: string } }) => {
      if (peerUser?.username) {
        peerUsernamesRef.current[socketId] = peerUser.username;
      }
      if (!roomPeersRef.current.includes(socketId)) {
        roomPeersRef.current.push(socketId);
      }

      const pc = createPeerConnection(socketId);
      if (pc.signalingState === 'stable') {
        pc.createOffer().then((offer) => {
          pc.setLocalDescription(offer);
          socket.emit('webrtc:offer', {
            targetSocketId: socketId,
            senderUser: { id: userRef.current?.id, username: userRef.current?.username },
            offer,
          });
        });
      }
    };

    const handleUserLeft = ({ socketId }: { socketId: string }) => {
      roomPeersRef.current = roomPeersRef.current.filter((id) => id !== socketId);
      delete peerUsernamesRef.current[socketId];
      delete pendingIceCandidatesRef.current[socketId];
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

    const drainIceCandidates = async (targetSocketId: string, pc: RTCPeerConnection) => {
      const queue = pendingIceCandidatesRef.current[targetSocketId];
      if (queue && queue.length > 0) {
        console.log(`[ICE-DEBUG] Draining ${queue.length} buffered candidate(s) for ${targetSocketId}`);
        const candidatesToApply = [...queue];
        pendingIceCandidatesRef.current[targetSocketId] = [];
        for (const candidate of candidatesToApply) {
          if (candidate) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
              console.log(`[ICE-DEBUG] Successfully added buffered ICE candidate for ${targetSocketId}`);
            } catch (err) {
              console.error(`[ICE-DEBUG] Error adding buffered ICE candidate for ${targetSocketId}:`, err);
            }
          }
        }
      }
    };

    const handleOffer = async ({ senderSocketId, senderUser, offer }: { senderSocketId: string; senderUser: { id: string; username: string }; offer: any }) => {
      if (senderUser?.username) {
        peerUsernamesRef.current[senderSocketId] = senderUser.username;
      }
      const pc = createPeerConnection(senderSocketId);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await drainIceCandidates(senderSocketId, pc);

        // Ensure receiver transceiver direction accepts incoming screen video
        pc.getTransceivers().forEach((t) => {
          if (t.receiver.track.kind === 'video' && !t.sender.track) {
            t.direction = 'recvonly';
          }
        });

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc:answer', { targetSocketId: senderSocketId, answer });
      } catch (err) {
        console.warn(`🎥 [WebRTC Pipeline] Ignored offer in signalingState: ${pc.signalingState}`, err);
      }
    };

    const handleAnswer = async ({ senderSocketId, answer }: { senderSocketId: string; answer: any }) => {
      const pc = peerConnectionsRef.current[senderSocketId];
      if (pc) {
        if (pc.signalingState === 'have-local-offer') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            await drainIceCandidates(senderSocketId, pc);
          } catch (err) {
            console.warn(`🎥 [WebRTC Pipeline] Error setting remote answer:`, err);
          }
        }
      }
    };

    const handleIceCandidate = async ({ senderSocketId, candidate }: { senderSocketId: string; candidate: any }) => {
      console.log(`[ICE-DEBUG] Candidate received from ${senderSocketId}:`, candidate?.candidate);
      const pc = peerConnectionsRef.current[senderSocketId];

      if (!pc || !pc.remoteDescription) {
        console.log(`[ICE-DEBUG] QUEUED CANDIDATE for ${senderSocketId} (pc ready: ${!!pc}, remoteDesc: ${!!pc?.remoteDescription})`);
        if (!pendingIceCandidatesRef.current[senderSocketId]) {
          pendingIceCandidatesRef.current[senderSocketId] = [];
        }
        pendingIceCandidatesRef.current[senderSocketId].push(candidate);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
        console.log(`[ICE-DEBUG] Successfully added ICE candidate from ${senderSocketId}`);
      } catch (err) {
        console.error(`[ICE-DEBUG] Error calling addIceCandidate from ${senderSocketId}:`, err);
      }
    };

    const handleScreenStart = ({ presenterSocketId, presenterUser }: { presenterSocketId: string; presenterUser: { username: string } }) => {
      if (presenterUser?.username) {
        peerUsernamesRef.current[presenterSocketId] = presenterUser.username;
      }
      presenterInfoRef.current = { username: presenterUser?.username || 'Peer Presenter', socketId: presenterSocketId };
      setPresenterInfo(presenterInfoRef.current);
    };

    const handleScreenStop = ({ presenterSocketId }: { presenterSocketId: string }) => {
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

      // Stop screen share when unmounting or leaving channel
      if (stopScreenShareRef.current) {
        stopScreenShareRef.current();
      }
    };
  }, [socket, channelId]);

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
