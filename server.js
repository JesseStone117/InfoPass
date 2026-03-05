const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/join', (req, res) => {
  res.sendFile(__dirname + '/public/join.html');
});

const rooms = new Map(); // uuid → { sockets: Set, timeout }

io.on('connection', (socket) => {
  const uuid = socket.handshake.query.uuid;

  if (!uuid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
    socket.disconnect();
    return;
  }

  if (!rooms.has(uuid)) {
    rooms.set(uuid, { sockets: new Set(), timeout: null });
  }

  const room = rooms.get(uuid);
  room.sockets.add(socket.id);

  // Inactivity timeout: 20 minutes
  if (room.timeout) clearTimeout(room.timeout);
  room.timeout = setTimeout(() => rooms.delete(uuid), 20 * 60 * 1000);

  socket.join(uuid);

  socket.on('send', (text) => {
    if (typeof text === 'string' && text.trim().length > 0 && text.length < 8000) {
      io.to(uuid).emit('message', text.trim());
    }
  });

  socket.on('disconnect', () => {
    room.sockets.delete(socket.id);
    if (room.sockets.size === 0) {
      clearTimeout(room.timeout);
      rooms.delete(uuid);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});