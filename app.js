require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN }));

connectDB();

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/rooms', require('./routes/room.routes'));
app.use('/api/messages', require('./routes/message.routes'));

app.get('/health', (req, res) => res.json({ ok: true }));

const io = new Server(server, {
  cors: { origin: process.env.CORS_ORIGIN }
});

io.on('connection', (socket) => {
  socket.on('join_room', ({ roomId }) => {
    socket.join(roomId);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
