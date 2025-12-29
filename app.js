// app.js
require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./db/db');
const seedDefaultRooms = require('./utils/seedDefaultRooms');

// Routes
const authRoutes = require('./routes/auth-routes');
const roomRoutes = require('./routes/room-routes');
const messageRoutes = require('./routes/message-routes');

// Socket auth middleware
const socketAuth = require('./middleware/socketAuth');

// Models (used inside socket events)
const Message = require('./models/message-model');
const Room = require('./models/room-model');

const app = express();
const server = http.createServer(app);

/* =======================
   Express Middlewares
======================= */
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
  credentials: true
}));

// Basic security headers (minimal replacement for helmet to avoid extra deps)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});

// Simple in-memory rate limiter (per IP) - suitable for dev/small scale
const rateWindowMs = 60 * 1000; // 1 minute
const maxRequestsPerWindow = 120;
const ipHits = new Map();
app.use((req, res, next) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = ipHits.get(ip) || { count: 0, start: now };

    if (now - entry.start > rateWindowMs) {
      // reset
      entry.count = 1;
      entry.start = now;
    } else {
      entry.count++;
    }

    ipHits.set(ip, entry);

    if (entry.count > maxRequestsPerWindow) {
      res.status(429).json({ message: 'Too many requests - try again later' });
      return;
    }

    next();
  } catch (err) {
    next();
  }
});

/* =======================
   Database Connection
======================= */
connectDB().then(() => {
  // Seed default public rooms after DB connection
  seedDefaultRooms();
});

/* =======================
   REST API Routes
======================= */
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);

app.get('/health', (req, res) => {
  res.json({ ok: true, message: 'Server is running' });
});

/* =======================
   Socket.IO Setup
======================= */
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

/* 🔐 Secure Socket.IO with JWT */
io.use(socketAuth);

/* =======================
   Socket Events
======================= */
io.on('connection', (socket) => {
  console.log(`✅ Socket connected: ${socket.user.username} (${socket.userId})`);

  // Mark user online
  socket.user.isOnline = true;
  socket.user.save().catch(err => console.error('Error updating user online status:', err));

  /* Join a room */
  socket.on('join_room', ({ roomId }) => {
    if (!roomId) return;
    socket.join(roomId);
    console.log(`📥 ${socket.user.username} joined room: ${roomId}`);
  });

  /* Leave a room */
  socket.on('leave_room', ({ roomId }) => {
    if (!roomId) return;
    socket.leave(roomId);
    console.log(`📤 ${socket.user.username} left room: ${roomId}`);
  });

  /* Send message */
  socket.on('send_message', async ({ roomId, content }) => {
    try {
      if (!roomId || !content) {
        console.error('Missing roomId or content');
        return;
      }

      // Get room to check if it's public
      const room = await Room.findById(roomId);
      if (!room) {
        console.error('Room not found');
        return;
      }

      // Calculate expiration for public rooms (24 hours from now)
      let expiresAt = null;
      if (room.isPublic) {
        expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
      }

      // Create message
      const message = await Message.create({
        roomId,
        senderId: socket.userId,
        content,
        expiresAt
      });

      // Populate sender info before emitting
      const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'username email');

      // Emit to all users in the room (including sender)
      io.to(roomId).emit('new_message', populatedMessage);

      console.log(`💬 Message sent in room ${roomId} by ${socket.user.username}${room.isPublic ? ' (expires in 24h)' : ''}`);
    } catch (err) {
      console.error('Message send error:', err.message);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  /* Disconnect */
  socket.on('disconnect', async () => {
    try {
      socket.user.isOnline = false;
      socket.user.lastSeen = new Date();
      await socket.user.save();

      console.log(`❌ Socket disconnected: ${socket.user.username}`);
    } catch (err) {
      console.error('Error updating user offline status:', err);
    }
  });
});

/* =======================
   Server Start
======================= */
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO enabled`);
  console.log(`🌐 CORS origin: ${process.env.CORS_ORIGIN || 'http://localhost:4200'}`);
});
