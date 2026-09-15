// SFERA Socket.IO gateway
const { Server } = require('socket.io');
const { verifyToken } = require('../utils/jwt');
const Message = require('../models/Message');

module.exports = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  const onlineUsers = new Map();

  io.use((socket, next) => {
    const authToken = socket.handshake.auth?.token;
    const headerToken = socket.handshake.headers?.authorization?.split(' ')[1];
    const token = authToken || headerToken;

    if (!token) return next(new Error('Authentication error: Token missing'));

    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return next(new Error('Authentication error: Invalid token'));
    }

    socket.userId = String(decoded.userId);
    next();
  });

  io.on('connection', (socket) => {
    console.log(`🟢 Пользователь ${socket.userId} подключился (${socket.id})`);

    socket.join(socket.userId);
    onlineUsers.set(socket.userId, socket.id);
    io.emit('user_status_change', { userId: socket.userId, online: true });

    socket.on('send_message', async (data = {}) => {
      try {
        const { to, text, attachments = [] } = data;
        if (!to || !text) return;

        const message = new Message({
          from: socket.userId,
          to,
          text,
          attachments
        });

        await message.save();

        const populatedMessage = await Message.findById(message._id)
          .populate('from', 'username avatar online')
          .populate('to', 'username avatar online');

        io.to(String(to)).emit('new_message', populatedMessage);
        io.to(socket.userId).emit('new_message', populatedMessage);
      } catch (err) {
        console.error('❌ Socket send_message error:', err);
        socket.emit('message_error', { success: false, error: 'Message delivery failed' });
      }
    });

    socket.on('call_user', (data = {}) => {
      const recipient = onlineUsers.get(String(data.userToCall));
      if (recipient) {
        io.to(recipient).emit('incoming_call', {
          signal: data.signalData,
          from: socket.userId,
          isVideo: Boolean(data.isVideo)
        });
      }
    });

    socket.on('answer_call', (data = {}) => {
      const caller = onlineUsers.get(String(data.to));
      if (caller) io.to(caller).emit('call_accepted', data.signal);
    });

    socket.on('ice_candidate', (data = {}) => {
      const recipient = onlineUsers.get(String(data.to));
      if (recipient) {
        io.to(recipient).emit('ice_candidate', {
          candidate: data.candidate,
          from: socket.userId
        });
      }
    });

    socket.on('end_call', (data = {}) => {
      const recipient = onlineUsers.get(String(data.to));
      if (recipient) io.to(recipient).emit('call_ended');
    });

    socket.on('disconnect', () => {
      if (onlineUsers.get(socket.userId) === socket.id) {
        onlineUsers.delete(socket.userId);
        io.emit('user_status_change', { userId: socket.userId, online: false });
      }
      console.log(`🔴 Пользователь ${socket.userId} отключился (${socket.id})`);
    });
  });

  return io;
};
