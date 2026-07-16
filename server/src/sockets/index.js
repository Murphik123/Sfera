const Message = require('../models/Message');
const redisClient = require('../config/redis');

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 New client connected');

    // Присоединение к комнате пользователя
    socket.on('join', (userId) => {
      socket.join(`user_${userId}`);
      // Добавляем пользователя в онлайн (Redis)
      redisClient.sadd('online_users', userId);
      // Можно оповестить всех о статусе
    });

    // Отправка сообщения
    socket.on('sendMessage', async (data) => {
      try {
        const { from, to, text, attachments } = data;
        const message = new Message({ from, to, text, attachments });
        await message.save();

        // Отправляем получателю (если он в сети)
        io.to(`user_${to}`).emit('newMessage', message);
        // Отправляем отправителю подтверждение
        socket.emit('messageSent', message);
      } catch (error) {
        console.error('❌ Error sending message:', error);
      }
    });

    // Отключение
    socket.on('disconnect', async () => {
      console.log('🔌 Client disconnected');
      // Можно удалить пользователя из онлайн, если известен userId
    });
  });
};
