/* ==========================================================================
   SFERA PLATFORM — MAIN SERVER (Node.js + Express + Socket.io)
   ========================================================================== */

require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET не задан. Задайте его в окружении перед запуском сервера.');
    process.exit(1);
}

const app = require('./src/app');
const connectDB = require('./src/config/db');
const { verifyToken } = require('./src/utils/jwt');

const server = http.createServer(app);

const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins.length > 0 ? allowedOrigins : false,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

app.set('io', io);

// --- WebSocket & WebRTC Signaling ---
// Соединение допускается только с валидным JWT; userId берётся из токена,
// а не из данных клиента, поэтому подменить личность в сигналинге нельзя.
io.use((socket, next) => {
    const token = socket.handshake.auth?.token
        || socket.handshake.headers?.authorization?.replace(/^Bearer /, '');

    if (!token) {
        return next(new Error('Authentication error: token missing'));
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
        return next(new Error('Authentication error: invalid token'));
    }

    socket.userId = String(decoded.userId);
    next();
});

const activeUsers = new Map(); // userId -> Set<socketId>

const addSocket = (userId, socketId) => {
    if (!activeUsers.has(userId)) activeUsers.set(userId, new Set());
    activeUsers.get(userId).add(socketId);
};

const socketIdsFor = (userId) => Array.from(activeUsers.get(String(userId)) || []);

io.on('connection', (socket) => {
    addSocket(socket.userId, socket.id);
    socket.join(socket.userId);
    io.emit('user_status_change', { userId: socket.userId, online: true });

    const relay = (event, targetId, payload) => {
        socketIdsFor(targetId).forEach((socketId) => io.to(socketId).emit(event, payload));
    };

    socket.on('send_message', (data = {}) => {
        relay('receive_message', data.recipientId || data.to, { ...data, senderId: socket.userId });
    });

    socket.on('call_user', (data = {}) => {
        relay('incoming_call', data.userToCall, {
            signal: data.signalData,
            from: socket.userId,
            isVideo: data.isVideo
        });
    });

    socket.on('answer_call', (data = {}) => {
        relay('call_accepted', data.to, data.signal);
    });

    socket.on('ice_candidate', (data = {}) => {
        relay('ice_candidate', data.to, { candidate: data.candidate, from: socket.userId });
    });

    socket.on('end_call', (data = {}) => {
        relay('call_ended', data.to);
    });

    socket.on('disconnect', () => {
        const sockets = activeUsers.get(socket.userId);
        if (!sockets) return;

        sockets.delete(socket.id);
        if (sockets.size === 0) {
            activeUsers.delete(socket.userId);
            io.emit('user_status_change', { userId: socket.userId, online: false });
        }
    });
});

const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

connectDB().then(() => {
    server.listen(PORT, HOST, () => {
        console.log(`🚀 Server running on http://${HOST}:${PORT}`);
        console.log(`🔌 WebSocket готов`);
    });
});
