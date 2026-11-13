import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import os from 'os';
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
// Exact origins always allowed
const allowedOriginsList = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:5000',
  'https://wanzxplays-client.vercel.app',
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map((u) => u.trim()) : []),
];

// Patterns for preview deployments, local network devices, and secure tunnels
const allowedOriginPatterns = [
  // Allow all Vercel deployments (production, preview, staging)
  /^https:\/\/[a-zA-Z0-9-_.]+\.vercel\.app$/,
  // Allow all local network IPs (phone/tablet on Wi-Fi: 192.168.x.x, 10.x.x.x, 172.16-31.x.x) on any port
  /^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/,
  // Allow loopback / localhost on any port
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
  // Allow popular secure tunnels for online cross-device communications (Cloudflare, Localtunnel, Ngrok)
  /^https:\/\/[a-zA-Z0-9-]+\.(trycloudflare\.com|loca\.lt|ngrok-free\.app|ngrok\.io|ngrok\.app)(:\d+)?$/,
  // Allow popular PaaS domains
  /^https:\/\/[a-zA-Z0-9-_.]+\.(railway\.app|up\.railway\.app|onrender\.com)$/,
];

const isOriginAllowed = (origin: string): boolean => {
  // In development mode, accept requests from any origin to ease cross-device testing
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  if (allowedOriginsList.includes(origin)) return true;
  return allowedOriginPatterns.some((pattern) => pattern.test(origin));
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      // Return null, false — NOT new Error() — so Express returns a clean
      // CORS rejection (no Access-Control-Allow-Origin header) instead of 500
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Socket.io initialization with CORS
export const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || isOriginAllowed(origin)) return callback(null, true);
      callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  },
});

// Setup Socket.io real-time handlers
setupSocketHandlers(io);

// Apply CORS middleware with shared corsOptions
app.use(cors(corsOptions));
// Handle OPTIONS preflight using the SAME corsOptions (not a bare cors())
app.options('*', cors(corsOptions));
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

// Export Express app and server for serverless / custom runners
export default app;
export { app, server };

// Only listen when running as a persistent Node server (Render, Railway, Local)
// Never call server.listen() in serverless environments (e.g. Vercel Serverless Functions)
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  server.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`\n==================================================`);
    console.log(`⚡ PulseCord server is running!`);
    console.log(`👉 Local:   http://localhost:${PORT}`);

    // List all local IPv4 addresses (for testing across phones, tablets, laptops on same Wi-Fi)
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          console.log(`👉 Network (Other Devices on Wi-Fi): http://${net.address}:${PORT}`);
        }
      }
    }
    console.log(`==================================================\n`);
  });
}
