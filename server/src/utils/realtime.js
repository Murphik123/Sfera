/**
 * Общие помощники Socket.io: адресная доставка событий и реестр онлайн-пользователей.
 */

/**
 * Отправляет событие в личные комнаты пользователей (комната = userId).
 */
const emitToUsers = (io, userIds = [], event, payload) => {
    if (!io) return;
    userIds
        .filter(Boolean)
        .map((id) => id.toString())
        .forEach((room) => io.to(room).emit(event, payload));
};

/**
 * Реестр «userId -> socketId» с адресной отправкой событий.
 * Используется там, где сокеты не подписаны на личные комнаты.
 */
const createUserRegistry = (io) => {
    const sockets = new Map();

    const add = (userId, socketId) => {
        const key = String(userId);
        sockets.set(key, socketId);
        io.emit('user_status_change', { userId: key, online: true });
        return key;
    };

    const removeByUserId = (userId) => {
        if (!userId) return;
        const key = String(userId);
        sockets.delete(key);
        io.emit('user_status_change', { userId: key, online: false });
    };

    const emitTo = (userId, event, payload) => {
        const socketId = sockets.get(String(userId));
        if (!socketId) return false;
        io.to(socketId).emit(event, payload);
        return true;
    };

    return { sockets, add, removeByUserId, emitTo };
};

/**
 * Регистрирует единый набор обработчиков чата и WebRTC-сигналинга для сокета.
 *
 * @param {import('socket.io').Socket} socket
 * @param {ReturnType<createUserRegistry>} registry
 */
const registerRealtimeHandlers = (socket, registry) => {
    socket.on('register_user', (userId) => {
        if (!userId) return;
        socket.userId = registry.add(userId, socket.id);
    });

    socket.on('send_message', (data = {}) => {
        registry.emitTo(data.recipientId, 'receive_message', {
            senderId: socket.userId,
            ...data
        });
    });

    socket.on('call_user', (data = {}) => {
        registry.emitTo(data.userToCall, 'incoming_call', {
            signal: data.signalData,
            from: data.from || socket.userId,
            isVideo: data.isVideo
        });
    });

    socket.on('answer_call', (data = {}) => {
        registry.emitTo(data.to, 'call_accepted', data.signal);
    });

    socket.on('ice_candidate', (data = {}) => {
        registry.emitTo(data.to, 'ice_candidate', {
            candidate: data.candidate,
            from: socket.userId
        });
    });

    socket.on('end_call', (data = {}) => {
        registry.emitTo(data.to, 'call_ended');
    });

    socket.on('disconnect', () => {
        registry.removeByUserId(socket.userId);
    });
};

module.exports = { emitToUsers, createUserRegistry, registerRealtimeHandlers };
