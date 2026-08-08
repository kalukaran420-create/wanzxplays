import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';
import { prisma } from '../utils/prisma';

export const setupSocketHandlers = (io: SocketIOServer) => {
  // Socket auth handshake middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }
    try {
      const payload = verifyToken(token);
      (socket as any).user = payload;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = (socket as any).user;
    console.log(`[Socket] User connected: ${user.username} (${socket.id})`);

    // Set online status in DB and broadcast to all clients
    try {
      await prisma.user.update({
        where: { id: user.userId },
        data: { status: 'online' },
      });
      io.emit('user:status_change', { userId: user.userId, status: 'online' });
    } catch (e) {
      console.error('Socket online error:', e);
    }

    // Join Channel Room
    socket.on('channel:join', (channelId: string) => {
      socket.join(`channel:${channelId}`);
      console.log(`[Socket] ${user.username} joined channel:${channelId}`);
    });

    // Leave Channel Room
    socket.on('channel:leave', (channelId: string) => {
      socket.leave(`channel:${channelId}`);
      console.log(`[Socket] ${user.username} left channel:${channelId}`);
    });

    // Join DM Room
    socket.on('dm:join', (conversationId: string) => {
      socket.join(`dm:${conversationId}`);
      console.log(`[Socket] ${user.username} joined dm:${conversationId}`);
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
    socket.on('disconnect', async () => {
      console.log(`[Socket] User disconnected: ${user.username} (${socket.id})`);
    });
  });
};
