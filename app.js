require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');

// Routes
const authRoutes = require('./routes/auth.routes');
const roomRoutes = require('./routes/room.routes');
const messageRoutes = require('./routes/message.routes');

// Socket auth middleware
const socketAuth = require('./middleware/socketAuth');

// Models (used inside socket events)
const Message = require('./models/message.model');

const app = express();
const server = http.createServer(app);

/* =======================
   Express Middlewares
======================= */
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN }));

/* =======================
   Database Connection
======================= */
connectDB();

/* =======================
   REST API Routes
======================= */
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

/* =======================
   Socket.IO Setup
======================= */
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST']
  }
});

/* 🔐 Secure Socket.IO with JWT */
io.use(socketAuth);

/* =======================
   Socket Events
======================= */
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.user.username}`);

  // Mark user online
  socket.user.isOnline = true;
  socket.user.save();

  /* Join a room */
  socket.on('join_room', ({ roomId }) => {
    socket.join(roomId);
  });

  /* Leave a room */
  socket.on('leave_room', ({ roomId }) => {
    socket.leave(roomId);
  });

  /* Send message */
  socket.on('send_message', async ({ roomId, content }) => {
    try {
      if (!roomId || !content) return;

      const message = await Message.create({
        roomId,
        senderId: socket.userId,
        content
      });

      io.to(roomId).emit('new_message', message);
    } catch (err) {
      console.error('Message send error:', err.message);
    }
  });

  /* Disconnect */
  socket.on('disconnect', async () => {
    socket.user.isOnline = false;
    socket.user.lastSeen = new Date();
    await socket.user.save();

    console.log(`Socket disconnected: ${socket.user.username}`);
  });
});

/* =======================
   Server Start
======================= */
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
