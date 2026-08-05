/* ==========================================================================
   SFERA PLATFORM — MAIN SERVER (Node.js + Express + Socket.io + MongoDB + Redis)
   ========================================================================== */

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Раздача статики фронтенда (где лежит script.js, index.html и т.д.)
app.use(express.static(path.join(__dirname, 'public')));

// Автоматическое подключение маршрутов REST API
const routesPath = path.join(__dirname, 'src', 'routes');
if (fs.existsSync(routesPath)) {
    console.log(`📁 Найдена папка маршрутов (routes): ${routesPath}`);
    fs.readdirSync(routesPath).forEach(file => {
        if (file.endsWith('.js')) {
            const routeName = file.replace(/Routes\.js$|\.js$/, '');
            let prefix = `/api/${routeName}`;
            if (file === 'paymentRoutes.js') prefix = '/api/tmpay';
            
            const routeModule = require(path.join(routesPath, file));
            app.use(prefix, routeModule);
            console.log(`✅ Маршрут подключен: ${prefix} -> ${file}`);
        }
    });
}

// --- WebSocket & WebRTC Signaling Logic ---
const activeUsers = new Map(); // userId -> socketId

io.on('connection', (socket) => {
    socket.on('register_user', (userId) => {
        activeUsers.set(userId, socket.id);
        io.emit('user_status_change', { userId, online: true });
    });

    // Чат сообщения
    socket.on('send_message', (data) => {
        const recipientSocketId = activeUsers.get(data.recipientId);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('receive_message', data);
        }
    });

    // WebRTC Сигналинг
    socket.on('call_user', (data) => {
        const recipientSocketId = activeUsers.get(data.userToCall);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('incoming_call', {
                signal: data.signalData,
                from: data.from,
                isVideo: data.isVideo
            });
        }
    });

    socket.on('answer_call', (data) => {
        const callerSocketId = activeUsers.get(data.to);
        if (callerSocketId) {
            io.to(callerSocketId).emit('call_accepted', data.signal);
        }
    });

    socket.on('ice_candidate', (data) => {
        const recipientSocketId = activeUsers.get(data.to);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('ice_candidate', { candidate: data.candidate });
        }
    });

    socket.on('end_call', (data) => {
        const recipientSocketId = activeUsers.get(data.to);
        if (recipientSocketId) {
            io.to(recipientSocketId).emit('call_ended');
        }
    });

    socket.on('disconnect', () => {
        for (let [userId, socketId] of activeUsers.entries()) {
            if (socketId === socket.id) {
                activeUsers.delete(userId);
                io.emit('user_status_change', { userId, online: false });
                break;
            }
        }
    });
});

// Фолбэк для SPA / Фронтенда
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Front-end main file not found.');
    }
});

// Запуск сервера на порту от Render
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    console.log(`🔌 WebSocket готов`);
});
