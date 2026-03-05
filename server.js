const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public')); // serve HTML/JS

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html'); // display device page
});

app.get('/join', (req, res) => {
  res.sendFile(__dirname + '/public/join.html'); // phone page
});

const rooms = new Map(); // uuid → { sockets: Set, data: null, timeout }

io.on('connection', (socket) => {
  const uuid = socket.handshake.query.uuid;

  if (!uuid || !/^[0-9a-f-]{36}$/i.test(uuid)) {
    socket.disconnect();
    return;
  }

  if (!rooms.has(uuid)) {
    rooms.set(uuid, { sockets: new Set(), timeout: null });
  }

  const room = rooms.get(uuid);
  room.sockets.add(socket.id);

  // Reset inactivity timeout (e.g. 15 min)
  if (room.timeout) clearTimeout(room.timeout);
  room.timeout = setTimeout(() => rooms.delete(uuid), 15 * 60 * 1000);

  socket.join(uuid);

  // If already has data, send it immediately (in case reconnect)
  if (room.data) {
    socket.emit('message', room.data);
  }

  socket.on('send', (text) => {
    if (text && typeof text === 'string' && text.length < 10000) { // basic limit
      room.data = text;
      io.to(uuid).emit('message', text);
    }
  });

  socket.on('disconnect', () => {
    room.sockets.delete(socket.id);
    if (room.sockets.size === 0) {
      // optional: keep data briefly or delete room
    }
  });
});

server.listen(3000, () => console.log('Listening on port 3000'));