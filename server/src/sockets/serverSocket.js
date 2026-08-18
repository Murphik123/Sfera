const { Server } = require('socket.io');

function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  const onlineUsers = new Map();

  io.engine.on('connection_error', (err) => {
    console.error('❌ Ошибка установки WebSocket-соединения:', err.code, err.message);
  });

  io.on('connection', (socket) => {
    socket.on('error', (err) => {
      console.error(`❌ Ошибка сокета ${socket.id}:`, err.stack || err);
    });

    // Отказ обработки события — раньше такие случаи (нет получателя,
    // абонент оффлайн, нет регистрации) завершались тихим return.
    const reject = (event, reason, ack) => {
      console.warn(`⚠️ Socket ${event} отклонён (socket ${socket.id}, user ${socket.userId || '—'}): ${reason}`);
      const payload = { ok: false, event, message: reason };
      if (typeof ack === 'function') ack(payload);
      socket.emit('socket_error', payload);
    };

    // Регистрация пользователя
    socket.on('register_user', (userId, ack) => {
      if (!userId) {
        return reject('register_user', 'Не указан userId', ack);
      }
      socket.userId = String(userId);
      onlineUsers.set(socket.userId, socket.id);
      io.emit('user_status_change', { userId: socket.userId, online: true });
      if (typeof ack === 'function') ack({ ok: true, userId: socket.userId });
    });

    // Найти сокет получателя или сообщить отправителю о причине недоставки.
    const resolveRecipient = (event, targetId, ack) => {
      if (!targetId) {
        reject(event, 'Не указан получатель', ack);
        return null;
      }

      const recipientSocketId = onlineUsers.get(String(targetId));
      if (!recipientSocketId) {
        reject(event, 'Получатель не в сети', ack);
        return null;
      }

      return recipientSocketId;
    };

    // Передача сообщений
    socket.on('send_message', (data, ack) => {
      const recipientSocketId = resolveRecipient('send_message', data && data.recipientId, ack);
      if (!recipientSocketId) return;

      io.to(recipientSocketId).emit('receive_message', {
        senderId: socket.userId,
        ...data
      });
      if (typeof ack === 'function') ack({ ok: true });
    });

    // WebRTC: Инициация звонка
    socket.on('call_user', (data, ack) => {
      const recipientSocketId = resolveRecipient('call_user', data && data.userToCall, ack);
      if (!recipientSocketId) return;

      io.to(recipientSocketId).emit('incoming_call', {
        signal: data.signalData,
        from: socket.userId,
        isVideo: data.isVideo
      });
      if (typeof ack === 'function') ack({ ok: true });
    });

    // WebRTC: Ответ на звонок
    socket.on('answer_call', (data, ack) => {
      const callerSocketId = resolveRecipient('answer_call', data && data.to, ack);
      if (!callerSocketId) return;

      io.to(callerSocketId).emit('call_accepted', data.signal);
      if (typeof ack === 'function') ack({ ok: true });
    });

    // WebRTC: Обмен ICE-кандидатами
    socket.on('ice_candidate', (data, ack) => {
      const recipientSocketId = resolveRecipient('ice_candidate', data && data.to, ack);
      if (!recipientSocketId) return;

      io.to(recipientSocketId).emit('ice_candidate', {
        candidate: data.candidate,
        from: socket.userId
      });
      if (typeof ack === 'function') ack({ ok: true });
    });

    // WebRTC: Завершение звонка
    socket.on('end_call', (data, ack) => {
      const recipientSocketId = resolveRecipient('end_call', data && data.to, ack);
      if (!recipientSocketId) return;

      io.to(recipientSocketId).emit('call_ended');
      if (typeof ack === 'function') ack({ ok: true });
    });

    // Отключение пользователя
    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit('user_status_change', { userId: socket.userId, online: false });
      }
    });
  });

  return io;
}

module.exports = initSocket;
