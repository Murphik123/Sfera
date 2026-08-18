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

  io.engine.on('connection_error', (err) => {
    console.error('❌ Ошибка установки WebSocket-соединения:', err.code, err.message);
  });

  // Авторизация сокет-соединения через JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      // Неожиданный сбой верификации не должен превращаться в обычный «invalid token».
      console.error('❌ Ошибка проверки токена в WebSocket-рукопожатии:', error.stack || error);
      return next(new Error('Authentication error: Token verification failed'));
    }

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

    socket.on('error', (err) => {
      console.error(`❌ Ошибка сокета ${socket.id} (user ${socket.userId}):`, err.stack || err);
    });

    // Обработка отправки сообщения через сокет
    socket.on('send_message', async (data, ack) => {
      // Ответ отправителю: раньше любая ошибка оставалась только в логах сервера,
      // а клиент считал сообщение доставленным.
      const fail = (message, error) => {
        if (error) {
          console.error(`❌ Socket send_message error (user ${socket.userId}):`, error.stack || error);
        } else {
          console.warn(`⚠️ Socket send_message отклонён (user ${socket.userId}): ${message}`);
        }

        const payload = { ok: false, message };
        if (typeof ack === 'function') ack(payload);
        socket.emit('message_error', payload);
      };

      try {
        const { to, text, attachments } = data || {};

        if (!to || !text) {
          return fail('Укажите получателя и текст сообщения');
        }

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

        if (typeof ack === 'function') ack({ ok: true, message: populatedMessage });
      } catch (err) {
        fail('Не удалось отправить сообщение', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔴 Пользователь ${socket.userId} отключился от WebSocket`);
    });
  });

  return io;
};
