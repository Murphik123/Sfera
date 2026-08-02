// src/sockets/index.js
const { Server } = require('socket.io');

module.exports = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Хранилище пользователей
  const users = new Map();

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    // Здесь можно декодировать JWT и получить userId
    // Для примера сохраняем заглушку
    socket.userId = 'testuser';
    next();
  });

  io.on('connection', (socket) => {
    console.log(`🟢 Пользователь ${socket.userId} подключился (${socket.id})`);
    users.set(socket.userId, socket.id);

    socket.on('send_message', (data) => {
      console.log(`📩 Сообщение от ${socket.userId}:`, data);
      // data: { dialogId, text, from, time }
      // Здесь сохранить в БД (модель Message)
      // Отправляем всем участникам диалога (пока всем)
      io.emit('new_message', {
        ...data,
        from: socket.userId,
      });
    });

    socket.on('disconnect', () => {
      console.log(`🔴 Пользователь ${socket.userId} отключился`);
      users.delete(socket.userId);
    });
  });

  return io;
};
