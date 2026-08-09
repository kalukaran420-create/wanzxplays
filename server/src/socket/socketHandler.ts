import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';

interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    username: string;
  };
}

interface VoiceParticipant {
  socketId: string;
  userId: string;
  username: string;
  displayName: string;
  avatar: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
  channelId: string;
}

const voiceRooms: { [roomName: string]: { [socketId: string]: VoiceParticipant } } = {};

const getVoiceRoomsSummary = () => {
  const summary: { [channelId: string]: VoiceParticipant[] } = {};
  Object.keys(voiceRooms).forEach((roomName) => {
    const channelId = roomName.replace('voice:', '');
    const list = Object.values(voiceRooms[roomName]);
    if (list.length > 0) {
      summary[channelId] = list;
    }
  });
  return summary;
};

export function setupSocketHandlers(io: SocketIOServer) {
  // Middleware to authenticate socket connections
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    try {
      const decoded = jwt.verify(token as string, process.env.JWT_SECRET || 'fallback_secret') as {
        userId: string;
        username: string;
      };
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user!;
    console.log(`[Socket] User connected: ${user.username} (${socket.id})`);

    // Send initial voice rooms summary on connection
    socket.emit('voice:room-summary', getVoiceRoomsSummary());

    socket.on('voice:get-room-summary', () => {
      socket.emit('voice:room-summary', getVoiceRoomsSummary());
    });

    const handleJoinChannel = (channelId: string) => {
      socket.join(`channel:${channelId}`);
      console.log(`[Socket] ${user.username} joined channel:${channelId}`);
    };

    const handleLeaveChannel = (channelId: string) => {
      socket.leave(`channel:${channelId}`);
      console.log(`[Socket] ${user.username} left channel:${channelId}`);
    };

    // Join channel room (support both join:channel and channel:join aliases)
    socket.on('join:channel', handleJoinChannel);
    socket.on('channel:join', handleJoinChannel);

    // Leave channel room (support both leave:channel and channel:leave aliases)
    socket.on('leave:channel', handleLeaveChannel);
    socket.on('channel:leave', handleLeaveChannel);

    // Join DM conversation room
    socket.on('join:dm', (conversationId: string) => {
      socket.join(`dm:${conversationId}`);
      console.log(`[Socket] ${user.username} joined dm:${conversationId}`);
    });
    socket.on('dm:join', (conversationId: string) => {
      socket.join(`dm:${conversationId}`);
      console.log(`[Socket] ${user.username} joined dm:${conversationId}`);
    });

    // Leave DM conversation room
    socket.on('leave:dm', (conversationId: string) => {
      socket.leave(`dm:${conversationId}`);
      console.log(`[Socket] ${user.username} left dm:${conversationId}`);
    });

    // Helper to clean socket from voice rooms
    const removeSocketFromVoiceRooms = (targetSocketId: string) => {
      Object.keys(voiceRooms).forEach((roomName) => {
        if (voiceRooms[roomName] && voiceRooms[roomName][targetSocketId]) {
          const p = voiceRooms[roomName][targetSocketId];
          delete voiceRooms[roomName][targetSocketId];

          const remainingList = Object.values(voiceRooms[roomName]);
          io.to(roomName).emit('voice:participants', remainingList);
          socket.to(roomName).emit('voice:user-left', {
            socketId: targetSocketId,
            userId: p.userId,
          });

          if (remainingList.length === 0) {
            delete voiceRooms[roomName];
          }
        }
      });
      io.emit('voice:room-summary', getVoiceRoomsSummary());
    };

    // Voice Channel WebRTC Signaling & Real-time Participant State
    socket.on('voice:join', async ({ channelId, userProfile }: { channelId: string; userProfile?: { displayName?: string; avatar?: string } }) => {
      const roomName = `voice:${channelId}`;
      socket.join(roomName);

      if (!voiceRooms[roomName]) {
        voiceRooms[roomName] = {};
      }

      // Fetch latest profile from DB or fallback
      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId },
        select: { displayName: true, avatar: true },
      }).catch(() => null);

      const participant: VoiceParticipant = {
        socketId: socket.id,
        userId: user.userId,
        username: user.username,
        displayName: dbUser?.displayName || userProfile?.displayName || user.username,
        avatar: dbUser?.avatar || userProfile?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username)}`,
        isMuted: false,
        isDeafened: false,
        isSpeaking: false,
        channelId,
      };

      voiceRooms[roomName][socket.id] = participant;

      // Get existing peers in the room
      const room = io.sockets.adapter.rooms.get(roomName);
      const existingPeers = room ? Array.from(room).filter((id) => id !== socket.id) : [];

      console.log(`[Voice] ${user.username} (${socket.id}) joined ${roomName}. Total participants: ${Object.keys(voiceRooms[roomName]).length}`);

      // Notify caller of existing peers and complete participant list
      socket.emit('voice:peers', {
        peers: existingPeers,
        participants: Object.values(voiceRooms[roomName]),
      });

      // Broadcast complete room participant list to all sockets in room
      io.to(roomName).emit('voice:participants', Object.values(voiceRooms[roomName]));

      // Broadcast global voice room summary for sidebar previews
      io.emit('voice:room-summary', getVoiceRoomsSummary());

      // Notify existing peers that a new user joined
      socket.to(roomName).emit('voice:user-joined', {
        socketId: socket.id,
        user: { id: user.userId, username: user.username, displayName: participant.displayName, avatar: participant.avatar },
      });
    });

    socket.on('voice:leave', ({ channelId }: { channelId: string }) => {
      const roomName = `voice:${channelId}`;
      socket.leave(roomName);
      console.log(`[Voice] ${user.username} left ${roomName}`);
      removeSocketFromVoiceRooms(socket.id);
    });

    socket.on('voice:state-update', ({ channelId, isMuted, isDeafened, isSpeaking }: {
      channelId: string;
      isMuted?: boolean;
      isDeafened?: boolean;
      isSpeaking?: boolean;
    }) => {
      const roomName = `voice:${channelId}`;
      if (voiceRooms[roomName] && voiceRooms[roomName][socket.id]) {
        const p = voiceRooms[roomName][socket.id];
        if (isMuted !== undefined) p.isMuted = isMuted;
        if (isDeafened !== undefined) p.isDeafened = isDeafened;
        if (isSpeaking !== undefined) p.isSpeaking = isSpeaking;

        io.to(roomName).emit('voice:state-update', {
          socketId: socket.id,
          userId: p.userId,
          isMuted: p.isMuted,
          isDeafened: p.isDeafened,
          isSpeaking: p.isSpeaking,
        });

        io.emit('voice:room-summary', getVoiceRoomsSummary());
      }
    });

    socket.on('webrtc:offer', ({ targetSocketId, offer }: { targetSocketId: string; offer: any }) => {
      console.log(`[WebRTC] Relay offer from ${socket.id} to ${targetSocketId}`);
      io.to(targetSocketId).emit('webrtc:offer', {
        senderSocketId: socket.id,
        senderUser: { id: user.userId, username: user.username },
        offer,
      });
    });

    socket.on('webrtc:answer', ({ targetSocketId, answer }: { targetSocketId: string; answer: any }) => {
      console.log(`[WebRTC] Relay answer from ${socket.id} to ${targetSocketId}`);
      io.to(targetSocketId).emit('webrtc:answer', {
        senderSocketId: socket.id,
        answer,
      });
    });

    socket.on('webrtc:ice-candidate', ({ targetSocketId, candidate }: { targetSocketId: string; candidate: any }) => {
      io.to(targetSocketId).emit('webrtc:ice-candidate', {
        senderSocketId: socket.id,
        candidate,
      });
    });

    socket.on('screen:start', ({ channelId }: { channelId: string }) => {
      console.log(`[WebRTC] Screen share started by ${user.username} in voice:${channelId}`);
      socket.to(`voice:${channelId}`).emit('screen:start', {
        presenterSocketId: socket.id,
        presenterUser: { id: user.userId, username: user.username },
      });
    });

    socket.on('screen:stop', ({ channelId }: { channelId: string }) => {
      console.log(`[WebRTC] Screen share stopped by ${user.username} in voice:${channelId}`);
      socket.to(`voice:${channelId}`).emit('screen:stop', {
        presenterSocketId: socket.id,
      });
    });

    // Voice Channel Soundboard Real-Time Playback Broadcast
    socket.on('voice:play-sound', ({ channelId, soundId, soundName, soundIcon, soundUrl }: {
      channelId: string;
      soundId: string;
      soundName: string;
      soundIcon: string;
      soundUrl?: string;
    }) => {
      console.log(`[Soundboard] ${user.username} played '${soundName}' in voice:${channelId}`);
      io.to(`voice:${channelId}`).emit('voice:sound-played', {
        soundId,
        soundName,
        soundIcon,
        soundUrl,
        user: { id: user.userId, username: user.username },
        timestamp: Date.now(),
      });
    });

    // Typing Indicators
    socket.on('typing:start', ({ channelId, conversationId }: { channelId?: string; conversationId?: string }) => {
      if (channelId) {
        socket.to(`channel:${channelId}`).emit('typing:start', { userId: user.userId, username: user.username, channelId });
      } else if (conversationId) {
        socket.to(`dm:${conversationId}`).emit('typing:start', { userId: user.userId, username: user.username, conversationId });
      }
    });

    socket.on('typing:stop', ({ channelId, conversationId }: { channelId?: string; conversationId?: string }) => {
      if (channelId) {
        socket.to(`channel:${channelId}`).emit('typing:stop', { userId: user.userId, username: user.username, channelId });
      } else if (conversationId) {
        socket.to(`dm:${conversationId}`).emit('typing:stop', { userId: user.userId, username: user.username, conversationId });
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`[Socket] User disconnected: ${user.username} (${socket.id})`);
      removeSocketFromVoiceRooms(socket.id);
    });
  });
}
