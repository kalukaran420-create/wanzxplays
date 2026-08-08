import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
  user?: {
    userId: string;
    username: string;
  };
}

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

    // Voice Channel WebRTC Signaling
    socket.on('voice:join', ({ channelId }: { channelId: string }) => {
      const roomName = `voice:${channelId}`;
      socket.join(roomName);

      // Get existing peers in the room
      const room = io.sockets.adapter.rooms.get(roomName);
      const existingPeers = room ? Array.from(room).filter((id) => id !== socket.id) : [];

      console.log(`[Voice] ${user.username} (${socket.id}) joined ${roomName}. Peers in room:`, existingPeers);

      // Notify caller of existing peers
      socket.emit('voice:peers', {
        peers: existingPeers,
      });

      // Notify existing peers that a new user joined
      socket.to(roomName).emit('voice:user-joined', {
        socketId: socket.id,
        user: { id: user.userId, username: user.username },
      });
    });

    socket.on('voice:leave', ({ channelId }: { channelId: string }) => {
      const roomName = `voice:${channelId}`;
      socket.leave(roomName);
      console.log(`[Voice] ${user.username} left ${roomName}`);

      socket.to(roomName).emit('voice:user-left', {
        socketId: socket.id,
        userId: user.userId,
      });
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
    });
  });
}
