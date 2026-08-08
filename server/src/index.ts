import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
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

// Socket.io initialization
export const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  },
});

// Setup Socket.io real-time handlers
setupSocketHandlers(io);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files (avatars, attachments, custom emojis, soundboard sounds)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint (Public)
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'PulseCord API Server', timestamp: new Date().toISOString() });
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

server.listen(PORT, () => {
  console.log(`🚀 PulseCord server running on http://localhost:${PORT}`);
});
