// serverSocket.js
const { Server } = require('socket.io');

function initSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Хранилище подключенных пользователей: userId -> socketId
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    // 1. Авторизация сокета
    socket.on('register_user', (userId) => {
      if (!userId) return;
      socket.userId = String(userId);
      onlineUsers.set(socket.userId, socket.id);
      
      // Оповещаем всех о смене статуса на онлайн
      io.emit('user_status_change', { userId: socket.userId, online: true });
    });

    // 2. Отправка сообщений в реальном времени
    socket.on('send_message', (data) => {
      const { recipientId, text, file, time, tempId } = data;
      const recipientSocketId = onlineUsers.get(String(recipientId));

      const messagePayload = {
        senderId: socket.userId,
        recipientId,
        text,
        file,
        time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tempId
      };

      // Если получатель в сети — пересылаем напрямую
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receive_message', messagePayload);
      }
    });

    // 3. Индикатор набора текста
    socket.on('typing', (data) => {
      const recipientSocketId = onlineUsers.get(String(data.recipientId));
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('user_typing', { senderId: socket.userId });
      }
    });

    // 4. Signaling для WebRTC Звонков (Аудио / Видео)
    socket.on('call_user', (data) => {
      const recipientSocketId = onlineUsers.get(String(data.userToCall));
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('incoming_call', {
          signal: data.signalData,
          from: socket.userId,
          isVideo: data.isVideo
        });
      } else {
        socket.emit('call_failed', { reason: 'Пользователь не в сети' });
      }
    });

    socket.on('answer_call', (data) => {
      const callerSocketId = onlineUsers.get(String(data.to));
      if (callerSocketId) {
        io.to(callerSocketId).emit('call_accepted', data.signal);
      }
    });

    socket.on('reject_call', (data) => {
      const callerSocketId = onlineUsers.get(String(data.to));
      if (callerSocketId) {
        io.to(callerSocketId).emit('call_rejected');
      }
    });

    socket.on('end_call', (data) => {
      const peerSocketId = onlineUsers.get(String(data.to));
      if (peerSocketId) {
        io.to(peerSocketId).emit('call_ended');
      }
    });

    // 5. Отключение пользователя
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
