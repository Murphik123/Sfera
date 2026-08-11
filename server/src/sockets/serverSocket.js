const { Server } = require('socket.io');

function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
  });

  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    // Регистрация пользователя
    socket.on('register_user', (userId) => {
      if (!userId) return;
      socket.userId = String(userId);
      onlineUsers.set(socket.userId, socket.id);
      io.emit('user_status_change', { userId: socket.userId, online: true });
    });

    // Передача сообщений
    socket.on('send_message', (data) => {
      const recipientSocketId = onlineUsers.get(String(data.recipientId));
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receive_message', {
          senderId: socket.userId,
          ...data
        });
      }
    });

    // WebRTC: Инициация звонка
    socket.on('call_user', (data) => {
      const recipientSocketId = onlineUsers.get(String(data.userToCall));
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('incoming_call', {
          signal: data.signalData,
          from: socket.userId,
          isVideo: data.isVideo
        });
      }
    });

    // WebRTC: Ответ на звонок
    socket.on('answer_call', (data) => {
      const callerSocketId = onlineUsers.get(String(data.to));
      if (callerSocketId) {
        io.to(callerSocketId).emit('call_accepted', data.signal);
      }
    });

    // WebRTC: Обмен ICE-кандидатами
    socket.on('ice_candidate', (data) => {
      const recipientSocketId = onlineUsers.get(String(data.to));
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('ice_candidate', {
          candidate: data.candidate,
          from: socket.userId
        });
      }
    });

    // WebRTC: Завершение звонка
    socket.on('end_call', (data) => {
      const recipientSocketId = onlineUsers.get(String(data.to));
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('call_ended');
      }
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
