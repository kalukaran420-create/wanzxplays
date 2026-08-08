import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth';
import serverRoutes from './routes/servers';
import channelRoutes from './routes/channels';
import messageRoutes from './routes/messages';
import dmRoutes from './routes/dms';
import roleRoutes from './routes/roles';
import emojiRoutes from './routes/emojis';
import giftRoutes from './routes/gifts';
import soundRoutes from './routes/sounds';
import { setupSocketHandlers } from './socket/socketHandler';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Socket.io initialization with CORS
export const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CLIENT_URL ? [process.env.CLIENT_URL, 'http://localhost:5173'] : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
});

// Setup Socket.io real-time handlers
setupSocketHandlers(io);

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === CLIENT_URL || process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files (avatars, attachments, custom emojis, soundboard sounds)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint (Public)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'PulseCord API Server',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/servers', serverRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/dms', dmRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/emojis', emojiRoutes);
app.use('/api/gifts', giftRoutes);
app.use('/api/sounds', soundRoutes);

// In Production, serve the built React client static files
const clientDistPath = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`🚀 PulseCord server running on port ${PORT}`);
});
