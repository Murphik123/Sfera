// sockets/index.js
const { Server } = require('socket.io');

module.exports = (server, app) => {
  const io = new Server(server, {
    cors: {
      origin: '*', // На продакшене замените на ваш домен
      methods: ['GET', 'POST'],
    },
  });

  // Хранилище активных пользователей
  const users = {};

  io.on('connection', (socket) => {
    console.log('🟢 Новое подключение:', socket.id);

    // Получаем токен и ID пользователя из auth
    const token = socket.handshake.auth.token;
    if (!token) {
      socket.disconnect();
      return;
    }

    // Здесь вы должны декодировать токен и получить userId
    // Для примера используем заглушку
    const userId = socket.handshake.query.userId || 'unknown';
    users[userId] = socket.id;
    console.log(`👤 Пользователь ${userId} онлайн`);

    // Отправляем всем, что пользователь онлайн
    io.emit('user_online', { userId });

    // Обработка отправки сообщения
    socket.on('send_message', (data) => {
      console.log('📩 Получено сообщение:', data);
      // data: { dialogId, text, from, time }

      // Сохраняем сообщение в БД (ваша логика)

      // Отправляем сообщение всем участникам диалога
      // Для простоты отправляем обратно отправителю и в диалог
      // В реальном проекте нужно найти всех участников диалога и отправить им
      io.emit('new_message', data);
    });

    socket.on('disconnect', () => {
      console.log('🔴 Отключение:', socket.id);
      delete users[userId];
      io.emit('user_offline', { userId });
    });
  });

  return io;
};
