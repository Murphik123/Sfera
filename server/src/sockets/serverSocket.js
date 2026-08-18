const { Server } = require('socket.io');
const { createUserRegistry, registerRealtimeHandlers } = require('../utils/realtime');

function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  const registry = createUserRegistry(io);

  io.on('connection', (socket) => {
    registerRealtimeHandlers(socket, registry);
  });

  return io;
}

module.exports = initSocket;
