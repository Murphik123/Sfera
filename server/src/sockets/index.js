// src/sockets/index.js
const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const Message = require('../models/Message');

module.exports = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Авторизация сокет-соединения через JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return next(new Error('Authentication error: Invalid token'));
    }

    socket.userId = decoded.userId.toString();
    next();
  });

  io.on('connection', (socket) => {
    console.log(`🟢 Пользователь ${socket.userId} подключился к WebSocket (${socket.id})`);

    // Подключаем пользователя к собственной личной комнате (для адресных уведомлений)
    socket.join(socket.userId);

    // Обработка отправки сообщения через сокет
    socket.on('send_message', async (data) => {
      try {
        const { to, text, attachments } = data;

        if (!to || !text) return;

        const message = new Message({
          from: socket.userId,
          to,
          text,
          attachments: attachments || []
        });

        await message.save();

        const populatedMessage = await Message.findById(message._id)
          .populate('from', 'username avatar online')
          .populate('to', 'username avatar online');

        // Отправляем только адресату и самому себе
        io.to(to.toString()).emit('new_message', populatedMessage);
        io.to(socket.userId).emit('new_message', populatedMessage);

      } catch (err) {
        console.error('❌ Socket send_message error:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔴 Пользователь ${socket.userId} отключился от WebSocket`);
    });
  });

  return io;
};
